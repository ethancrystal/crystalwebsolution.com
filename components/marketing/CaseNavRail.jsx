'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Case study only. Two-way prev/next rail (the plain single "Next case"
// link only went forward) plus standard studio-site keyboard nav: Left/Right
// arrow keys move between cases when focus isn't inside a form control.
export default function CaseNavRail({ prev, next }) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      if (event.key === 'ArrowLeft') router.push(`/work/${prev.slug}`);
      else if (event.key === 'ArrowRight') router.push(`/work/${next.slug}`);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prev.slug, next.slug, router]);

  return (
    <nav className="case-nav-rail" aria-label="Case study navigation">
      <Link href={`/work/${prev.slug}`} className="case-nav-cell case-nav-prev">
        <span className="case-nav-arrow" aria-hidden="true">←</span>
        <span className="case-nav-text">
          <span className="eyebrow">Previous case</span>
          <span className="case-nav-title">{prev.title}</span>
        </span>
      </Link>
      <Link href={`/work/${next.slug}`} className="case-nav-cell case-nav-next">
        <span className="case-nav-text">
          <span className="eyebrow">Next case</span>
          <span className="case-nav-title">{next.title}</span>
        </span>
        <span className="case-nav-arrow" aria-hidden="true">→</span>
      </Link>
    </nav>
  );
}
