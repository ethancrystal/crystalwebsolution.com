import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import { SITE } from '../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';

const TITLE = 'Terms of Service';
const DESCRIPTION =
  "Terms governing your use of CD Sportswear Inc's website and services.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/terms'),
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

export default function TermsPage() {
  return (
    <MarketingShell sceneVariant="about">
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        lede="Terms governing the use of our website and services."
      />

      <ContentSection eyebrow="Effective" title={`Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}>
        <p className="mkt-prose">
          These terms of service govern your use of {SITE.name}'s website and services. By accessing
          our website or engaging our services, you agree to be bound by these terms. If you do not
          agree to these terms, do not use our website or services.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Services" title="What we provide" tone="alt">
        <p className="mkt-prose">
          {SITE.name} provides digital design and development services including web design and
          development, brand identity systems, motion design, and AI automation. We provide a client
          portal for project collaboration and communication. Specific services, deliverables, timelines,
          and fees are defined in individual service agreements or statements of work.
        </p>
        <p className="mkt-prose">
          These terms apply to our website and general services. Specific project work is governed by
          executed service agreements, which take precedence over these general terms in case of
          conflict.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Use" title="Acceptable use">
        <p className="mkt-prose">
          You may use our website and services only for lawful purposes and in accordance with these
          terms. You agree not to use our services to violate any laws or regulations, infringe on
          intellectual property rights, transmit malicious code or harmful materials, attempt
          unauthorized access to our systems, interfere with or disrupt our services, or impersonate
          another person or entity.
        </p>
        <p className="mkt-prose">
          We reserve the right to suspend or terminate access to our services if we believe you have
          violated these terms or engaged in unlawful or harmful conduct.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Intellectual Property" title="Ownership and rights" tone="alt">
        <p className="mkt-prose">
          Our website content, including text, graphics, logos, code, and design, is owned by{' '}
          {SITE.name} or our licensors and is protected by copyright, trademark, and other intellectual
          property laws. You may not copy, modify, distribute, or reproduce our content without
          permission.
        </p>
        <p className="mkt-prose">
          For client project work, ownership and license terms are specified in individual service
          agreements. Typically, upon full payment, clients receive ownership of final deliverables
          created specifically for their project, while {SITE.name} retains ownership of pre-existing
          materials, templates, tools, and techniques used in delivering services.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Client Portal" title="Account and access">
        <p className="mkt-prose">
          Clients engaged in active projects receive access to our client portal. You are responsible
          for maintaining the confidentiality of your account credentials and for all activities that
          occur under your account. Notify us immediately of any unauthorized access or security breach.
        </p>
        <p className="mkt-prose">
          Portal access is provided for project collaboration and remains active for the duration of
          the engagement and a reasonable period afterward for reference and record-keeping. We may
          terminate portal access after project completion or if you violate these terms.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Payment" title="Fees and payment terms" tone="alt">
        <p className="mkt-prose">
          Service fees, payment schedules, and accepted payment methods are specified in individual
          service agreements or proposals. Unless otherwise stated, fees are due according to the
          payment schedule in your service agreement. Late payments may incur interest charges and may
          result in suspension of services.
        </p>
        <p className="mkt-prose">
          All fees are quoted in United States dollars unless otherwise specified. You are responsible
          for any applicable taxes, duties, or fees imposed by your jurisdiction.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Warranty" title="Service warranty and limitations">
        <p className="mkt-prose">
          We warrant that services will be performed in a professional manner consistent with industry
          standards. We strive to deliver work that meets the specifications outlined in your service
          agreement. If services fail to meet agreed specifications, we will make reasonable efforts to
          correct deficiencies.
        </p>
        <p className="mkt-prose">
          Except as expressly stated in your service agreement, our services are provided "as is"
          without warranties of any kind, either express or implied, including but not limited to
          implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
          We do not warrant that our services will be uninterrupted, error-free, or completely secure.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Liability" title="Limitation of liability" tone="alt">
        <p className="mkt-prose">
          To the maximum extent permitted by law, {SITE.name} shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages, including lost profits, lost revenue,
          lost data, or business interruption, arising from or related to our services or these terms,
          even if we have been advised of the possibility of such damages.
        </p>
        <p className="mkt-prose">
          Our total liability for any claim arising from or related to our services shall not exceed the
          amount you paid us for the specific service giving rise to the claim during the twelve months
          preceding the claim.
        </p>
        <p className="mkt-prose">
          Some jurisdictions do not allow limitation of liability for certain types of damages, so these
          limitations may not apply to you in full or in part.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Indemnification" title="Your responsibilities">
        <p className="mkt-prose">
          You agree to indemnify and hold harmless {SITE.name}, its officers, employees, and contractors
          from any claims, damages, losses, liabilities, and expenses (including reasonable attorney
          fees) arising from your use of our services, your violation of these terms, or your violation
          of any rights of another party.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Termination" title="Ending the relationship" tone="alt">
        <p className="mkt-prose">
          Either party may terminate services as specified in the applicable service agreement. These
          general terms remain in effect until you stop using our website and services. We may suspend
          or terminate your access immediately if you violate these terms.
        </p>
        <p className="mkt-prose">
          Provisions regarding intellectual property, limitation of liability, indemnification, and
          dispute resolution survive termination of the relationship.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Disputes" title="Dispute resolution">
        <p className="mkt-prose">
          These terms are governed by the laws of the Commonwealth of Virginia, United States, without
          regard to conflict of law principles. Any disputes arising from these terms or our services
          shall be resolved in the state or federal courts located in Prince William County, Virginia,
          and you consent to the exclusive jurisdiction of those courts.
        </p>
        <p className="mkt-prose">
          Before filing any legal action, you agree to first contact us to attempt to resolve the
          dispute informally. Many disputes can be resolved more quickly and cost-effectively through
          direct communication.
        </p>
      </ContentSection>

      <ContentSection eyebrow="General" title="General provisions" tone="alt">
        <p className="mkt-prose">
          If any provision of these terms is found to be unenforceable, the remaining provisions will
          remain in effect. Our failure to enforce any right or provision of these terms does not
          constitute a waiver of that right or provision. These terms, together with any applicable
          service agreement, constitute the entire agreement between you and {SITE.name} regarding use
          of our services.
        </p>
        <p className="mkt-prose">
          You may not assign or transfer your rights or obligations under these terms without our prior
          written consent. We may assign these terms without restriction.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Changes" title="Changes to these terms">
        <p className="mkt-prose">
          We may update these terms from time to time. We will notify you of material changes by posting
          the new terms on this page and updating the "Last updated" date. For changes to terms
          governing active service agreements, we will provide advance notice. Your continued use of our
          services after changes are posted constitutes acceptance of the updated terms.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Contact" title="Questions about these terms" tone="alt">
        <p className="mkt-prose">
          If you have questions about these terms of service, contact us at{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or by phone at{' '}
          <a href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`}>{SITE.phone}</a>.
        </p>
        <p className="mkt-prose">
          You may also write to us at: {SITE.name}, {SITE.city}, United States.
        </p>
      </ContentSection>

      <BreadcrumbSchema trail={[{ name: 'Terms of Service', path: '/terms' }]} />
    </MarketingShell>
  );
}
