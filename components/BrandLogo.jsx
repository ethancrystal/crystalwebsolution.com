export default function BrandLogo() {
  return (
    // No aria-hidden here: the logo <img> carries the alt text that Screaming
    // Frog counts as anchor text for the wrapping home link ("Links: Internal
    // Outlinks With No Anchor Text"). The parent <Link aria-label> still wins
    // the accessible-name computation, so screen readers announce it once.
    <span className="nav-logo-art">
      <img
        className="nav-logo-art-full"
        src="/crystal-web-solution-logo.svg"
        alt="Crystal Web Solution"
        width="1616"
        height="243"
      />
    </span>
  );
}
