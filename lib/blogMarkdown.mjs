// A deliberately small Markdown subset for blog post bodies.
//
// This parses to a token tree and stops there. It never produces an HTML
// string, because the renderer (components/marketing/PostBody.jsx) turns tokens
// into React elements — which means there is no dangerouslySetInnerHTML in the
// blog path at all, and therefore no way for post content to inject markup.
// That is the whole reason this exists instead of a markdown-to-HTML library:
// the library would hand back a string that something has to trust.
//
// Supported: # / ## / ### headings, paragraphs, - / 1. lists (including
// [ ] / [x] task items), pipe tables, > blockquotes, ``` fenced code, --- rules,
// and inline **bold**, *italic*, `code`, [links], ![images](https://...).
// Anything else is treated as literal text rather than silently dropped.
//
// There is no H1 output: the post title is the page's only <h1>, so author
// headings start at <h2> and the document outline stays valid. A leading
// `# Title` that restates the post title is dropped (10 of 14 live posts opened
// with one, and before 2026-09-26 it rendered as a literal "# ..." paragraph);
// any other `#` heading is demoted to <h2>.

import { toSitePath } from './seo.mjs';

const FENCE = /^```([a-zA-Z0-9+-]*)\s*$/;
const HEADING = /^(#{1,3})\s+(.*)$/;
const UNORDERED_ITEM = /^[-*+]\s+(.*)$/;
const ORDERED_ITEM = /^\d+\.\s+(.*)$/;
const BLOCKQUOTE = /^>\s?(.*)$/;
const RULE = /^(-{3,}|\*{3,}|_{3,})$/;
const TASK_ITEM = /^\[([xX ])\]\s+(.*)$/;

// A site path is "/" followed by anything except a second "/" or a backslash:
// browsers resolve `//host/x` and `/\host/x` to another origin.
const SITE_PATH = /^\/(?![/\\])/;

// toSitePath turns an owned-host URL into a path. Re-check what it returns:
// `https://<own host>//evil.test/x` would otherwise come back as `//evil.test/x`.
function ownedOrAbsolute(url) {
  const rewritten = toSitePath(url);
  if (rewritten.startsWith('/') && !SITE_PATH.test(rewritten)) return null;
  return rewritten;
}

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
  if (SITE_PATH.test(href) || href.startsWith('#')) return href;
  if (/^https?:\/\/[^\s]+$/i.test(href)) return ownedOrAbsolute(href);
  if (/^mailto:[^\s]+@[^\s]+$/i.test(href)) return href;
  return null;
}

/**
 * Image sources are stricter than link targets: https or site-relative only.
 * No http (mixed content), no protocol-relative `//host`, and no data:/blob:
 * or other schemes — an image URL is fetched without a click, so anything that
 * is not a plain web address is refused.
 */
export function safeImageSrc(raw) {
  if (typeof raw !== 'string') return null;
  const src = raw.trim();
  if (!src) return null;
  if (SITE_PATH.test(src)) return src;
  if (/^https:\/\/[^\s]+$/i.test(src)) return ownedOrAbsolute(src);
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

  // Ordered by precedence: code first, then images (before links, or the `!`
  // of `![alt](src)` is left behind as text), then links, then strong before
  // em (so `**x**` is not read as an em containing a stray asterisk).
  const matchers = [
    { type: 'code', pattern: /^`([^`]+)`/ },
    { type: 'image', pattern: /^!\[([^\]]*)\]\(([^)\s]+)\)/ },
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

      if (type === 'image') {
        const src = safeImageSrc(match[2]);
        // A refused source degrades to its alt text, like a refused link.
        if (!src) {
          buffer += match[1];
          rest = rest.slice(match[0].length);
          matched = true;
          break;
        }
        flush();
        tokens.push({ type: 'image', src, alt: match[1].trim() });
      } else if (type === 'link') {
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

// Loose comparison for "does this heading just restate the title": ignores
// case, whitespace, inline markers and curly vs straight quotes.
function headingKey(text) {
  return String(text)
    .normalize('NFKC')
    .replace(/[*_`]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// True when a heading is the title, or the title minus a trailing qualifier
// ("How Much Does a Small Business Website Cost?" vs the same title plus
// "(2026 Planning Guide)"). The prefix must end on a word boundary, and the
// half-length floor keeps a short generic opening heading such as "# How"
// from being mistaken for the title.
function restatesTitle(heading, title) {
  const headingText = headingKey(heading);
  const titleText = headingKey(title);
  if (!headingText) return false;
  if (headingText === titleText) return true;
  return (
    titleText.startsWith(headingText) &&
    !/[\p{L}\p{N}]/u.test(titleText[headingText.length]) &&
    headingText.length * 2 >= titleText.length
  );
}

/** Splits one pipe-table row into trimmed cell strings, ignoring outer pipes. */
function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

/**
 * A delimiter row like `| --- | :---: |`: at least one pipe (so a plain `---`
 * rule line never reads as a table) and every cell dashes with an optional
 * alignment colon.
 */
function isTableDelimiter(line) {
  const trimmed = typeof line === 'string' ? line.trim() : '';
  if (!trimmed.includes('|')) return false;
  const cells = splitTableRow(trimmed);
  return cells.length >= 1 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

/**
 * A table starts at a row followed by a delimiter row. The row and delimiter
 * must agree on cell count — that keeps a stray "|" in prose from turning two
 * paragraphs into a broken one-cell table.
 */
function isTableStart(line, nextLine) {
  if (typeof line !== 'string' || !line.includes('|')) return false;
  if (!isTableDelimiter(nextLine)) return false;
  return splitTableRow(line).length === splitTableRow(nextLine).length;
}

/**
 * Parses a post body into an array of block tokens.
 *
 * `options.title` is the post title the page already renders as its <h1>. When
 * the body opens with `# <the title>`, that line is dropped instead of being
 * shown twice.
 */
export function parseMarkdown(source, options = {}) {
  if (typeof source !== 'string' || !source.trim()) return [];

  const lines = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;
  // Only the first line of the body can be the title restatement, and only
  // once: a second identical `#` heading is content, not a duplicate title.
  let titleChecked = false;

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
      // Drop an optional closing sequence (`# Title #`); "C#" keeps its "#"
      // because the closing run must follow whitespace.
      const text = heading[2].replace(/(^|\s+)#+\s*$/, '').trim();
      const isH1 = heading[1].length === 1;
      const isTitleRestatement =
        isH1 &&
        !titleChecked &&
        blocks.length === 0 &&
        typeof options.title === 'string' &&
        restatesTitle(text, options.title);
      titleChecked = true;
      // An empty heading (`#` alone) would be an empty <h2>; skip it.
      if (!isTitleRestatement && text) {
        blocks.push({
          type: 'heading',
          // The page title owns the only <h1>, so `#` becomes <h2>.
          level: isH1 ? 2 : heading[1].length,
          children: parseInline(text),
        });
      }
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

    if (isTableStart(line, lines[index + 1])) {
      const header = splitTableRow(line).map(parseInline);
      const rows = [];
      index += 2; // consume the header and delimiter rows
      while (
        index < lines.length &&
        lines[index].includes('|') &&
        !FENCE.test(lines[index]) &&
        !HEADING.test(lines[index]) &&
        !BLOCKQUOTE.test(lines[index]) &&
        !RULE.test(lines[index].trim()) &&
        !ORDERED_ITEM.test(lines[index]) &&
        !UNORDERED_ITEM.test(lines[index])
      ) {
        rows.push(splitTableRow(lines[index]).map(parseInline));
        index += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const ordered = ORDERED_ITEM.test(line);
    if (ordered || UNORDERED_ITEM.test(line)) {
      const pattern = ordered ? ORDERED_ITEM : UNORDERED_ITEM;
      const items = [];
      const tasks = [];
      while (index < lines.length && pattern.test(lines[index])) {
        const raw = lines[index].match(pattern)[1].trim();
        const task = raw.match(TASK_ITEM);
        if (task) {
          tasks.push(task[1].toLowerCase() === 'x');
          items.push(parseInline(task[2].trim()));
        } else {
          tasks.push(null);
          items.push(parseInline(raw));
        }
        index += 1;
      }
      // tasks stays null for an ordinary list so the renderer keeps the plain
      // <li> shape; a list mixing task and plain items renders both.
      blocks.push({
        type: 'list',
        ordered,
        items,
        tasks: tasks.some((task) => task !== null) ? tasks : null,
      });
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
      !UNORDERED_ITEM.test(lines[index]) &&
      !isTableStart(lines[index], lines[index + 1])
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

/** Flattens inline tokens to the plain text a schema string or summary needs. */
export function inlineToText(tokens) {
  if (!Array.isArray(tokens)) return '';
  return tokens
    .map((token) => {
      if (token.type === 'text' || token.type === 'code') return token.value ?? '';
      if (Array.isArray(token.children)) return inlineToText(token.children);
      return '';
    })
    .join('');
}

const FAQ_ANSWER_MAX_LENGTH = 1000;

/**
 * Pulls visible Q&A pairs out of a post body for FAQPage structured data.
 *
 * A question is a ## / ### heading ending in "?" and its answer is the
 * paragraph text that follows, up to the next heading. Both already render on
 * the page — the one thing Google requires of FAQPage markup — so this can
 * never describe content the reader cannot see. Headings that are not
 * questions and questions with no paragraph answer are skipped, and an empty
 * result means the page correctly emits no FAQPage schema at all.
 */
export function extractFaqs(source) {
  const blocks = parseMarkdown(source);
  const faqs = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.type !== 'heading') continue;

    const question = inlineToText(block.children).trim();
    if (!question.endsWith('?')) continue;

    const answers = [];
    for (let j = i + 1; j < blocks.length; j += 1) {
      const next = blocks[j];
      if (next.type === 'heading') break;
      if (next.type !== 'paragraph') continue;
      answers.push(inlineToText(next.children).trim());
    }

    let answer = answers.filter(Boolean).join(' ').trim();
    if (!answer) continue;
    if (answer.length > FAQ_ANSWER_MAX_LENGTH) {
      const cut = answer.lastIndexOf(' ', FAQ_ANSWER_MAX_LENGTH);
      answer = (cut > 0 ? answer.slice(0, cut) : answer.slice(0, FAQ_ANSWER_MAX_LENGTH)).trim();
    }
    faqs.push({ question, answer });
  }

  return faqs;
}
