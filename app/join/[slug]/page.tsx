'use client';

import { use, useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { sessionApi } from '../../../lib/api';
import type { Session } from '../../../types/qa';
import { Heart, Users, Link2, Loader2, LogIn, CheckCircle, AlertCircle } from 'lucide-react';

function JoinContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth?redirect=/join/${slug}`);
    }
  }, [authLoading, user, router, slug]);

  // Resolve the session from slug
  useEffect(() => {
    if (!user) return;
    setLoadingSession(true);
    sessionApi
      .getBySlug(slug)
      .then((s) => {
        setSession(s);
        setLoadingSession(false);
      })
      .catch((err: Error) => {
        setSessionError(err.message || 'Session not found');
        setLoadingSession(false);
      });
  }, [user, slug]);

  const handleJoin = async () => {
    if (!session) return;
    setJoining(true);
    setJoinError(null);
    try {
      const res = await sessionApi.join(slug);
      setJoined(true);
      // Navigate to the communication page with session context after a brief success pause
      setTimeout(() => {
        router.push(`/communication/${slug}`);
      }, 1400);
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join session');
      setJoining(false);
    }
  };

  // Loading states
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fbf8f3] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#4f3f35]/40 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen bg-[#fbf8f3] flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Glow orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-[#a45a3f]/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md animate-gentle-enter">
        {/* Brand header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#4f3f35]/20 bg-white/70 shadow-sm mb-4">
            <Heart className="w-5 h-5 fill-[#4f3f35]/15 stroke-[#4f3f35]" />
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-[#382d26] tracking-tight">
            Join Session
          </h1>
          <p className="mt-2 font-sans font-light text-xs tracking-[0.2em] uppercase text-[#6c5f57]">
            You&apos;ve been invited to a live Q&amp;A
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-sm border border-[#4f3f35]/12 rounded-3xl shadow-sm p-8 sm:p-10">

          {/* Session info */}
          {loadingSession ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 className="w-6 h-6 text-[#4f3f35]/40 animate-spin" />
              <p className="text-xs text-[#998d85] tracking-[0.15em] uppercase font-light">
                Loading session…
              </p>
            </div>
          ) : sessionError ? (
            <div className="flex flex-col items-center py-10 gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-[#a45a3f]/60" />
              <p className="text-sm text-[#a45a3f] font-light">{sessionError}</p>
              <button
                onClick={() => router.push('/')}
                className="mt-3 btn-loveweb-secondary text-xs"
              >
                Go home
              </button>
            </div>
          ) : session ? (
            <>
              {/* Slug badge */}
              <div className="flex items-center gap-2 justify-center mb-8">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#4f3f35]/5 border border-[#4f3f35]/12">
                  <Link2 className="w-3.5 h-3.5 text-[#4f3f35]/60" />
                  <span className="text-sm font-mono text-[#382d26] tracking-wide">{session.slug}</span>
                </div>
              </div>

              {/* Session meta */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between py-3 border-b border-[#4f3f35]/8">
                  <span className="text-[11px] tracking-[0.18em] uppercase font-light text-[#998d85]">Status</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    session.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-[#a45a3f]/8 text-[#a45a3f] border border-[#a45a3f]/15'
                  }`}>
                    {session.status === 'active' ? 'Active' : 'Closed'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-[#4f3f35]/8">
                  <span className="text-[11px] tracking-[0.18em] uppercase font-light text-[#998d85]">Participants</span>
                  <div className="flex items-center gap-1.5 text-xs text-[#6c5f57]">
                    <Users className="w-3.5 h-3.5" />
                    <span>{session.recipientId ? '2 / 2' : '1 / 2'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="text-[11px] tracking-[0.18em] uppercase font-light text-[#998d85]">You are joining as</span>
                  <span className="text-xs font-medium text-[#382d26] capitalize">{user?.userRole}</span>
                </div>
              </div>

              {/* Closed session warning */}
              {session.status === 'closed' && (
                <div className="mb-6 px-4 py-3 rounded-2xl bg-[#a45a3f]/6 border border-[#a45a3f]/15 flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 text-[#a45a3f] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#a45a3f] font-light leading-relaxed">
                    This session is closed. You cannot join it.
                  </p>
                </div>
              )}

              {/* Already has recipient */}
              {session.status === 'active' && session.recipientId && session.recipientId !== user?.uuid && (
                <div className="mb-6 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-100 flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 font-light leading-relaxed">
                    This session already has a recipient. Contact the creator.
                  </p>
                </div>
              )}

              {/* Join error */}
              {joinError && (
                <div className="mb-5 px-4 py-3 rounded-2xl bg-[#a45a3f]/8 border border-[#a45a3f]/25 flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 text-[#a45a3f] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#a45a3f] font-light">{joinError}</p>
                </div>
              )}

              {/* Success state */}
              {joined ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm text-[#382d26] font-light">Joined! Redirecting…</p>
                </div>
              ) : (
                <button
                  id="btn-join-session"
                  onClick={handleJoin}
                  disabled={
                    joining ||
                    session.status === 'closed' ||
                    (!!session.recipientId && session.recipientId !== user?.uuid)
                  }
                  className="btn-loveweb w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>{joining ? 'Joining…' : 'Join Session'}</span>
                </button>
              )}
            </>
          ) : null}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-[10px] font-light text-[#998d85] tracking-[0.12em] uppercase">
          Signed in as <span className="font-medium text-[#6c5f57]">{user?.username}</span>
        </p>
      </div>
    </div>
  );
}

export default function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbf8f3] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#4f3f35]/40 animate-spin" />
        </div>
      }
    >
      <JoinContent params={params} />
    </Suspense>
  );
}
