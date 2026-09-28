import { render } from '@testing-library/react';
import PostBody from '@/components/marketing/PostBody';

// Shapes taken from live posts on 2026-09-26: a body that restates its title as
// `# ...`, and an Unsplash image in Markdown image syntax.
const TITLE = 'How Much Does a Small Business Website Cost?';
const IMAGE_SRC =
  'https://images.unsplash.com/photo-1762831063505-68022b6133a9?fm=jpg&q=80&w=1600&auto=format&fit=crop';
const BODY = [
  `# ${TITLE}`,
  '',
  'If you are asking **how much does a small business website cost**, it depends.',
  '',
  `![Calculator, notebook, pencil, and glasses on a bright desk.](${IMAGE_SRC})`,
  '',
  '## What drives price',
  '',
  'Scope.',
].join('\n');

describe('PostBody', () => {
  it('does not print the title again as literal "# ..." text', () => {
    const { container } = render(<PostBody body={BODY} title={TITLE} />);

    expect(container.textContent).not.toContain('# ');
    expect(container.querySelector('h1')).toBeNull();
    expect([...container.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['What drives price']);
  });

  it('renders Markdown images as lazy images with the author alt text, not links', () => {
    const { container } = render(<PostBody body={BODY} title={TITLE} />);
    const img = container.querySelector('img.post-image');

    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe(IMAGE_SRC);
    expect(img.getAttribute('alt')).toBe('Calculator, notebook, pencil, and glasses on a bright desk.');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(container.querySelector(`a[href="${IMAGE_SRC}"]`)).toBeNull();
    expect(container.textContent).not.toContain('!');
  });
});
