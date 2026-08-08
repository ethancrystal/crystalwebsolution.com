import SubpageExperience from './SubpageExperience';

// Keep the route-facing shell as a server component. The client runtime is
// isolated in SubpageExperience, so metadata/data-heavy pages remain server
// rendered while sharing the homepage scroll, focus, nav and brand-space feel.
export default function MarketingShell({ children }) {
  return <SubpageExperience>{children}</SubpageExperience>;
}
