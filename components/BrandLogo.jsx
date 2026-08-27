import { SITE } from '../lib/site';

export default function BrandLogo() {
  return (
    // The logo <img> carries the brand name for assistive technology while the
    // wrapping home link provides the navigation context.
    <span className="nav-logo-art">
      <img
        className="nav-logo-art-full"
        src={SITE.logoPath}
        alt={SITE.name}
        width={SITE.logoWidth}
        height={SITE.logoHeight}
      />
    </span>
  );
}
