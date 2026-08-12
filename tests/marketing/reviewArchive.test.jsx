import { fireEvent, render, screen } from '@testing-library/react';
import ReviewArchive from '@/components/marketing/ReviewArchive';

const reviews = [
  {
    id: 'new-five', reviewer: 'Ada', company: 'Aperture', headline: 'Excellent build',
    body: ['A careful and fast delivery.'], rating: 5, country: 'US', reviewCount: 1, date: 'June 15, 2026',
  },
  {
    id: 'old-four', reviewer: 'Ben', company: 'Beacon', headline: 'Solid collaboration',
    body: ['Clear communication throughout.'], rating: 4, country: 'CA', reviewCount: 2, date: 'January 2, 2025',
    reply: { date: 'January 3, 2025', body: 'Thank you.' },
  },
  {
    id: 'critical-long', reviewer: 'Cy', company: 'Cinder', headline: 'Needed more time',
    body: ['First paragraph with the initial concern.', 'Second paragraph with useful context.'], rating: 3, country: 'US', reviewCount: 1, date: 'April 1, 2026',
  },
];

describe('ReviewArchive', () => {
  it('filters by rating and company reply while reporting the visible count', () => {
    render(<ReviewArchive reviews={reviews} />);

    fireEvent.click(screen.getByRole('button', { name: '5 stars' }));
    expect(screen.getByText('Showing 1 of 3 reviews')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.queryByText('Ben')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Company replied' }));
    expect(screen.getByText('Showing 1 of 3 reviews')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
  });

  it('searches review text, recovers from no matches, and sorts oldest first', () => {
    render(<ReviewArchive reviews={reviews} />);
    const search = screen.getByRole('searchbox', { name: 'Search reviews' });

    fireEvent.change(search, { target: { value: 'Cinder' } });
    expect(screen.getByText('Cy')).toBeInTheDocument();
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'not present' } });
    expect(screen.getByText(/No reviews match your search/)).toBeInTheDocument();

    fireEvent.change(search, { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort reviews' }), { target: { value: 'oldest' } });
    expect(screen.getAllByRole('article')[0]).toHaveAttribute('id', 'old-four');
  });

  it('keeps long reviews collapsed until the accessible control expands them', () => {
    render(<ReviewArchive reviews={reviews} />);
    const control = screen.getByRole('button', { name: 'Read full review' });

    expect(control).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Second paragraph with useful context.')).not.toBeInTheDocument();

    fireEvent.click(control);
    expect(control).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Second paragraph with useful context.')).toBeInTheDocument();
  });
});
