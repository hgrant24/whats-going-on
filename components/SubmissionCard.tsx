import { RawSubmission } from '@/types/event';

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function formatSubmittedDate(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SubmissionCard({ submission }: { submission: RawSubmission }) {
  const domain = submission.link ? extractDomain(submission.link) : null;

  return (
    <article className="bg-white rounded-xl border border-stone-200 p-4 flex items-start justify-between gap-4 hover:border-teal-300 hover:shadow-sm transition-all">
      <div className="flex-1 min-w-0">
        {domain && (
          <p className="text-sm font-semibold text-stone-700">{domain}</p>
        )}
        {submission.notes && (
          <p className="mt-0.5 text-sm text-stone-500 leading-relaxed">{submission.notes}</p>
        )}
        {submission.timestamp && (
          <p className="mt-1.5 text-xs text-stone-400">
            Submitted {formatSubmittedDate(submission.timestamp)}
          </p>
        )}
      </div>
      {submission.link && (
        <a
          href={submission.link}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors whitespace-nowrap"
        >
          Visit →
        </a>
      )}
    </article>
  );
}
