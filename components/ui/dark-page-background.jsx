'use client';

import PrismBackground from './prism-background';
import RippleGridBackground from './ripple-grid-background';
import LiquidEtherBackground from './liquid-ether-background';

const INTERACTIVE_BACKGROUNDS = {
  prism: PrismBackground,
  'ripple-grid': RippleGridBackground,
  'liquid-ether': LiquidEtherBackground
};

export default function DarkPageBackground({ interactive = 'prism' }) {
  const Interactive = INTERACTIVE_BACKGROUNDS[interactive] ?? PrismBackground;

  return (
    <>
      <Interactive />
      <div className="alive-overlay" aria-hidden="true">
        {/* Subtle floating ambient orbs */}
        <div className="alive-orb alive-orb-1" />
        <div className="alive-orb alive-orb-2" />
        <div className="alive-orb alive-orb-3" />
        {/* Subtle noise grain */}
        <div className="alive-grain" />
        {/* Soft vignette */}
        <div className="alive-vignette" />
        {/* Horizon glow line */}
        <div className="alive-horizon" />
      </div>
      <style jsx global>{`
        .alive-overlay {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        
        /* Floating ambient orbs — very subtle, slow drift */
        .alive-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
          mix-blend-mode: screen;
          will-change: transform;
        }
        .alive-orb-1 {
          width: 45vw;
          height: 45vw;
          top: -10%;
          left: -5%;
          background: radial-gradient(circle, rgba(89, 243, 255, 0.45), transparent 70%);
          animation: orbDrift1 22s ease-in-out infinite;
        }
        .alive-orb-2 {
          width: 35vw;
          height: 35vw;
          bottom: -5%;
          right: -10%;
          background: radial-gradient(circle, rgba(60, 108, 255, 0.4), transparent 70%);
          animation: orbDrift2 28s ease-in-out infinite;
        }
        .alive-orb-3 {
          width: 30vw;
          height: 30vw;
          top: 40%;
          left: 50%;
          background: radial-gradient(circle, rgba(192, 132, 252, 0.3), transparent 70%);
          animation: orbDrift3 18s ease-in-out infinite;
        }
        
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(8%, 12%) scale(1.08); }
          66% { transform: translate(-4%, 6%) scale(0.95); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-10%, -8%) scale(1.05); }
          66% { transform: translate(5%, -12%) scale(1.1); }
        }
        @keyframes orbDrift3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-45%, -55%) scale(1.12); }
        }
        
        /* Subtle noise grain texture */
        .alive-grain {
          position: absolute;
          inset: 0;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 128px 128px;
        }
        
        /* Soft vignette — darker edges */
        .alive-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 85% 85% at 50% 50%,
            transparent 40%,
            rgba(4, 6, 12, 0.5) 100%
          );
        }
        
        /* Horizon glow — subtle light at bottom */
        .alive-horizon {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 35vh;
          background: linear-gradient(
            to top,
            rgba(89, 243, 255, 0.03) 0%,
            transparent 100%
          );
        }
        
        @media (prefers-reduced-motion: reduce) {
          .alive-orb {
            animation: none;
          }
        }
        
        @media (max-width: 767px) {
          .alive-orb {
            opacity: 0.08;
            filter: blur(50px);
          }
          .alive-orb-1 { width: 60vw; height: 60vw; }
          .alive-orb-2 { width: 50vw; height: 50vw; }
          .alive-orb-3 { width: 55vw; height: 55vw; }
        }
      `}</style>
    </>
  );
}
