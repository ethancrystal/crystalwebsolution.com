'use client';

import SectionReveal from '../SectionReveal';
import Marquee from '../Marquee';
import { light, dim } from '../../lib/beacon';
import { STAGGER_ROW } from '../../lib/easing';

// Copy follows the website-app-copy skill: PAS (Problem–Agitation–Solution)
// compressed into one line per card. Visitors arrive in pain; we name it,
// twist it, then present Crystal as the inevitable answer.
const SERVICES = [
  {
    n: '01',
    title: 'Web Design',
    desc: 'Your site looks like everyone else and quietly loses the deal before a word is read — so we design with intent, clarity and craft that earns the click and the close.',
  },
  {
    n: '02',
    title: 'Development',
    desc: 'That internal tool or product idea keeps stalling in hand-off limbo while technical debt piles up — we architect and ship web apps your team can own and extend.',
  },
  {
    n: '03',
    title: 'Branding',
    desc: 'If prospects cannot tell you apart from the next vendor, every ad dollar works twice as hard for half the return — we build brand systems grounded in strategy and craft, not trends.',
  },
  {
    n: '04',
    title: 'Logo Design',
    desc: 'A templated mark signals "not serious" in every deck and profile you send — we design logos with restraint and meaning that hold up at any size and age well.',
  },
  {
    n: '05',
    title: 'Digital Marketing',
    desc: 'You pour budget into channels with no clear line to revenue while sharper competitors take the pipeline — we run campaigns tied to outcomes, measured and sharpened, not vanity metrics.',
  },
  {
    n: '06',
    title: 'Animation',
    desc: 'When your product needs a paragraph to explain, the room has already tuned out — we craft motion, explainers and 3D that make the complex obvious and stick.',
  },
  {
    n: '07',
    title: 'AI Automation',
    desc: 'Your team burns hours on work software should own, handing velocity to whoever automates first — we build AI automations that take the repetitive load off your plate.',
  },
  {
    n: '08',
    title: 'Workflow Automation',
    desc: 'When your tools do not talk, every hand-off drops a deadline and a customer nobody owns — we wire your stack together and automate the workflows that leak.',
  },
];

export default function Services() {
  return (
    <section className="section services" id="services" data-quiet>
      <div className="services-catalogue">
        <div className="text-plate services-intro">
          <p className="eyebrow"><SectionReveal as="span" direction="left">What we do</SectionReveal></p>
          <SectionReveal as="h2" direction="left" className="section-title">
            Focused vision. Measured execution.
          </SectionReveal>
        </div>
        <div className="services-list">
          {SERVICES.map((s, i) => (
            <SectionReveal
              key={s.n}
              className="service-row"
              delay={i * STAGGER_ROW}
              direction="left"
              as="div"
              onPointerEnter={() => light(i)}
              onPointerLeave={dim}
            >
              <span className="service-num">{s.n}</span>
              <h3 className="service-title" data-hover data-cursor="✦">{s.title}</h3>
              <p className="service-desc">{s.desc}</p>
            </SectionReveal>
          ))}
        </div>
      </div>
      <Marquee text="Strategy · Brand · Immersive 3D · Development · Motion" className="services-marquee" />
    </section>
  );
}
