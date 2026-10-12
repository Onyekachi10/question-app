'use client';

import { useState, useEffect, Suspense, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Session, DashboardResponse } from '../types/qa';
import { sessionApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Navbar } from '../components/Navbar';
import { Toast } from '../components/Toast';
import { BackgroundParticles } from '../components/BackgroundParticles';
import {
  Heart,
  Plus,
  Loader2,
  Link2,
  Users,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Clock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

function HomeLobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  // If a session parameter is passed in the URL (e.g. /?session=slug), redirect directly to /communication/[slug]
  const sessionSlugParam = searchParams.get('session');
  useEffect(() => {
    if (sessionSlugParam) {
      router.replace(`/communication/${sessionSlugParam}`);
    }
  }, [sessionSlugParam, router]);

  const [creating, setCreating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [joinInput, setJoinInput] = useState('');

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [isLoading, user, router]);

  // ── Load recent sessions for quick-resume ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoadingSessions(true);
    sessionApi
      .getDashboard()
      .then((data: DashboardResponse) => {
        const list = user.userRole === 'creator' ? data.created : data.joined;
        setRecentSessions(list.slice(0, 4));
        setLoadingSessions(false);
      })
      .catch(() => {
        setLoadingSessions(false);
      });
  }, [user]);

  // ── Create Session Action ───────────────────────────────────────────────────
  const handleCreateSession = async () => {
    setCreating(true);
    try {
      const res = await sessionApi.create();
      setToastMessage('Session created! Opening communication room…');
      setTimeout(() => {
        router.push(`/communication/${res.session.slug}`);
      }, 500);
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to create session');
      setCreating(false);
    }
  };

  // ── Join by slug / URL input (for recipients or testing) ────────────────────
  const handleJoinSubmit = (e: FormEvent) => {
    e.preventDefault();
    const raw = joinInput.trim();
    if (!raw) return;

    // Support full URLs or raw slugs
    let slug = raw;
    try {
      if (raw.includes('/join/')) {
        slug = raw.split('/join/')[1].split('?')[0].split('/')[0];
      } else if (raw.includes('/communication/')) {
        slug = raw.split('/communication/')[1].split('?')[0].split('/')[0];
      } else if (raw.includes('/session/')) {
        slug = raw.split('/session/')[1].split('?')[0].split('/')[0];
      }
    } catch {
      slug = raw;
    }

    if (slug) {
      router.push(`/join/${slug}`);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#fbf8f3] flex items-center justify-center">
        <div className="font-editorial italic text-lg text-[#6c5f57] animate-pulse">
          Loading…
        </div>
      </div>
    );
  }

  const isCreator = user.userRole === 'creator';

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#fbf8f3]">
      <BackgroundParticles />

      <Navbar user={user} showViewSwitcher={false} />

      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Hero Section */}
        <section className="text-center mb-12 sm:mb-16">
          <div
            className="mb-4 inline-flex items-center justify-center animate-bounce"
            style={{ animationDuration: '3.5s' }}
          >
            <Heart className="w-6 h-6 text-[#a45a3f]/70 fill-[#a45a3f]/15" />
          </div>

          <h1 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#382d26] tracking-tight leading-tight">
            You ask, the other party sees.
          </h1>

          <div className="mt-4 mb-4 h-px w-24 bg-[#4f3f35]/20 mx-auto" />

          <p className="font-sans font-light text-xs sm:text-sm tracking-[0.2em] uppercase text-[#6c5f57] max-w-md mx-auto mb-2">
            Private, real-time question &amp; answer exchanges
          </p>

          <p className="text-xs text-[#998d85] font-light">
            Signed in as <strong className="text-[#382d26] font-medium">{user.username}</strong>
            {' · '}
            <span className="capitalize">{user.userRole}</span>
          </p>
        </section>

        {/* Primary Action Panel */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch mb-16">
          {/* Main Action Card */}
          <div className="md:col-span-7 paper-panel p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#a45a3f]/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4f3f35]/5 border border-[#4f3f35]/10 text-[10px] tracking-[0.18em] uppercase text-[#6c5f57] font-light mb-4">
                <Sparkles className="w-3 h-3 text-[#a45a3f]" />
                {isCreator ? 'Creator Space' : 'Recipient Space'}
              </div>

              <h2 className="font-editorial text-2xl sm:text-3xl text-[#382d26] font-normal leading-snug mb-3">
                {isCreator
                  ? 'Start a private Q&A session'
                  : 'Join an active conversation'}
              </h2>

              <p className="text-xs sm:text-sm text-[#6c5f57] font-light leading-relaxed mb-6">
                {isCreator
                  ? 'Open a private communication room with a unique shareable link. Post questions and watch responses appear live.'
                  : 'Have an invite link from a creator? Join the room to receive questions and submit answers in real time.'}
              </p>
            </div>

            <div>
              {isCreator ? (
                <div className="space-y-3">
                  <button
                    id="btn-create-session"
                    onClick={handleCreateSession}
                    disabled={creating}
                    className="btn-loveweb w-full sm:w-auto px-6 py-3.5 text-xs tracking-[0.16em] uppercase flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all disabled:opacity-60"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>{creating ? 'Creating Session…' : 'Create New Session'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-[11px] text-[#998d85] font-light">
                    The Q&amp;A communication page opens immediately upon creation.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleJoinSubmit} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Paste invite link or session code…"
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value)}
                      className="loveweb-input flex-1 px-4 py-2.5 text-xs font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!joinInput.trim()}
                      className="btn-loveweb px-5 py-2.5 text-xs tracking-[0.14em] uppercase disabled:opacity-50"
                    >
                      Join
                    </button>
                  </div>
                  <p className="text-[11px] text-[#998d85] font-light">
                    Or click the link shared with you directly to enter.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* How It Works Sidebar */}
          <div className="md:col-span-5 bg-white/50 backdrop-blur-sm border border-[#4f3f35]/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-light tracking-[0.2em] uppercase text-[#6c5f57] mb-6 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#a45a3f]" />
                How It Works
              </h3>

              <ol className="space-y-5 text-xs text-[#6c5f57] font-light">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#4f3f35]/8 text-[#4f3f35] font-normal flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <div>
                    <strong className="font-medium text-[#382d26] block">
                      Create Session
                    </strong>
                    Generates a private room with a cryptographic slug.
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#4f3f35]/8 text-[#4f3f35] font-normal flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <div>
                    <strong className="font-medium text-[#382d26] block">
                      Share Invite Link
                    </strong>
                    Send the link to the recipient to join the session.
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#4f3f35]/8 text-[#4f3f35] font-normal flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <div>
                    <strong className="font-medium text-[#382d26] block">
                      Communicate in Real-Time
                    </strong>
                    Publish questions and watch answers arrive automatically.
                  </div>
                </li>
              </ol>
            </div>

            <div className="pt-6 border-t border-[#4f3f35]/10 mt-6 flex items-center justify-between">
              <span className="text-[11px] text-[#998d85] font-light">
                Past conversations are preserved
              </span>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-[11px] text-[#a45a3f] hover:text-[#874e38] tracking-[0.14em] uppercase font-light flex items-center gap-1 transition-colors"
              >
                <span>Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Recent & Active Sessions (if any) */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-light tracking-[0.2em] uppercase text-[#6c5f57]">
              Your Recent Sessions
            </h3>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-xs font-light text-[#a45a3f] hover:underline flex items-center gap-1"
            >
              <span>View all in Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {loadingSessions ? (
            <div className="py-8 text-center text-xs text-[#998d85] font-light">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-[#4f3f35]/40" />
              Loading sessions…
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="paper-panel p-8 text-center text-xs text-[#998d85] font-light">
              No previous sessions found. Create a new session above to begin communicating.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentSessions.map((s) => (
                <div
                  key={s.uuid}
                  className="paper-panel p-5 flex items-center justify-between gap-3 group hover:border-[#4f3f35]/25 transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium text-[#382d26] truncate">
                        {s.slug}
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-light ${
                          s.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-[#4f3f35]/10 text-[#6c5f57]'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-[#998d85] font-light">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {s.recipientId ? '2/2 connected' : 'Waiting for recipient'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/communication/${s.slug}`)}
                    className="btn-loveweb text-xs px-3.5 py-1.5 shrink-0 flex items-center gap-1"
                  >
                    <span>Open Room</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbf8f3] flex items-center justify-center">
          <div className="font-editorial italic text-lg text-[#6c5f57] animate-pulse">
            Loading…
          </div>
        </div>
      }
    >
      <HomeLobbyContent />
    </Suspense>
  );
}
