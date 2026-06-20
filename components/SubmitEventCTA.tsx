import Link from 'next/link';

export default function SubmitEventCTA({ href = '/submit', areaName }: { href?: string; areaName?: string }) {
  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <p className="text-sm text-teal-800">
        Know something happening{areaName ? ` around ${areaName}` : ' nearby'}?
      </p>
      <Link
        href={href}
        className="shrink-0 text-sm font-semibold text-teal-700 hover:text-teal-900 transition-colors whitespace-nowrap"
      >
        Submit an event →
      </Link>
    </div>
  );
}
