// design-sync preview shim for 'next/link'. The real module's client runtime
// reads process.env.__NEXT_* (statically replaced by Next's own build), which
// crashes an esbuild browser bundle outside a real Next.js build. Previews
// only need the rendered <a> — routing/prefetch behavior isn't exercised in
// a static preview card.
import { forwardRef } from 'react';

const Link = forwardRef(function Link(
  { href, prefetch, replace, scroll, shallow, passHref, legacyBehavior, ...rest },
  ref,
) {
  const url = typeof href === 'string' ? href : href?.pathname ?? '#';
  return <a ref={ref} href={url} {...rest} />;
});

export default Link;
