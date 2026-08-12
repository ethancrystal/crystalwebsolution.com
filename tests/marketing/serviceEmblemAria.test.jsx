import { readFile } from 'node:fs/promises';

// ServiceEmblem3D uses next/dynamic + a react-three-fiber Canvas, which is
// awkward to render synchronously in jsdom. This regression check follows
// this repo's established convention (see tests/crm/*.test.mjs) of
// asserting structure directly against source text rather than fighting an
// async lazy-load + WebGL mock for a single markup assertion.
describe('ServiceEmblem 3d variant accessibility', () => {
  it('does not wrap ServiceEmblem3D (and its focusable tooltip button) in aria-hidden', async () => {
    const source = (await readFile('components/marketing/ServiceEmblem.jsx', 'utf8')).replace(/\r\n/g, '\n');
    const threeDBranch = source.match(/if \(variant === '3d'\) \{([\s\S]*?)\n {2}\}/);
    expect(threeDBranch).not.toBeNull();
    expect(threeDBranch[1]).not.toMatch(/aria-hidden="true"[\s\S]*<ServiceEmblem3D/);
  });

  it('still hides the decorative SVG variant from assistive tech (unchanged, no interactive content)', async () => {
    // Line endings are normalized before the indexOf search below: this repo
    // checks files out with CRLF on Windows, and a literal "\n" in the search
    // string silently fails to match "\r\n" (indexOf returns -1, .slice(-1)
    // then returns just the file's last character) rather than throwing.
    const source = (await readFile('components/marketing/ServiceEmblem.jsx', 'utf8')).replace(/\r\n/g, '\n');
    const svgBranch = source.slice(source.indexOf("return (\n    <span className={`mkt-emblem "));
    expect(svgBranch).toMatch(/<span className=\{`mkt-emblem \$\{className\}`\} data-signal=\{signal\} aria-hidden="true">/);
  });
});
