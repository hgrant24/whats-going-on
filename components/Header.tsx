import Link from 'next/link';
import Image from 'next/image';
import LocationSwitcher from './LocationSwitcher';
import { DEFAULT_LOCATION } from '@/lib/locations';

export default function Header({ currentSlug = DEFAULT_LOCATION.slug }: { currentSlug?: string }) {
  const submitHref = currentSlug === DEFAULT_LOCATION.slug ? '/submit' : `/submit?loc=${currentSlug}`;

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link href="/" className="shrink-0" aria-label="What's Going On — home">
            <Image
              src="/logo.png"
              alt="What's Going On"
              width={40}
              height={40}
              className="object-contain"
              style={{ mixBlendMode: 'multiply' }}
            />
          </Link>
          <LocationSwitcher currentSlug={currentSlug} />
        </div>

        <nav className="flex items-center gap-4 text-sm font-medium text-stone-600 shrink-0">
          <Link href="/about" className="hover:text-[#1C3D55] transition-colors">About</Link>
          <Link
            href={submitHref}
            className="text-white px-3.5 py-1.5 rounded-full transition-colors"
            style={{ backgroundColor: '#1C3D55' }}
          >
            Submit
          </Link>
        </nav>
      </div>
    </header>
  );
}
