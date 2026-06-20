import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo.png"
            alt="What's Going On"
            width={36}
            height={36}
            className="object-contain"
            style={{ mixBlendMode: 'multiply' }}
          />
          <span className="text-lg font-bold" style={{ color: '#1C3D55' }}>
            What&apos;s Going On
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-stone-600">
          <Link href="/" className="hover:text-[#1C3D55] transition-colors">Events</Link>
          <Link href="/about" className="hover:text-[#1C3D55] transition-colors">About</Link>
          <Link
            href="/submit"
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
