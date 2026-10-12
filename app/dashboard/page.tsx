'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { sessionApi } from '../../lib/api';
import type { Session, SessionMessagesResponse } from '../../types/qa';
import {
  Heart, LayoutDashboard, PenLine, Eye, Clock, MessageSquare,
  ChevronRight, ArrowLeft, Loader2, AlertCircle, Users,
  RotateCcw, BookOpen,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  role,
  onView,
}: {
  session: Session;
  role: 'creator' | 'joined';
  onView: () => void;
}) {
  return (
    <button
      id={`session-card-${session.slug}`}
      onClick={onView}
      className="w-full text-left group paper-panel px-6 py-5 flex items-center justify-between gap-4 hover:scale-[1.01] transition-transform"
    >
      <div className="flex-1 min-w-0">
        {/* Slug + role */}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-sm text-[#382d26] tracking-wide truncate">
            {session.slug}
          </span>
          <span className={`shrink-0 text-[10px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-full font-light ${
            role === 'creator'
              ? 'bg-[#4f3f35]/8 text-[#4f3f35]'
              : 'bg-[#a45a3f]/8 text-[#a45a3f]'
          }`}>
            {role === 'creator' ? 'Creator' : 'Recipient'}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status */}
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${
              session.status === 'active' ? 'bg-emerald-400' : 'bg-[#4f3f35]/30'
            }`} />
            <span className="text-[10px] text-[#998d85] font-light capitalize">{session.status}</span>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-1 text-[10px] text-[#998d85]">
            <Users className="w-3 h-3" />
            <span>{session.recipientId ? '2' : '1'}/2</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-1 text-[10px] text-[#998d85]">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(session.createdAt)}</span>
          </div>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-[#998d85] group-hover:text-[#4f3f35] transition-colors shrink-0" />
    </button>
  );
}

// ─── Conversation Detail Panel ─────────────────────────────────────────────────

function ConversationDetail({
  slug,
  onBack,
}: {
  slug: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<SessionMessagesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    sessionApi
      .getMessages(slug)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  return (
    <div className="animate-gentle-enter">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase text-[#998d85] hover:text-[#6c5f57] mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All sessions
      </button>

      {loading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <Loader2 className="w-6 h-6 text-[#4f3f35]/40 animate-spin" />
          <p className="text-xs text-[#998d85] tracking-[0.15em] uppercase font-light">Loading conversation…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle className="w-8 h-8 text-[#a45a3f]/50" />
          <p className="text-sm text-[#a45a3f] font-light">{error}</p>
        </div>
      ) : data ? (
        <div>
          {/* Session header */}
          <div className="paper-panel px-6 py-5 mb-6 flex items-center justify-between">
            <div>
              <span className="font-mono text-base text-[#382d26] tracking-wide">{data.session.slug}</span>
              <div className="flex items-center gap-3 mt-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  data.session.status === 'active' ? 'bg-emerald-400' : 'bg-[#4f3f35]/30'
                }`} />
                <span className="text-[10px] text-[#998d85] font-light capitalize">{data.session.status}</span>
                <span className="text-[10px] text-[#998d85]">·</span>
                <span className="text-[10px] text-[#998d85] font-light">{data.messages.length} questions</span>
              </div>
            </div>
            {data.session.status === 'active' ? (
              <button
                onClick={() => router.push(`/communication/${data.session.slug}`)}
                className="btn-loveweb text-xs flex items-center gap-1.5 px-3.5 py-1.5"
              >
                <span>Enter Live Room</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <MessageSquare className="w-5 h-5 text-[#4f3f35]/30" />
            )}
          </div>

          {/* Messages */}
          {data.messages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <BookOpen className="w-8 h-8 text-[#4f3f35]/20" />
              <p className="text-sm text-[#998d85] font-light">No questions in this session yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {data.messages.map((q, idx) => (
                <div key={q.uuid} className="paper-panel px-6 py-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#4f3f35]/8 flex items-center justify-center text-[10px] font-light text-[#4f3f35]">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-[#382d26] font-normal leading-relaxed">{q.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-[#998d85] font-light capitalize">{q.type}</span>
                        {q.category && (
                          <>
                            <span className="text-[10px] text-[#998d85]">·</span>
                            <span className="text-[10px] text-[#998d85] font-light">{q.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Answers */}
                  {q.answers.length > 0 ? (
                    <div className="ml-8 space-y-2">
                      {q.answers.map((a) => (
                        <div key={a.uuid} className="px-4 py-3 rounded-xl bg-[#4f3f35]/4 border border-[#4f3f35]/8">
                          <p className="text-xs text-[#6c5f57] font-light leading-relaxed">
                            {a.text_answer || a.selected_option || '—'}
                          </p>
                          <p className="text-[10px] text-[#998d85] mt-1 font-light">
                            {formatRelativeTime(a.submittedAt || a.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ml-8">
                      <p className="text-[11px] text-[#998d85] font-light italic">No answers yet.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [created, setCreated] = useState<Session[]>([]);
  const [joined, setJoined] = useState<Session[]>([]);
  const [loadingDash, setLoadingDash] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'created' | 'joined'>('created');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
  }, [authLoading, user, router]);

  // Load dashboard data
  const loadDashboard = () => {
    if (!user) return;
    setLoadingDash(true);
    setDashError(null);
    sessionApi
      .getDashboard()
      .then((data) => {
        setCreated(data.created);
        setJoined(data.joined);
        setLoadingDash(false);
      })
      .catch((err: Error) => {
        setDashError(err.message || 'Failed to load dashboard');
        setLoadingDash(false);
      });
  };

  useEffect(loadDashboard, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#fbf8f3] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#4f3f35]/40 animate-spin" />
      </div>
    );
  }

  if (selectedSlug) {
    return (
      <div className="min-h-screen bg-[#fbf8f3]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <ConversationDetail slug={selectedSlug} onBack={() => setSelectedSlug(null)} />
        </div>
      </div>
    );
  }

  const activeSessions = activeTab === 'created' ? created : joined;

  return (
    <div className="min-h-screen bg-[#fbf8f3]">
      {/* Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[36rem] h-64 bg-[#a45a3f]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* Header */}
        <div className="flex items-start justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => router.push('/')}
                className="w-8 h-8 rounded-full border border-[#4f3f35]/15 bg-white/60 flex items-center justify-center hover:bg-white transition-colors"
                title="Back to Q&A"
              >
                <Heart className="w-3.5 h-3.5 fill-[#4f3f35]/15 stroke-[#4f3f35]" />
              </button>
              <LayoutDashboard className="w-4 h-4 text-[#4f3f35]/60" />
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-[#382d26] tracking-tight">
              Conversations
            </h1>
            <p className="mt-1 text-xs font-light text-[#998d85] tracking-[0.18em] uppercase">
              Signed in as <span className="text-[#6c5f57] font-medium">{user.username}</span>
            </p>
          </div>

          <button
            onClick={loadDashboard}
            title="Refresh"
            className="shrink-0 mt-1 p-2 rounded-full border border-[#4f3f35]/15 bg-white/60 hover:bg-white transition-colors text-[#998d85] hover:text-[#4f3f35]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="paper-panel px-5 py-4 flex items-center gap-3">
            <PenLine className="w-4 h-4 text-[#4f3f35]/50 shrink-0" />
            <div>
              <p className="text-xl font-editorial font-normal text-[#382d26]">{created.length}</p>
              <p className="text-[10px] text-[#998d85] font-light tracking-[0.14em] uppercase">Created</p>
            </div>
          </div>
          <div className="paper-panel px-5 py-4 flex items-center gap-3">
            <Eye className="w-4 h-4 text-[#a45a3f]/50 shrink-0" />
            <div>
              <p className="text-xl font-editorial font-normal text-[#382d26]">{joined.length}</p>
              <p className="text-[10px] text-[#998d85] font-light tracking-[0.14em] uppercase">Joined</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-[#4f3f35]/5 p-1 rounded-full border border-[#4f3f35]/10 mb-6">
          {(['created', 'joined'] as const).map((tab) => (
            <button
              key={tab}
              id={`dash-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-light tracking-[0.14em] uppercase rounded-full transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-[#382d26] text-[#fbf8f3] shadow-sm'
                  : 'text-[#6c5f57] hover:text-[#382d26]'
              }`}
            >
              {tab === 'created' ? <PenLine className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {tab === 'created' ? 'Sessions I Created' : 'Sessions I Joined'}
            </button>
          ))}
        </div>

        {/* Content */}
        {loadingDash ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="w-6 h-6 text-[#4f3f35]/40 animate-spin" />
            <p className="text-xs text-[#998d85] tracking-[0.15em] uppercase font-light">Loading…</p>
          </div>
        ) : dashError ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <AlertCircle className="w-8 h-8 text-[#a45a3f]/50" />
            <p className="text-sm text-[#a45a3f] font-light">{dashError}</p>
            <button onClick={loadDashboard} className="mt-2 btn-loveweb-secondary text-xs">
              Retry
            </button>
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-12 h-12 rounded-full border border-[#4f3f35]/10 bg-white/50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#4f3f35]/30" />
            </div>
            <p className="text-sm text-[#998d85] font-light">
              {activeTab === 'created'
                ? 'No sessions created yet. Head to the Q&A page to start one.'
                : 'No sessions joined yet. Ask someone to share a link with you.'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-2 btn-loveweb-secondary text-xs"
            >
              Go to Q&A
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-gentle-enter">
            {activeSessions.map((session) => (
              <SessionCard
                key={session.uuid}
                session={session}
                role={activeTab === 'created' ? 'creator' : 'joined'}
                onView={() => setSelectedSlug(session.slug)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
