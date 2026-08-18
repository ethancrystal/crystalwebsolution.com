// A deliberately small Markdown subset for blog post bodies.
//
// This parses to a token tree and stops there. It never produces an HTML
// string, because the renderer (components/marketing/PostBody.jsx) turns tokens
// into React elements — which means there is no dangerouslySetInnerHTML in the
// blog path at all, and therefore no way for post content to inject markup.
// That is the whole reason this exists instead of a markdown-to-HTML library:
// the library would hand back a string that something has to trust.
//
// Supported: ## / ### headings, paragraphs, - / 1. lists, > blockquotes,
// ``` fenced code, --- rules, and inline **bold**, *italic*, `code`, [links].
// Anything else is treated as literal text rather than silently dropped.
//
// H1 is intentionally absent: the post title is the page's only <h1>, so
// author-supplied headings start at <h2> and the document outline stays valid.

const FENCE = /^```([a-zA-Z0-9+-]*)\s*$/;
const HEADING = /^(#{2,3})\s+(.*)$/;
const UNORDERED_ITEM = /^[-*+]\s+(.*)$/;
const ORDERED_ITEM = /^\d+\.\s+(.*)$/;
const BLOCKQUOTE = /^>\s?(.*)$/;
const RULE = /^(-{3,}|\*{3,}|_{3,})$/;

/**
 * Only http(s) and site-relative targets survive. Everything else — most
 * importantly `javascript:` and `data:` — collapses to null, and the renderer
 * emits plain text for a link with no href rather than an anchor that does
 * something unexpected when clicked.
 */
export function safeHref(raw) {
  if (typeof raw !== 'string') return null;
  const href = raw.trim();
  if (!href) return null;
  if (href.startsWith('/') || href.startsWith('#')) return href;
  if (/^https?:\/\/[^\s]+$/i.test(href)) return href;
  if (/^mailto:[^\s]+@[^\s]+$/i.test(href)) return href;
  return null;
}

/**
 * Splits one line into inline tokens.
 *
 * Scans left to right taking the earliest match among the inline forms, so
 * nesting resolves the way an author expects and an unterminated marker (a lone
 * `*`) stays literal instead of swallowing the rest of the paragraph. Inline
 * code is matched before emphasis so `**` inside backticks is not treated as
 * bold.
 */
export function parseInline(text) {
  if (typeof text !== 'string' || text === '') return [];

  const tokens = [];
  let rest = text;

  // Ordered by precedence: code first, then links, then strong before em (so
  // `**x**` is not read as an em containing a stray asterisk).
  const matchers = [
    { type: 'code', pattern: /^`([^`]+)`/ },
    { type: 'link', pattern: /^\[([^\]]*)\]\(([^)\s]+)\)/ },
    { type: 'strong', pattern: /^\*\*([^*]+)\*\*/ },
    { type: 'strong', pattern: /^__([^_]+)__/ },
    { type: 'em', pattern: /^\*([^*]+)\*/ },
    { type: 'em', pattern: /^_([^_]+)_/ },
  ];

  let buffer = '';

  const flush = () => {
    if (buffer) {
      tokens.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  while (rest) {
    let matched = false;

    for (const { type, pattern } of matchers) {
      const match = rest.match(pattern);
      if (!match) continue;

      if (type === 'link') {
        const href = safeHref(match[2]);
        // A rejected href degrades to the link's own text, so the words stay
        // readable and only the navigation is dropped.
        if (!href) {
          buffer += match[1];
          rest = rest.slice(match[0].length);
          matched = true;
          break;
        }
        flush();
        tokens.push({ type: 'link', href, children: parseInline(match[1]) });
      } else if (type === 'code') {
        flush();
        tokens.push({ type: 'code', value: match[1] });
      } else {
        flush();
        tokens.push({ type, children: parseInline(match[1]) });
      }

      rest = rest.slice(match[0].length);
      matched = true;
      break;
    }

    if (!matched) {
      buffer += rest[0];
      rest = rest.slice(1);
    }
  }

  flush();
  return tokens;
}

/** Parses a post body into an array of block tokens. */
export function parseMarkdown(source) {
  if (typeof source !== 'string' || !source.trim()) return [];

  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Fenced code. An unterminated fence runs to the end of the document
    // rather than throwing, so a half-typed post still renders.
    const fence = line.match(FENCE);
    if (fence) {
      const language = fence[1] || null;
      const content = [];
      index += 1;
      while (index < lines.length && !FENCE.test(lines[index])) {
        content.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: 'code', language, value: content.join('\n') });
      continue;
    }

    if (RULE.test(line.trim())) {
      blocks.push({ type: 'rule' });
      index += 1;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        children: parseInline(heading[2].trim()),
      });
      index += 1;
      continue;
    }

    if (BLOCKQUOTE.test(line)) {
      const quoted = [];
      while (index < lines.length && BLOCKQUOTE.test(lines[index])) {
        quoted.push(lines[index].match(BLOCKQUOTE)[1]);
        index += 1;
      }
      blocks.push({ type: 'blockquote', children: parseInline(quoted.join(' ').trim()) });
      continue;
    }

    const ordered = ORDERED_ITEM.test(line);
    if (ordered || UNORDERED_ITEM.test(line)) {
      const pattern = ordered ? ORDERED_ITEM : UNORDERED_ITEM;
      const items = [];
      while (index < lines.length && pattern.test(lines[index])) {
        items.push(parseInline(lines[index].match(pattern)[1].trim()));
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !FENCE.test(lines[index]) &&
      !HEADING.test(lines[index]) &&
      !BLOCKQUOTE.test(lines[index]) &&
      !RULE.test(lines[index].trim()) &&
      !ORDERED_ITEM.test(lines[index]) &&
      !UNORDERED_ITEM.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    if (paragraph.length) {
      blocks.push({ type: 'paragraph', children: parseInline(paragraph.join(' ')) });
    }
  }

  return blocks;
}
