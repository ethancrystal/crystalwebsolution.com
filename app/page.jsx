import Experience from '../components/Experience';

// Title, description and social cards come from the root layout; only the
// canonical lives here so no other route can inherit it.
export const metadata = {
  alternates: { canonical: '/' },
};

export default function Home() {
  return <Experience />;
}
