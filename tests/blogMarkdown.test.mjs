import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractFaqs,
  parseInline,
  parseMarkdown,
  safeHref,
  safeImageSrc,
} from '../lib/blogMarkdown.mjs';
import { safeJsonLd } from '../lib/jsonLd.mjs';

test('parseMarkdown maps each block form to its token type', () => {
  const blocks = parseMarkdown(
    [
      '## Heading two',
      '',
      'A paragraph.',
      '',
      '- one',
      '- two',
      '',
      '1. first',
      '2. second',
      '',
      '> quoted',
      '',
      '---',
      '',
      '```js',
      'const x = 1;',
      '```',
    ].join('\n'),
  );

  const types = blocks.map((block) => block.type);
  assert.deepEqual(types, [
    'heading',
    'paragraph',
    'list',
    'list',
    'blockquote',
    'rule',
    'code',
  ]);

  assert.equal(blocks[0].level, 2);
  assert.equal(blocks[2].ordered, false);
  assert.equal(blocks[3].ordered, true);
  assert.equal(blocks[6].language, 'js');
  assert.equal(blocks[6].value, 'const x = 1;');
});

test('parseMarkdown joins wrapped lines into one paragraph', () => {
  const blocks = parseMarkdown('one line\nsecond line\n\nnew paragraph');

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].children.map((t) => t.value).join(''), 'one line second line');
});

test('parseMarkdown treats an unterminated fence as code to the end', () => {
  const blocks = parseMarkdown('```\nunclosed');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'code');
  assert.equal(blocks[0].value, 'unclosed');
});

test('parseInline resolves the inline forms', () => {
  assert.deepEqual(parseInline('**bold**'), [
    { type: 'strong', children: [{ type: 'text', value: 'bold' }] },
  ]);
  assert.deepEqual(parseInline('*em*'), [
    { type: 'em', children: [{ type: 'text', value: 'em' }] },
  ]);
  assert.deepEqual(parseInline('`code`'), [{ type: 'code', value: 'code' }]);
});

test('parseInline leaves an unterminated marker as literal text', () => {
  const tokens = parseInline('a lone * asterisk');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, 'text');
  assert.equal(tokens[0].value, 'a lone * asterisk');
});

test('parseInline does not read emphasis inside inline code', () => {
  const tokens = parseInline('`**not bold**`');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, 'code');
  assert.equal(tokens[0].value, '**not bold**');
});

test('safeHref admits only navigable schemes', () => {
  assert.equal(safeHref('/work'), '/work');
  assert.equal(safeHref('#section'), '#section');
  assert.equal(safeHref('https://example.test/a'), 'https://example.test/a');
  assert.equal(safeHref('http://example.test/a'), 'http://example.test/a');
  assert.equal(safeHref('mailto:hi@example.test'), 'mailto:hi@example.test');

  assert.equal(safeHref('javascript:alert(1)'), null, 'javascript: must be refused');
  assert.equal(safeHref('JavaScript:alert(1)'), null, 'case-insensitive refusal');
  assert.equal(safeHref('data:text/html,<script>'), null, 'data: must be refused');
  assert.equal(safeHref('vbscript:msgbox'), null, 'vbscript: must be refused');
  assert.equal(safeHref(''), null);
  assert.equal(safeHref(null), null);
});

test('safeHref rewrites owned-host absolute URLs to site-relative paths', async () => {
  const { SITE_ORIGIN, SITE_HOST, toSitePath } = await import('../lib/seo.mjs');

  assert.equal(toSitePath(`${SITE_ORIGIN}/services/web-design`), '/services/web-design');
  assert.equal(toSitePath(`https://${SITE_HOST}/services/branding`), '/services/branding');
  assert.equal(toSitePath('https://cdsportswearusa.com/process'), '/process');
  assert.equal(toSitePath('https://crystalwebsolution.com/contact'), '/contact');
  assert.equal(toSitePath('https://example.test/elsewhere'), 'https://example.test/elsewhere');

  assert.equal(safeHref('https://cdsportswearinc.com/services/web-design'), '/services/web-design');
  assert.equal(safeHref(`${SITE_ORIGIN}/blog/web-development-rfp-guide`), '/blog/web-development-rfp-guide');
});

test('a link with an unsafe href degrades to its own text', () => {
  const tokens = parseInline('[click me](javascript:alert)');

  assert.ok(
    !tokens.some((token) => token.type === 'link'),
    'no link token may be produced for an unsafe href',
  );
  assert.equal(tokens.map((t) => t.value ?? '').join(''), 'click me');
});

test('an unsafe href with nested parentheses still produces no link', () => {
  // The href regex stops at the first ')', so this leaves a literal ')' in the
  // text — cosmetic, and the same thing CommonMark does with unescaped nested
  // parens. What matters is that no anchor is created for a javascript: URL.
  const tokens = parseInline('[click me](javascript:alert(1))');

  assert.ok(
    !tokens.some((token) => token.type === 'link'),
    'no link token may be produced for an unsafe href',
  );
  assert.ok(
    !tokens.some((token) => (token.value ?? '').includes('javascript:')),
    'the scheme must not survive into the rendered text',
  );
});

test('markdown never yields raw HTML — angle brackets stay literal text', () => {
  const blocks = parseMarkdown('An <img src=x onerror=alert(1)> tag.');
  const text = blocks[0].children.map((token) => token.value ?? '').join('');

  assert.equal(blocks[0].type, 'paragraph');
  assert.ok(text.includes('<img'), 'the markup is carried as text, not structure');
  assert.ok(
    blocks[0].children.every((token) => token.type === 'text'),
    'no element token is produced from raw HTML',
  );
});

test('safeJsonLd escapes angle brackets so a title cannot close the script tag', () => {
  const output = safeJsonLd({ headline: 'Bad </script><img src=x> title' });

  assert.ok(!output.includes('</script>'), 'must not contain a literal closing tag');
  assert.ok(!output.includes('<'), 'no unescaped left angle bracket');
  assert.deepEqual(JSON.parse(output), {
    headline: 'Bad </script><img src=x> title',
  }, 'escaping must not change the parsed value');
});

test('safeJsonLd escapes the JavaScript line terminators', () => {
  const raw = `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c`;
  const output = safeJsonLd({ value: raw });

  assert.ok(!output.includes(String.fromCharCode(0x2028)), 'U+2028 escaped');
  assert.ok(!output.includes(String.fromCharCode(0x2029)), 'U+2029 escaped');
  assert.equal(JSON.parse(output).value, raw, 'value round-trips unchanged');
});

// 2026-09-26: 10 of 14 live posts open with `# <title>`, which used to render
// as a literal "# ..." paragraph under the page's real <h1>.
test('a leading # heading that restates the post title is dropped', () => {
  const title = 'Custom React & Next.js Web Development: When It’s Worth Hiring a Studio';
  const blocks = parseMarkdown(
    `# Custom React & Next.js Web Development: When It's Worth Hiring a Studio\n\nFirst paragraph.`,
    { title },
  );

  assert.equal(blocks.length, 1, 'only the paragraph remains');
  assert.equal(blocks[0].type, 'paragraph');
  assert.ok(
    !blocks.some((block) => block.children?.some((token) => (token.value ?? '').startsWith('#'))),
    'no literal "#" text survives',
  );
});

test('a leading # heading that is the title minus a trailing qualifier is dropped too', () => {
  // /blog/how-much-does-a-small-business-website-cost, verbatim.
  const blocks = parseMarkdown('# How Much Does a Small Business Website Cost?\n\nBody.', {
    title: 'How Much Does a Small Business Website Cost? (2026 Planning Guide)',
  });
  assert.deepEqual(blocks.map((block) => block.type), ['paragraph']);

  const shortLead = parseMarkdown('# How\n\nBody.', { title: 'How Much Does a Website Cost?' });
  assert.equal(shortLead[0].type, 'heading', 'a short generic heading is not mistaken for the title');
});

test('any other # heading is demoted to h2, never literal text', () => {
  const differentLead = parseMarkdown('# Something else entirely\n\nBody.', { title: 'The real title' });
  assert.equal(differentLead[0].type, 'heading');
  assert.equal(differentLead[0].level, 2);

  const midBody = parseMarkdown('Intro.\n\n# The real title\n\nMore.', { title: 'The real title' });
  assert.deepEqual(midBody.map((block) => block.type), ['paragraph', 'heading', 'paragraph']);
  assert.equal(midBody[1].level, 2, 'only a leading restatement is dropped');

  const noTitle = parseMarkdown('# Heading');
  assert.equal(noTitle[0].level, 2, 'without a title the heading is kept as h2');
  assert.equal(parseMarkdown('#hashtag')[0].type, 'paragraph', '"#" without a space stays text');
});

// 2026-09-26: 3 live posts carry 6 `![alt](https://images.unsplash.com/...)`
// images, which used to render as "!" plus a text link to the .jpg.
test('Markdown images become image tokens with their alt text', () => {
  const src = 'https://images.unsplash.com/photo-1762831063505-68022b6133a9?fm=jpg&q=80&w=1600&auto=format&fit=crop';
  const blocks = parseMarkdown(`![Calculator, notebook, and glasses on a desk.](${src})`);

  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0].children, [
    { type: 'image', src, alt: 'Calculator, notebook, and glasses on a desk.' },
  ]);
  assert.ok(!blocks[0].children.some((token) => token.type === 'link'), 'no link to the image file');
});

test('image sources are limited to https and site-relative paths', () => {
  assert.equal(safeImageSrc('https://images.unsplash.com/x.jpg'), 'https://images.unsplash.com/x.jpg');
  assert.equal(safeImageSrc('/blog/cover.png'), '/blog/cover.png');
  assert.equal(safeImageSrc('https://www.cdsportswearinc.com/a.png'), '/a.png');
  for (const unsafe of ['http://example.com/x.jpg', '//example.com/x.jpg', 'data:image/png;base64,AAAA', 'javascript:alert(1)', '']) {
    assert.equal(safeImageSrc(unsafe), null, unsafe);
  }

  const refused = parseInline('![alt words](javascript:alert)');
  assert.deepEqual(refused, [{ type: 'text', value: 'alt words' }], 'a refused image degrades to its alt text');
});

// Edge cases from the adversarial review of v1.58.
test('protocol-relative and backslash paths are refused for links and images', () => {
  for (const unsafe of ['//evil.test/p.gif', '/\\evil.test/p.gif', 'https://www.cdsportswearinc.com//evil.test/p.gif']) {
    assert.equal(safeImageSrc(unsafe), null, `image: ${unsafe}`);
    assert.equal(safeHref(unsafe), null, `link: ${unsafe}`);
  }
  assert.equal(safeHref('/services/web-design'), '/services/web-design');
});

test('only the first line can be dropped as the title, and only on a word boundary', () => {
  const twice = parseMarkdown('# My Title\n\n# My Title\n\nBody.', { title: 'My Title' });
  assert.deepEqual(twice.map((block) => block.type), ['heading', 'paragraph'], 'the second copy is content');

  const cut = parseMarkdown('# How Much Does a Small Bus\n\nBody.', {
    title: 'How Much Does a Small Business Website Cost?',
  });
  assert.equal(cut[0].type, 'heading', 'a prefix that ends mid-word is not the title');
});

test('empty headings, closing hashes and a leading BOM', () => {
  assert.deepEqual(parseMarkdown('# \n\nBody.').map((block) => block.type), ['paragraph'], 'no empty <h2>');
  assert.deepEqual(parseMarkdown('## \n\nBody.').map((block) => block.type), ['paragraph']);

  const closed = parseMarkdown('## Section ##');
  assert.deepEqual(closed[0].children, [{ type: 'text', value: 'Section' }]);
  assert.deepEqual(parseMarkdown('## Learn C#')[0].children, [{ type: 'text', value: 'Learn C#' }]);

  const bom = parseMarkdown('﻿# The Title\n\nBody.', { title: 'The Title' });
  assert.deepEqual(bom.map((block) => block.type), ['paragraph']);
});

test('parseMarkdown renders a pipe table as a table block', () => {
  const blocks = parseMarkdown(
    [
      '| Path | Typical band |',
      '| --- | --- |',
      '| Visual refresh | $1k-$3k |',
      '| Full redesign | $5k+ |',
      '',
      'After the table.',
    ].join('\n'),
  );

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, 'table');
  assert.equal(blocks[0].header.length, 2);
  assert.deepEqual(
    blocks[0].header.map((cell) => cell.map((token) => token.value)),
    [['Path'], ['Typical band']],
  );
  assert.equal(blocks[0].rows.length, 2);
  assert.equal(blocks[0].rows[1][0][0].value, 'Full redesign');
  assert.equal(blocks[1].type, 'paragraph');
});

test('parseMarkdown keeps inline formatting inside table cells', () => {
  const blocks = parseMarkdown(
    ['| Item | Note |', '| --- | --- |', '| **Bold** | a `code` |'].join('\n'),
  );

  assert.equal(blocks[0].type, 'table');
  assert.equal(blocks[0].rows[0][0][0].type, 'strong');
  assert.equal(blocks[0].rows[0][1][1].type, 'code');
});

test('a pipe in prose never becomes a table without a delimiter row', () => {
  const blocks = parseMarkdown(['Either | this or that happens.', '', 'Next.'].join('\n'));

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, 'paragraph');
});

test('a rule line is a rule, not a table delimiter', () => {
  const blocks = parseMarkdown(['Heading text', '---'].join('\n'));

  // "Heading text --- " is a paragraph; a standalone --- would be a rule.
  assert.ok(blocks.every((block) => block.type === 'paragraph' || block.type === 'rule'));
  assert.ok(blocks.every((block) => block.type !== 'table'));
});

test('parseMarkdown flags task list items and keeps plain items null', () => {
  const blocks = parseMarkdown(['- [ ] todo', '- [x] done', '- plain'].join('\n'));

  assert.equal(blocks[0].type, 'list');
  assert.deepEqual(blocks[0].tasks, [false, true, null]);
});

test('an ordinary list carries no tasks field', () => {
  const blocks = parseMarkdown(['- one', '- two'].join('\n'));

  assert.equal(blocks[0].type, 'list');
  assert.equal(blocks[0].tasks, null);
});

test('extractFaqs collects question headings with paragraph answers', () => {
  const faqs = extractFaqs(
    [
      '## Intro',
      '',
      'Body text.',
      '',
      '### How long does a redesign take?',
      '',
      'Most projects run four to eight weeks.',
      '',
      '### Not a question',
      '',
      'No question mark, so not an FAQ.',
      '',
      '### Empty question?',
      '',
      '> only a quote, no paragraph',
    ].join('\n'),
  );

  assert.deepEqual(faqs, [
    { question: 'How long does a redesign take?', answer: 'Most projects run four to eight weeks.' },
  ]);
});

test('extractFaqs returns an empty list for a body without Q&A', () => {
  assert.deepEqual(extractFaqs('Just a paragraph.'), []);
});
