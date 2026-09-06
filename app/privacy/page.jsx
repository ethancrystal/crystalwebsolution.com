import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import { SITE } from '../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';

const TITLE = 'Privacy Policy';
const DESCRIPTION =
  'How CD Sportswear USA collects, uses, and protects your information when you visit our site or use our services.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/privacy' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/privacy'),
    title: `${TITLE} | ${SITE.name}`,
    description: DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | ${SITE.name}`,
    description: DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
};

export default function PrivacyPage() {
  return (
    <MarketingShell sceneVariant="about">
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        lede="How we collect, use, and protect your information."
      />

      <ContentSection eyebrow="Effective" title={`Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}>
        <p className="mkt-prose">
          This privacy policy describes how {SITE.name} collects, uses, and protects your personal
          information when you visit our website or use our services. We respect your privacy and are
          committed to protecting it through our compliance with this policy.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Collection" title="Information we collect" tone="alt">
        <p className="mkt-prose">
          When you submit an inquiry through our contact form, we collect the information you provide:
          your name, email address, company name (if provided), phone number (if provided), and the
          contents of your brief. When you use our client portal, we collect authentication data,
          project-related files and communications, and usage data necessary to provide collaboration
          services.
        </p>
        <p className="mkt-prose">
          We automatically collect technical information when you visit our site: IP address, browser
          type, device information, pages visited, and time spent on the site. We use this data to
          improve site performance, understand how visitors use our site, and protect against misuse.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Usage" title="How we use your information">
        <p className="mkt-prose">
          We use the information we collect to respond to your inquiries, provide quotes and project
          proposals, deliver services you have engaged us for, communicate about ongoing projects,
          send administrative information about your account or services, improve our website and
          services, and protect against fraud and abuse.
        </p>
        <p className="mkt-prose">
          We do not sell, rent, or trade your personal information to third parties for marketing
          purposes. We do not use your information for advertising outside of direct project-related
          communications.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Disclosure" title="When we share information" tone="alt">
        <p className="mkt-prose">
          We share information only when necessary to provide our services: with service providers who
          assist in operating our website and delivering services (hosting, analytics, email delivery,
          client portal infrastructure), when required by law or to protect our rights, and with your
          explicit consent for a specific purpose.
        </p>
        <p className="mkt-prose">
          Our service providers are bound by contractual obligations to keep your information
          confidential and use it only for the purposes we specify.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Security" title="How we protect your information">
        <p className="mkt-prose">
          We implement reasonable technical and organizational measures to protect your personal
          information against unauthorized access, alteration, disclosure, or destruction. This includes
          encryption of data in transit and at rest, access controls limiting who can view your
          information, regular security assessments, and secure authentication for our client portal.
        </p>
        <p className="mkt-prose">
          No method of transmission over the internet is completely secure. While we strive to protect
          your information, we cannot guarantee its absolute security.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Retention" title="How long we keep your information" tone="alt">
        <p className="mkt-prose">
          We retain inquiry data for up to one year unless we enter into a service agreement with you.
          Client project data is retained for the duration of the engagement and up to seven years
          afterward for legal and accounting purposes. Analytics data is retained according to our
          analytics provider's policies (typically 26 months). You may request deletion of your data by
          contacting us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Rights" title="Your privacy rights">
        <p className="mkt-prose">
          Depending on your location, you may have rights to access the personal information we hold
          about you, request correction of inaccurate information, request deletion of your information,
          object to processing of your information, request restriction of processing, and request a copy
          of your information in a portable format.
        </p>
        <p className="mkt-prose">
          To exercise these rights, contact us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. We
          will respond to your request within 30 days.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Cookies" title="Cookies and tracking" tone="alt">
        <p className="mkt-prose">
          We use cookies and similar tracking technologies to maintain site functionality, analyze site
          usage, and improve user experience. Essential cookies are required for the site to function and
          cannot be disabled. Analytics cookies help us understand how visitors interact with our site.
        </p>
        <p className="mkt-prose">
          Most browsers allow you to refuse cookies or alert you when cookies are being sent. If you
          disable cookies, some features of our site may not function properly.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Third-party" title="Third-party services">
        <p className="mkt-prose">
          Our website and services integrate with third-party services that may collect information used
          to identify you. We use hosting and infrastructure services, analytics services to understand
          site usage, email delivery services for communications, and client portal infrastructure for
          project collaboration. Each service has its own privacy policy governing how they handle data.
        </p>
      </ContentSection>

      <ContentSection eyebrow="International" title="International data transfers" tone="alt">
        <p className="mkt-prose">
          {SITE.name} operates from {SITE.city} and {SITE.citySecondary}. Information we collect may be
          transferred to and processed in the United States, the United Arab Emirates, or other
          countries where our service providers operate. By using our services, you consent to the
          transfer of your information to countries outside your country of residence, which may have
          different data protection laws.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Children" title="Children's privacy">
        <p className="mkt-prose">
          Our services are not directed to individuals under the age of 18. We do not knowingly collect
          personal information from children. If you are a parent or guardian and believe your child has
          provided us with personal information, please contact us at{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>, and we will delete that information.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Changes" title="Changes to this policy" tone="alt">
        <p className="mkt-prose">
          We may update this privacy policy from time to time. We will notify you of material changes by
          posting the new policy on this page and updating the "Last updated" date. Your continued use
          of our services after changes are posted constitutes acceptance of the updated policy.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Contact" title="Questions about privacy">
        <p className="mkt-prose">
          If you have questions or concerns about this privacy policy or our data practices, contact us
          at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or by phone at{' '}
          <a href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`}>{SITE.phone}</a>.
        </p>
        <p className="mkt-prose">
          You may also write to us at: {SITE.name}, {SITE.city}, United States.
        </p>
      </ContentSection>

      <BreadcrumbSchema trail={[{ name: 'Privacy Policy', path: '/privacy' }]} />
    </MarketingShell>
  );
}
