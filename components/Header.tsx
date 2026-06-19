import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-stone-900 hover:text-teal-700 transition-colors">
          What&apos;s Going On
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-stone-600">
          <Link href="/" className="hover:text-teal-700 transition-colors">Events</Link>
          <Link href="/about" className="hover:text-teal-700 transition-colors">About</Link>
          <Link
            href="/submit"
            className="bg-teal-600 text-white px-3.5 py-1.5 rounded-full hover:bg-teal-700 transition-colors"
          >
            Submit
          </Link>
        </nav>
      </div>
    </header>
  );
}
