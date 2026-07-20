'use client';

import SectionReveal from '../SectionReveal';
import Magnetic from '../Magnetic';
import { SITE } from '../../lib/site';

// Contact deliberately closes quietly. The hero owns the crystal and its
// pulse language; this CTA uses a contained CSS sweep instead of replaying
// that 3D gesture at the end of the page.
export default function Contact() {
  return (
    <section className="section contact" id="contact" data-quiet>
      <div className="text-plate">
        <p className="eyebrow"><SectionReveal as="span" direction="left">From idea to outcome</SectionReveal></p>
        <SectionReveal as="h2" direction="left" className="contact-line">Let&apos;s make</SectionReveal>
        <SectionReveal as="h2" direction="left" className="contact-line contact-line-accent" delay={0.3}>something rare.</SectionReveal>
        <SectionReveal className="contact-sub" direction="up" delay={0.5}>
          <p>Send us your brief. We reply within two business days with a straight read on scope, timeline and cost — and the first move if it&apos;s a fit.</p>
        </SectionReveal>
      </div>
      <SectionReveal className="contact-cta" direction="up" delay={0.4}>
        <Magnetic strength={0.45}>
          <a
            href={`mailto:${SITE.email}`}
            className="btn btn-solid btn-xl contact-email"
            data-cursor="Write us"
          >
            {SITE.email}
          </a>
        </Magnetic>
      </SectionReveal>
      <SectionReveal as="footer" className="footer" direction="left" start="top 94%">
        <div className="footer-col">
          <p className="footer-label">Enquiry</p>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          <a href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`}>{SITE.phone}</a>
        </div>
        <div className="footer-col">
          <p className="footer-label">Social</p>
          {SITE.socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>
          ))}
        </div>
        <div className="footer-col">
          <p className="footer-label">Studio</p>
          <p>{SITE.city}</p>
          <p>Est. {SITE.est}</p>
        </div>
        <p className="footer-bottom">
          © {new Date().getFullYear()} {SITE.name}. {SITE.tagline}
        </p>
      </SectionReveal>
    </section>
  );
}
