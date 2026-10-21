'use client';

import Link from 'next/link';
import SectionReveal from '../SectionReveal';
import Magnetic from '../Magnetic';
import ContactIntake from './ContactIntake';
import TrustpilotWidget from '../marketing/TrustpilotWidget';
import SectionSkeleton from '../ui/section-skeleton';
import { SITE } from '../../lib/site';

// Contact deliberately closes quietly. The hero owns the crystal and its
// pulse language; this CTA uses a contained CSS sweep instead of replaying
// that 3D gesture at the end of the page. The intake (ContactIntake) is a
// two-tab switcher: the embroidery-first production request (default) and the
// original web project brief (the shared ContactForm, variant="home").
export default function Contact() {
  return (
    <section className="section contact contact--quiet" id="contact" data-quiet>
      <SectionSkeleton />
      <ContactIntake />
      <SectionReveal className="contact-cta contact-cta--secondary" direction="up" delay={0.1}>
        <p className="contact-email-label">Prefer email?</p>
        <Magnetic strength={0.45}>
          <a
            href={`mailto:${SITE.email}`}
            className="btn btn-ghost contact-email"
          >
            {SITE.email}
          </a>
        </Magnetic>
      </SectionReveal>
      <SectionReveal as="footer" className="footer" direction="left" start="top 94%">
        <div className="footer-col">
          <p className="footer-label">Enquiry</p>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          {SITE.phone && <a href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`}>{SITE.phone}</a>}
        </div>
        {SITE.socials.length > 0 && (
          <div className="footer-col">
            <p className="footer-label">Social</p>
            {SITE.socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>
            ))}
          </div>
        )}
        <div className="footer-col">
          <p className="footer-label">Studio</p>
          <p>Location in {SITE.city}</p>
          <p>Embroidery, patches, web &amp; brand</p>
        </div>
        <div className="footer-col footer-reviews">
          <p className="footer-label">Reviews</p>
          <TrustpilotWidget className="footer-trustbox" />
          <a href={SITE.trustpilot.writeReviewUrl} target="_blank" rel="noopener noreferrer">
            Review us on Trustpilot
          </a>
        </div>
        <p className="footer-bottom">
          © {new Date().getFullYear()} {SITE.name}. {SITE.tagline}
          <span className="footer-legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms &amp; Conditions</Link>
          </span>
        </p>
      </SectionReveal>
    </section>
  );
}
