import assert from 'node:assert/strict';
import test from 'node:test';

import { parseInline, parseMarkdown, safeHref } from '../lib/blogMarkdown.mjs';
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
