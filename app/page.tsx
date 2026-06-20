import LocationHome from '@/components/LocationHome';
import { DEFAULT_LOCATION } from '@/lib/locations';

export default function HomePage() {
  return <LocationHome location={DEFAULT_LOCATION} />;
}
