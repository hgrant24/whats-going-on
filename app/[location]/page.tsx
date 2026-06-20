import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import LocationHome from '@/components/LocationHome';
import { LOCATIONS, getLocationBySlug } from '@/lib/locations';

export function generateStaticParams() {
  // Default hub lives at '/', so only generate the non-default slugs here
  return LOCATIONS.filter(l => !l.isDefault).map(l => ({ location: l.slug }));
}

export function generateMetadata({ params }: { params: { location: string } }): Metadata {
  const loc = getLocationBySlug(params.location);
  if (!loc) return {};
  const title = `Events in ${loc.name}, ${loc.region}`;
  return {
    title,
    description: loc.blurb,
    alternates: { canonical: `/${loc.slug}` },
    openGraph: { title: `What's Going On — ${loc.name}, ${loc.region}`, description: loc.blurb },
  };
}

export default function LocationPage({ params }: { params: { location: string } }) {
  const loc = getLocationBySlug(params.location);
  if (!loc) notFound();
  if (loc.isDefault) redirect('/'); // canonicalize the default hub to '/'
  return <LocationHome location={loc} />;
}
