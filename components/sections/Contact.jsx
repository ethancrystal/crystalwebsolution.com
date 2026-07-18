'use client';

import DecodeText from '../DecodeText';
import Reveal from '../Reveal';
import Magnetic from '../Magnetic';
import { SITE } from '../../lib/site';

export default function Contact() {
  return (
    <section className="section contact" id="contact" data-quiet>
      <div className="text-plate">
        <p className="eyebrow"><Reveal as="span">From idea to outcome</Reveal></p>
        <DecodeText as="h2" text="Let's make" className="contact-line" />
        <DecodeText as="h2" text="something rare." className="contact-line contact-line-accent" delay={0.3} />
        <Reveal className="contact-sub" delay={0.5}>
          <p>Send us your brief. We reply within two business days with a straight read on scope, timeline and cost — and the first move if it&apos;s a fit.</p>
        </Reveal>
      </div>
      <Reveal className="contact-cta" delay={0.4}>
        <Magnetic strength={0.45}>
          <a href={`mailto:${SITE.email}`} className="btn btn-solid btn-xl" data-cursor="Write us">
            {SITE.email}
          </a>
        </Magnetic>
      </Reveal>
      <footer className="footer">
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
      </footer>
    </section>
  );
}
