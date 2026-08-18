// Serializes a JSON-LD object for injection into a <script type="application/ld+json">.
//
// JSON.stringify alone is NOT sufficient here. It escapes quotes and
// backslashes, but it passes `<` through untouched — so a value containing the
// literal text `</script>` closes the script element early and everything after
// it is parsed as markup. That is only a theoretical concern for hardcoded
// site copy, which is why components rendering fixed strings got away with
// bare stringify; it stops being theoretical the moment a value is authored
// through a form, as blog post titles now are.
//
// Escaping the angle brackets keeps the JSON semantically identical (JSON
// parsers resolve the escapes) while making it impossible for any string value
// to terminate the enclosing element. The two separator code points are
// escaped because they are legal raw inside a JSON string but are line
// terminators in JavaScript, which breaks any consumer that evaluates rather
// than parses the block. They are matched via fromCharCode so this file stays
// pure ASCII and no editor or transport can mangle an invisible literal.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);
const SEPARATOR_PATTERN = new RegExp(`[${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`, 'g');

export function safeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(SEPARATOR_PATTERN, (character) =>
      character === LINE_SEPARATOR ? '\\u2028' : '\\u2029',
    );
}
