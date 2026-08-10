import { ImageResponse } from 'next/og';
import { SITE } from '../lib/site';

// Procedural OG/social share card — no static imagery, per the project's
// code-generated visual rule (AGENTS.md "Conventions"). Screaming Frog's crawl
// had no og:image on any page, so every share on LinkedIn/Slack/X/WhatsApp
// rendered as a bare text link. This is the single highest-leverage off-site
// fix available: it changes nothing about ranking directly, but it governs
// click-through on every link anyone ever shares.
//
// Deliberately NOT `runtime = 'edge'`: next.config.js uses output:'standalone'
// (Docker/node runner), so this is prerendered as a static PNG at build time.
export const alt = `${SITE.name} — ${SITE.statement}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'radial-gradient(120% 120% at 12% 0%, #0b1b3a 0%, #04060c 55%, #04060c 100%)',
          padding: '76px 84px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Refracted-crystal motif. Satori (next/og) supports only linear- and
            radial-gradient — conic-gradient throws "Unexpected token type:
            function" and fails the build — so the facets are layered rotated
            linear-gradient planes instead. */}
        <div
          style={{
            position: 'absolute',
            top: -150,
            right: -110,
            width: 560,
            height: 560,
            display: 'flex',
            background: 'linear-gradient(135deg, rgba(89,243,255,0.50), rgba(60,108,255,0.20) 55%, rgba(150,90,255,0.42))',
            opacity: 0.75,
            transform: 'rotate(18deg)',
            borderRadius: 56,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 130,
            width: 300,
            height: 300,
            display: 'flex',
            background: 'linear-gradient(200deg, rgba(89,243,255,0.42), rgba(4,6,12,0) 70%)',
            transform: 'rotate(-24deg)',
            borderRadius: 36,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              background: 'linear-gradient(135deg,#59f3ff,#3c6cff)',
              transform: 'rotate(45deg)',
            }}
          />
          <div
            style={{
              color: '#9fb3d9',
              fontSize: 26,
              letterSpacing: 6,
              textTransform: 'uppercase',
            }}
          >
            {SITE.name}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div
            style={{
              color: '#f4f8ff',
              fontSize: 86,
              lineHeight: 1.04,
              fontWeight: 700,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Built to be unforgettable.
          </div>
          <div style={{ color: '#9fb3d9', fontSize: 32, maxWidth: 880, lineHeight: 1.35 }}>
            {SITE.statement}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', width: 120, height: 4, background: 'linear-gradient(90deg,#59f3ff,#965aff)' }} />
          <div style={{ color: '#6f83a6', fontSize: 24 }}>{SITE.cityCompact}</div>
        </div>
      </div>
    ),
    size
  );
}
