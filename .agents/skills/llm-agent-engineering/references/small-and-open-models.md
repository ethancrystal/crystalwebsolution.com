# Small and Open Models

The doctrine in `SKILL.md` is model-agnostic. What changes on smaller and
open-weight models — Qwen on Ollama locally; MiniMax and NVIDIA Nemotron on
cloud — is the *tolerances*. The schema shape is identical; the margin for error
is not. Treat this as the modifier you apply on top of `tool-design.md` and
`the-agent-loop.md`.

These models move fast. Verify format specifics against the current vendor docs
and model cards (`sources.md`) before relying on a detail.

## Contents
1. What actually breaks
2. The transport: native vs OpenAI-compatible
3. The hard schema subset
4. Tool-count and prompt discipline
5. Parsing tool calls robustly (the real work)
6. Normalize everything to one record shape
7. Feeding results back
8. Per-model notes

## 1. What actually breaks

- **Instruction-following is weaker.** Vague descriptions and implied
  conventions get ignored. Everything must be explicit.
- **JSON Schema support is partial.** Many runtimes honor only `type`,
  `properties`, `enum`, `required`, `description`, and basic numeric bounds.
  `$ref`/`$defs`, `oneOf`/`anyOf`/`allOf`, and deep nesting are commonly ignored
  or break constrained decoding.
- **Tool count and nesting degrade accuracy.** A long tool list or a deeply
  nested argument object measurably raises wrong-tool and malformed-argument
  rates.
- **Tool calls leak into prose.** Smaller models frequently emit a tool call as
  text — a fenced ```json block or a bare `{...}` — that the runtime never
  surfaces as a structured `tool_call`. If you don't recover these, the agent
  silently stalls.

## 2. The transport: native vs OpenAI-compatible

The tool *schema* you send is the same OpenAI-style object in both cases:
`{"type":"function","function":{"name","description","parameters"}}`. The
*envelope* and the *response shape* differ.

**Ollama native `/api/chat` (local Qwen).** Prefer this over Ollama's
OpenAI-compatible `/v1` for agent work, because `/v1` cannot set `num_ctx`
(context silently caps around the ~4K default) and has had buggy
streaming-with-tools. The native endpoint takes `options.num_ctx`, streams tool
calls, and honors `keep_alive`. Structured calls arrive under
`message.tool_calls`, with `function.arguments` usually already a dict.

**OpenAI-compatible `/v1/chat/completions` (cloud MiniMax / Nemotron).** The
common denominator for hosted open models. Structured calls arrive under
`choices[0].message.tool_calls`, and **`function.arguments` is a JSON *string***
you must `json.loads`. Some reasoning-tuned models also emit thinking tokens
around the call — strip/ignore them before parsing.

Either way, run the inline fallback (below) on the text content, because either
transport can drop a call into prose.

## 3. The hard schema subset

This is not "nicer" — on these models it is the difference between a callable
tool and a dead one. From `tool-design.md`, enforced strictly:

- Flat parameters; nesting depth ≤ 1, and avoid it if you can.
- No `$ref` / `$defs` / `oneOf` / `anyOf` / `allOf`. If you generate from
  Pydantic/Zod, **inline and flatten** — those libraries emit exactly the
  keywords that break here (and `anyOf` for every `Optional`).
- `enum` for every closed value-space. Don't describe options in prose and hope.
- Every parameter described, with an example value in the description.
- `required` limited to genuinely-required params; everything else gets a
  `default`.

Run `scripts/validate_tool_schema.py --target small` to flag violations.

## 4. Tool-count and prompt discipline

- Advertise the smallest tool set that covers the task. Hide rarely-used
  primitives, or expose them as **aliases that resolve for dispatch but are not
  advertised** — fewer choices, higher accuracy.
- In the system prompt, name the tools and *when* to use each, and show one
  concrete tool-call example. Small models imitate examples more reliably than
  they follow descriptions (`system-prompts.md`).

## 5. Parsing tool calls robustly (the real work)

You need three layers: read structured calls if present, recover inline calls
from text if not, and dedup so a non-idempotent tool never fires twice. This
generalizes the pattern proven in production agents (string-aware brace
scanning + name validation + dedup):

```python
import json, re, uuid

def _scan_json_objects(text: str):
    """All top-level brace-balanced JSON object substrings (string-aware)."""
    objs, depth, start, in_str, esc = [], 0, None, False, False
    for i, ch in enumerate(text):
        if in_str:
            if esc: esc = False
            elif ch == "\\": esc = True
            elif ch == '"': in_str = False
            continue
        if ch == '"': in_str = True
        elif ch == "{":
            if depth == 0: start = i
            depth += 1
        elif ch == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and start is not None:
                    objs.append(text[start:i+1]); start = None
    return objs

def extract_inline_tool_calls(content: str, valid_names):
    """Recover tool calls a small model buried in prose. Returns (calls, cleaned_text).
    Only payloads whose name matches a registered tool are accepted, so prose that
    merely mentions JSON does not misfire."""
    if not content:
        return [], content
    candidates = re.findall(r"```(?:json|tool_call|tool)?\s*(\{.*?\})\s*```", content, re.S)
    candidates += _scan_json_objects(content)
    found = []
    for c in candidates:
        try:
            obj = json.loads(c)
        except json.JSONDecodeError:
            continue
        if not isinstance(obj, dict):
            continue
        name = obj.get("name") or obj.get("tool") or (obj.get("function") or {}).get("name")
        args = obj.get("arguments")
        if args is None: args = obj.get("parameters")
        if args is None: args = obj.get("args", {})
        if isinstance(args, str):
            try: args = json.loads(args)
            except json.JSONDecodeError: args = {}
        if name in valid_names:
            found.append({"id": f"inline_{uuid.uuid4().hex[:8]}", "name": name,
                          "arguments": args if isinstance(args, dict) else {}})
    # A fenced object is matched by BOTH patterns; dedup by (name, args) so a
    # non-idempotent tool (commit, send, delete) never fires twice for one intent.
    deduped, seen = [], set()
    for c in found:
        key = (c["name"], json.dumps(c["arguments"], sort_keys=True, default=str))
        if key in seen: continue
        seen.add(key); deduped.append(c)
    cleaned = re.sub(r"```(?:json|tool_call|tool)?\s*\{.*?\}\s*```", "", content, flags=re.S).strip()
    return deduped, cleaned
```

## 6. Normalize everything to one record shape

Whatever the transport, reduce calls to a single record
`{"id", "name", "arguments": dict}` so the rest of the loop is transport-blind:

```python
def normalize_structured(raw_calls):
    """Native Ollama OR OpenAI-compatible tool_calls -> uniform records."""
    out = []
    for tc in raw_calls or []:
        fn = tc.get("function") or {}
        name = fn.get("name") or tc.get("name")
        args = fn.get("arguments", tc.get("arguments", {}))
        if isinstance(args, str):                       # OpenAI-compatible path
            try: args = json.loads(args) if args.strip() else {}
            except json.JSONDecodeError: args = {}
        if not isinstance(args, dict): args = {}
        if name:
            out.append({"id": tc.get("id") or f"call_{uuid.uuid4().hex[:8]}",
                        "name": name, "arguments": args})
    return out

def parse_tool_calls(message, valid_names):
    """Structured calls first; fall back to inline recovery from content."""
    structured = normalize_structured(message.get("tool_calls"))
    if structured:
        return structured, message.get("content") or ""
    return extract_inline_tool_calls(message.get("content") or "", valid_names)
```

## 7. Feeding results back

After dispatch, append each tool's result so the model can continue. Truncate
the observation before it re-enters context (a 12K-char cap is a reasonable
default) — small context windows fill fast. Use the role the transport expects:
Ollama native accepts a `{"role":"tool","content": ...}` message;
OpenAI-compatible expects `{"role":"tool","tool_call_id": id, "content": ...}`.
Match the `tool_call_id` to the call you're answering on the `/v1` path.

## 8. Per-model notes

Treat these as starting points, not gospel — confirm against current model cards.

- **Qwen (e.g. `qwen2.5-coder` and the tool-tuned variants on Ollama).** Strong
  tool calling for its size; trained around a Hermes-style tool format. A
  tool-tuned tag (e.g. a `*-coder-tools` build) calls more reliably than the
  base. Still benefits heavily from flat schemas and enums. Set `num_ctx`
  explicitly via native `/api/chat`.
- **MiniMax (cloud).** Large-context MoE chat models exposing OpenAI-style
  function calling; `arguments` come back as a JSON string — `json.loads` them.
  Verify the exact endpoint/field names in MiniMax's API reference.
- **NVIDIA Nemotron (cloud, via NIM / OpenAI-compatible).** Llama-derived,
  reasoning-tuned variants; expect thinking tokens around the answer — strip
  them before parsing, and keep the inline fallback on. Confirm tool-call format
  in the NIM docs.

The unifying point: build to the **safe intersection** of JSON Schema features
and the **union** of parsing fallbacks. A schema and parser that satisfy this
file will work on the strict frontier models too — the reverse is not true.
