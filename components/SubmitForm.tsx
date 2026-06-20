'use client';

import { useState } from 'react';

const MAX_IMAGE_MB = 10;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  endpoint: string;
  formUrl?: string;
}

export default function SubmitForm({ endpoint, formUrl }: Props) {
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const inputClass =
    'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#5B9BAE] transition';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!url.trim() && !notes.trim() && !file) {
      setErrorMsg('Add an event link, some details, or a photo.');
      return;
    }
    if (file && file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setErrorMsg(`That image is over ${MAX_IMAGE_MB} MB — please choose a smaller one.`);
      return;
    }

    setStatus('submitting');
    try {
      const body = new URLSearchParams();
      body.set('url', url.trim());
      body.set('notes', notes.trim());
      body.set('name', name.trim());
      if (file) {
        body.set('imageData', await fileToDataUrl(file));
        body.set('imageName', file.name);
        body.set('imageType', file.type || 'image/jpeg');
      }

      // Apps Script web apps don't return CORS headers, so we fire-and-forget.
      await fetch(endpoint, { method: 'POST', mode: 'no-cors', body });
      setStatus('success');
      setUrl(''); setNotes(''); setName(''); setFile(null);
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong sending that. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-6 text-center">
        <p className="text-lg font-semibold" style={{ color: '#1C3D55' }}>Thanks — got it! 🎉</p>
        <p className="mt-1 text-sm text-stone-500">
          We&apos;ll review it and add it to the feed, usually within a day or two.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm font-medium hover:underline"
          style={{ color: '#5B9BAE' }}
        >
          Submit another →
        </button>
      </div>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Event link</label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Facebook event, website, Instagram post…"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Details <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Trivia every Tuesday 7pm at The Beehive"
          className={`${inputClass} resize-y`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Your name <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="So we can credit you"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Photo of a flyer or chalkboard <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
        />
        {file && <p className="mt-1 text-xs text-stone-400">{file.name}</p>}
        <p className="mt-1 text-xs text-stone-400">We&apos;ll read the events right off the image.</p>
      </div>

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        style={{ backgroundColor: '#1C3D55' }}
      >
        {submitting ? 'Sending…' : 'Submit event'}
      </button>

      {formUrl && (
        <p className="text-xs text-stone-400 text-center">
          Prefer the Google Form?{' '}
          <a href={formUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">
            Open it here
          </a>
          .
        </p>
      )}
    </form>
  );
}
