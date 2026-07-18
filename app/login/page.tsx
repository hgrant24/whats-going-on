import type { Metadata } from 'next';
import Header from '@/components/Header';
import LoginForm from '@/components/LoginForm';
import { supabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1C3D55' }}>
          Sign in
        </h1>
        <p className="mt-2 mb-6 text-stone-500 leading-relaxed">
          No password needed — enter your email and we&apos;ll send you a sign-in link.
          An account lets you build a feed of just your towns and track places we
          don&apos;t cover yet.
        </p>

        {searchParams.error === 'link' && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            That sign-in link didn&apos;t work — it may have expired. Enter your email
            below to get a fresh one.
          </div>
        )}

        {supabaseConfigured ? (
          <LoginForm />
        ) : (
          <div className="bg-white border border-stone-200 rounded-xl p-5 text-sm text-stone-500">
            Accounts aren&apos;t switched on yet — check back soon. Everything else on
            the site works without one.
          </div>
        )}
      </main>
    </>
  );
}
