'use client';

import { use, useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, Answer, Session, QuestionType } from '../../../types/qa';
import { questionApi, answerApi, sessionApi } from '../../../lib/api';
import { getSocket, joinSessionRoom, leaveSessionRoom } from '../../../lib/socket';
import { useAuth } from '../../../lib/auth';
import { playNotificationSound, playSuccessSound } from '../../../lib/sound';
import { Navbar } from '../../../components/Navbar';
import { Toast } from '../../../components/Toast';
import { BackgroundParticles } from '../../../components/BackgroundParticles';
import {
  Heart,
  Loader2,
  Link2,
  AlertCircle,
  Users,
  ArrowLeft,
  Lock,
  Wifi,
  Sparkles,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Edit3,
  X,
  FileQuestion,
  ListFilter,
  CheckCheck,
  Share2,
  ChevronDown,
  MessageCircle,
} from 'lucide-react';

const CATEGORY_SUGGESTIONS = ['Life', 'Thoughts', 'Memories', 'Dreams', 'Fun', 'Deep Talk'];

// ─── Question Card Component ──────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  answers,
  isCreator,
  isRecipient,
  currentUserId,
  isClosed,
  onDelete,
  onSubmitAnswer,
  onNotify,
}: {
  question: Question;
  index: number;
  answers: Answer[];
  isCreator: boolean;
  isRecipient: boolean;
  currentUserId?: string;
  isClosed: boolean;
  onDelete: (uuid: string) => void;
  onSubmitAnswer: (
    questionUuid: string,
    payload: { text_answer?: string; selected_option?: string }
  ) => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Check if current user has answered or if there is an existing answer
  const myAnswer = answers.find((a) => a.user_id === currentUserId) || answers[0] || null;
  const hasAnswer = Boolean(myAnswer);

  useEffect(() => {
    if (myAnswer) {
      if (myAnswer.selected_option) setSelectedOption(myAnswer.selected_option);
      if (myAnswer.text_answer) setTextAnswer(myAnswer.text_answer);
    }
  }, [myAnswer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClosed) {
      onNotify('This session has been closed.');
      return;
    }
    if (question.type === 'multiple-choice' && !selectedOption) {
      onNotify('Please select one of the options.');
      return;
    }
    if (question.type === 'open' && !textAnswer.trim()) {
      onNotify('Please enter your response.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitAnswer(question.uuid, {
        selected_option: question.type === 'multiple-choice' ? selectedOption : undefined,
        text_answer: question.type === 'open' ? textAnswer.trim() : undefined,
      });
      setIsEditing(false);
      onNotify('Response submitted.');
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Failed to submit response.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(question.uuid);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 15) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`relative rounded-3xl border transition-all duration-300 p-6 sm:p-8 backdrop-blur-sm ${
        hasAnswer
          ? 'bg-white/90 border-[#4f3f35]/15 shadow-sm'
          : 'bg-white/70 border-[#4f3f35]/12 shadow-xs hover:border-[#4f3f35]/25'
      }`}
    >
      {/* Top Meta Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-medium px-3 py-1 rounded-full bg-[#382d26] text-[#fbf8f3] tracking-wide">
            #{String(index + 1).padStart(2, '0')}
          </span>
          {question.category && (
            <span className="text-xs font-light text-[#6c5f57] italic px-2.5 py-0.5 rounded-full bg-[#4f3f35]/5 border border-[#4f3f35]/10">
              #{question.category}
            </span>
          )}
          <span className="text-[11px] font-light text-[#998d85] uppercase tracking-[0.14em]">
            {question.type === 'multiple-choice' ? 'Choice Selection' : 'Open Thought'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasAnswer ? (
            <span className="text-[11px] font-light px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Answered</span>
            </span>
          ) : (
            <span className="text-[11px] font-light px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span>Awaiting Answer</span>
            </span>
          )}

          {isCreator && !isClosed && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-[#998d85] hover:text-[#a45a3f] p-1.5 rounded-full hover:bg-[#a45a3f]/8 transition-colors disabled:opacity-50"
              title="Withdraw question"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Question Title */}
      <div className="mb-6">
        <h3 className="font-editorial text-2xl sm:text-3xl text-[#382d26] font-normal leading-snug">
          {question.title}
        </h3>
      </div>

      {/* Answer / Response Container */}
      <div className="pt-4 border-t border-[#4f3f35]/10">
        {/* State 1: Answered & Revealed */}
        {hasAnswer && !isEditing && (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-medium">
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Partner&apos;s Answer</span>
              </div>
              <span className="text-[10px] text-[#998d85] font-light">
                {formatTime(myAnswer?.submittedAt || myAnswer?.createdAt)}
              </span>
            </div>

            <div className="p-4 bg-white/90 rounded-xl border border-emerald-100 shadow-xs">
              {myAnswer?.selected_option ? (
                <div className="text-sm sm:text-base text-[#382d26]">
                  <span className="text-[11px] uppercase tracking-wider text-[#998d85] block mb-1">
                    Selected Choice:
                  </span>
                  <span className="font-medium text-emerald-900 bg-emerald-50/80 px-3 py-1 rounded-lg border border-emerald-200/50 inline-block">
                    {myAnswer.selected_option}
                  </span>
                </div>
              ) : (
                <p className="text-sm sm:text-base text-[#382d26] leading-relaxed whitespace-pre-wrap font-serif italic">
                  &ldquo;{myAnswer?.text_answer}&rdquo;
                </p>
              )}
            </div>

            {isRecipient && !isClosed && (
              <div className="text-right pt-1">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-[#6c5f57] hover:text-[#382d26] inline-flex items-center gap-1 font-light transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Revise your response</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* State 2: Unanswered & Viewer is Creator */}
        {!hasAnswer && isCreator && (
          <div className="p-6 rounded-2xl border border-dashed border-[#4f3f35]/20 bg-[#4f3f35]/3 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
            <p className="font-editorial text-base text-[#382d26] italic">
              Waiting for partner to answer…
            </p>
            <p className="text-xs text-[#998d85] font-light max-w-xs mx-auto">
              When they submit their response, it will appear here instantly in real time.
            </p>
          </div>
        )}

        {/* State 3: Unanswered or Editing (Viewer is Recipient) */}
        {((!hasAnswer && isRecipient) || (isEditing && isRecipient)) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#6c5f57] font-light">
              <span>{isEditing ? 'Editing your response:' : 'Your turn to answer:'}</span>
              <span className="text-[#a45a3f] font-normal">* Required</span>
            </div>

            {/* Multiple Choice Options */}
            {question.type === 'multiple-choice' && question.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.options.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedOption(opt)}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-[#382d26] text-[#fbf8f3] border-[#382d26] shadow-sm'
                          : 'bg-white/80 border-[#4f3f35]/15 text-[#382d26] hover:bg-white hover:border-[#4f3f35]/30'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white font-medium'
                            : 'bg-[#4f3f35]/8 text-[#4f3f35]'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-xs sm:text-sm font-normal flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Open Thought Textarea */}
            {question.type === 'open' && (
              <div>
                <textarea
                  rows={3}
                  required
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Share your thoughts honestly…"
                  className="w-full loveweb-input p-4 text-sm leading-relaxed resize-none rounded-2xl"
                />
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-[#998d85] hover:text-[#6c5f57]"
                >
                  Cancel
                </button>
              ) : (
                <span className="text-[11px] text-[#998d85] font-light flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#a45a3f]" />
                  <span>Instantly reveals to creator</span>
                </span>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isClosed}
                className="btn-loveweb text-xs px-6 py-2.5 flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isEditing ? 'Save Changes' : 'Send Answer'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Creator Question Composer ────────────────────────────────────────────────

function CreatorPromptComposer({
  questionCount,
  sessionId,
  onPublish,
  onNotify,
}: {
  questionCount: number;
  sessionId: string;
  onPublish: (question: Question) => void;
  onNotify: (msg: string) => void;
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(questionCount === 0);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<QuestionType>('open');
  const [options, setOptions] = useState<string[]>(['Option A', 'Option B', 'Option C']);
  const [category, setCategory] = useState('Thoughts');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, `Option ${String.fromCharCode(65 + options.length)}`]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onNotify('Please enter a question prompt.');
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    try {
      const question = await questionApi.create({
        title: title.trim(),
        type,
        options: type === 'multiple-choice' ? options.filter((o) => o.trim().length > 0) : undefined,
        category: category.trim() || undefined,
        user_id: user.uuid,
        session_id: sessionId,
      });

      onPublish(question);
      setTitle('');
      onNotify(`Question #${questionCount + 1} sent!`);
      // Keep composer open if first question, collapse if multiple
      if (questionCount > 0) {
        setIsOpen(false);
      }
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Failed to publish question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-10 rounded-3xl border border-[#4f3f35]/15 bg-white/85 backdrop-blur-md shadow-xs p-6 sm:p-8 transition-all">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#a45a3f]/10 text-[#a45a3f] flex items-center justify-center">
            <Plus className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
          </div>
          <div>
            <h3 className="font-editorial text-xl sm:text-2xl text-[#382d26] font-normal">
              Ask Question #{questionCount + 1}
            </h3>
            <p className="text-xs text-[#998d85] font-light">
              Send an open thought or choice prompt to your partner
            </p>
          </div>
        </div>

        <button
          type="button"
          className="text-xs font-light text-[#6c5f57] hover:text-[#382d26] flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#4f3f35]/5 border border-[#4f3f35]/10"
        >
          <span>{isOpen ? 'Minimize' : 'Expand'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-[#4f3f35]/10 space-y-5 animate-gentle-enter">
          {/* Question title */}
          <div>
            <label htmlFor="prompt-title" className="text-xs font-light tracking-[0.16em] uppercase text-[#382d26] block mb-2">
              Prompt Text <span className="text-[#a45a3f]">*</span>
            </label>
            <textarea
              id="prompt-title"
              rows={2}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. What is a small memory of us that always makes you smile?"
              className="w-full loveweb-input p-4 text-sm sm:text-base resize-none rounded-2xl"
            />
          </div>

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('open')}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                type === 'open'
                  ? 'bg-[#382d26] text-[#fbf8f3] border-[#382d26] shadow-sm'
                  : 'bg-white/60 border-[#4f3f35]/12 text-[#382d26] hover:bg-white'
              }`}
            >
              <FileQuestion className="w-4 h-4 shrink-0" />
              <div>
                <span className="text-xs font-medium block">Open Thought</span>
                <span className={`text-[10px] font-light ${type === 'open' ? 'text-white/70' : 'text-[#998d85]'}`}>
                  Partner writes free text
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType('multiple-choice')}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                type === 'multiple-choice'
                  ? 'bg-[#382d26] text-[#fbf8f3] border-[#382d26] shadow-sm'
                  : 'bg-white/60 border-[#4f3f35]/12 text-[#382d26] hover:bg-white'
              }`}
            >
              <ListFilter className="w-4 h-4 shrink-0" />
              <div>
                <span className="text-xs font-medium block">Choice Selection</span>
                <span className={`text-[10px] font-light ${type === 'multiple-choice' ? 'text-white/70' : 'text-[#998d85]'}`}>
                  Partner picks an option
                </span>
              </div>
            </button>
          </div>

          {/* Multiple choice builder */}
          {type === 'multiple-choice' && (
            <div className="p-4 rounded-2xl bg-[#fbf8f3]/80 border border-[#4f3f35]/12 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#6c5f57]">
                <span>Choice Options</span>
                <span>{options.length}/6 options</span>
              </div>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs font-mono text-[#4f3f35]">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    className="flex-1 loveweb-input px-3.5 py-2 text-xs"
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="p-1.5 text-[#998d85] hover:text-[#a45a3f] rounded-full hover:bg-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs text-[#a45a3f] font-light flex items-center gap-1 pt-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add another option</span>
                </button>
              )}
            </div>
          )}

          {/* Category Chips */}
          <div>
            <label className="text-[11px] font-light tracking-[0.16em] uppercase text-[#6c5f57] block mb-2">
              Category / Topic
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {CATEGORY_SUGGESTIONS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    category.toLowerCase() === cat.toLowerCase()
                      ? 'bg-[#382d26] text-[#fbf8f3] border-[#382d26]'
                      : 'bg-white/60 text-[#6c5f57] border-[#4f3f35]/15 hover:bg-white'
                  }`}
                >
                  #{cat}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 text-right">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-loveweb px-8 py-3 text-xs tracking-[0.14em] uppercase flex items-center gap-2 ml-auto shadow-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send Question to Partner</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Main Communication Page Container ────────────────────────────────────────

function CommunicationContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Multi-question state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answersMap, setAnswersMap] = useState<Record<string, Answer[]>>({});

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/auth?redirect=/communication/${slug}`);
    }
  }, [isLoading, user, router, slug]);

  // ── Fetch Session Details ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoadingSession(true);
    setSessionError(null);

    sessionApi
      .getBySlug(slug)
      .then((s) => {
        setSession(s);
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        setShareUrl(`${base}/join/${s.slug}`);
        setLoadingSession(false);
      })
      .catch((err: Error) => {
        setSessionError(err.message || 'Session not found');
        setLoadingSession(false);
      });
  }, [user, slug]);

  // ── Fetch Questions & Answers ──────────────────────────────────────────────
  const loadQuestionsAndAnswers = useCallback(async (sessionUuid: string) => {
    try {
      const qList = await questionApi.listBySession(sessionUuid);
      setQuestions(qList);

      const ansPairs = await Promise.all(
        qList.map(async (q) => {
          const ans = await answerApi.getByQuestion(q.uuid);
          return { questionId: q.uuid, answers: ans };
        })
      );

      const newMap: Record<string, Answer[]> = {};
      ansPairs.forEach(({ questionId, answers }) => {
        newMap[questionId] = answers;
      });
      setAnswersMap(newMap);
    } catch (err) {
      console.debug('Failed to load questions and answers:', err);
    }
  }, []);

  useEffect(() => {
    if (session?.uuid) {
      loadQuestionsAndAnswers(session.uuid);
    }
  }, [session?.uuid, loadQuestionsAndAnswers]);

  // ── WebSocket Real-Time Listeners ───────────────────────────────────────────
  useEffect(() => {
    if (!session || !user) return;

    const socket = getSocket();

    const handleConnect = () => {
      setSocketConnected(true);
      joinSessionRoom(session.uuid, session.slug);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    if (socket.connected) {
      setSocketConnected(true);
      joinSessionRoom(session.uuid, session.slug);
    } else {
      socket.on('connect', handleConnect);
    }

    socket.on('disconnect', handleDisconnect);

    // 1. New Question published by creator
    socket.on('new_question', (newQ: Question) => {
      setQuestions((prev) => {
        if (prev.some((q) => q.uuid === newQ.uuid)) return prev;
        return [...prev, newQ];
      });

      if (newQ.user_id !== user.uuid) {
        if (soundEnabled) playNotificationSound();
        setToastMessage(`New Question received: "${newQ.title.slice(0, 32)}…"`);
      }
    });

    // 2. Question deleted by creator
    socket.on('question_deleted', ({ question_id }: { question_id: string }) => {
      setQuestions((prev) => prev.filter((q) => q.uuid !== question_id));
      setAnswersMap((prev) => {
        const copy = { ...prev };
        delete copy[question_id];
        return copy;
      });
    });

    // 3. New Answer submitted by recipient
    socket.on('new_answer', ({ question_id, answer }: { question_id: string; answer: Answer }) => {
      setAnswersMap((prev) => {
        const existing = prev[question_id] || [];
        const filtered = existing.filter((a) => a.uuid !== answer.uuid);
        return { ...prev, [question_id]: [...filtered, answer] };
      });

      if (answer.user_id !== user.uuid) {
        if (soundEnabled) playSuccessSound();
        setToastMessage('Partner submitted an answer!');
      }
    });

    // 4. Answer updated
    socket.on('answer_updated', ({ question_id, answer }: { question_id: string; answer: Answer }) => {
      setAnswersMap((prev) => {
        const existing = prev[question_id] || [];
        const updated = existing.map((a) => (a.uuid === answer.uuid ? answer : a));
        return { ...prev, [question_id]: updated };
      });
    });

    // 5. Recipient joined
    socket.on('recipient_joined', ({ recipientId, session: updatedSession }: any) => {
      setSession((prev) => (prev ? { ...prev, recipientId, ...updatedSession } : prev));
      if (soundEnabled) playSuccessSound();
      setToastMessage('Partner has connected to the room!');
    });

    // 6. Session closed
    socket.on('session_closed', ({ session: updatedSession }: any) => {
      setSession((prev) => (prev ? { ...prev, status: 'closed', ...updatedSession } : prev));
      setToastMessage('This session has been closed.');
    });

    return () => {
      leaveSessionRoom(session.uuid, session.slug);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_question');
      socket.off('question_deleted');
      socket.off('new_answer');
      socket.off('answer_updated');
      socket.off('recipient_joined');
      socket.off('session_closed');
    };
  }, [session?.uuid, session?.slug, user, soundEnabled]);

  // Periodic background fallback sync
  useEffect(() => {
    if (!session?.uuid) return;
    const interval = setInterval(() => {
      loadQuestionsAndAnswers(session.uuid);
    }, 12000);
    return () => clearInterval(interval);
  }, [session?.uuid, loadQuestionsAndAnswers]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handlePublishQuestion = (question: Question) => {
    setQuestions((prev) => {
      if (prev.some((q) => q.uuid === question.uuid)) return prev;
      return [...prev, question];
    });
    if (soundEnabled) playSuccessSound();
  };

  const handleDeleteQuestion = async (questionUuid: string) => {
    try {
      await questionApi.delete(questionUuid);
      setQuestions((prev) => prev.filter((q) => q.uuid !== questionUuid));
      setAnswersMap((prev) => {
        const copy = { ...prev };
        delete copy[questionUuid];
        return copy;
      });
      setToastMessage('Question removed.');
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to delete question');
    }
  };

  const handleSubmitAnswer = async (
    questionUuid: string,
    payload: { text_answer?: string; selected_option?: string }
  ) => {
    if (!user) return;

    const existingAnswer = (answersMap[questionUuid] || []).find((a) => a.user_id === user.uuid);
    let answer: Answer;

    if (existingAnswer) {
      answer = await answerApi.update(existingAnswer.uuid, payload);
    } else {
      answer = await answerApi.submit(questionUuid, {
        ...payload,
        user_id: user.uuid,
      });
    }

    setAnswersMap((prev) => {
      const existing = prev[questionUuid] || [];
      const filtered = existing.filter((a) => a.uuid !== answer.uuid);
      return { ...prev, [questionUuid]: [...filtered, answer] };
    });

    if (soundEnabled) playSuccessSound();
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setToastMessage('Invite link copied to clipboard!');
  };

  const handleCloseSession = async () => {
    if (!session) return;
    try {
      await sessionApi.close(session.slug);
      setSession((s) => (s ? { ...s, status: 'closed' } : s));
      setToastMessage('Session has been closed.');
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to close session');
    }
  };

  // ── Loading & Error States ──────────────────────────────────────────────────

  if (isLoading || loadingSession) {
    return (
      <div className="min-h-screen bg-[#fbf8f3] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#4f3f35]/40 animate-spin" />
        <div className="font-editorial italic text-base text-[#6c5f57] animate-pulse">
          Connecting to private room…
        </div>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="min-h-screen bg-[#fbf8f3] flex flex-col items-center justify-center px-4">
        <div className="paper-panel p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-editorial text-2xl text-[#382d26]">Session Not Found</h2>
          <p className="text-sm text-[#6c5f57] font-light">
            {sessionError || 'This session link does not exist or has expired.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button onClick={() => router.push('/')} className="btn-loveweb-secondary text-xs">
              Back to Lobby
            </button>
            <button onClick={() => router.push('/dashboard')} className="btn-loveweb text-xs">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCreator = user?.uuid === session.creatorId;
  const isRecipient = user?.uuid === session.recipientId;
  const isClosed = session.status === 'closed';

  const answeredQuestionsCount = questions.filter((q) => (answersMap[q.uuid] || []).length > 0).length;
  const allAnswered = questions.length > 0 && answeredQuestionsCount === questions.length;

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#fbf8f3]">
      <BackgroundParticles />

      <Navbar
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        user={user}
        showViewSwitcher={false}
      />

      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb Navigation & Top Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-xs tracking-[0.16em] uppercase text-[#6c5f57] hover:text-[#382d26] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lobby</span>
          </button>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-light text-[#6c5f57] tracking-wider">
              {socketConnected ? 'Live Connection' : 'Reconnecting…'}
            </span>
          </div>
        </div>

        {/* Unified Partner Status Card */}
        <div className="mb-8 rounded-3xl border border-[#4f3f35]/12 bg-white/80 backdrop-blur-md p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Partner Connection Visual */}
            <div className="flex items-center gap-4">
              {/* Creator Node */}
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#382d26] text-[#fbf8f3] flex items-center justify-center font-medium text-xs shadow-xs">
                  {isCreator ? 'You' : 'Host'}
                </div>
                <div>
                  <span className="text-[10px] tracking-[0.18em] uppercase text-[#998d85] block font-light">
                    Creator
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-[#382d26]">
                    {isCreator ? user?.username : 'Session Creator'}
                  </span>
                </div>
              </div>

              {/* Connecting line / status */}
              <div className="flex flex-col items-center px-1">
                <div className="w-8 sm:w-12 h-px bg-[#4f3f35]/20 relative">
                  <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                    session.recipientId ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`} />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-[#998d85] mt-1 font-light">
                  {session.recipientId ? 'Linked' : 'Waiting'}
                </span>
              </div>

              {/* Recipient Node */}
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium shadow-xs ${
                  session.recipientId
                    ? 'bg-[#a45a3f] text-[#fbf8f3]'
                    : 'bg-[#4f3f35]/8 text-[#6c5f57] border border-dashed border-[#4f3f35]/30'
                }`}>
                  {session.recipientId ? (isRecipient ? 'You' : 'Partner') : '?'}
                </div>
                <div>
                  <span className="text-[10px] tracking-[0.18em] uppercase text-[#998d85] block font-light">
                    Recipient
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-[#382d26]">
                    {session.recipientId
                      ? isRecipient
                        ? user?.username
                        : 'Connected'
                      : 'Not Joined'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions & Invite Button */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {!isClosed && !session.recipientId && (
                <button
                  onClick={handleCopyLink}
                  className="btn-loveweb text-xs flex items-center gap-1.5 px-4 py-2"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copy Partner Invite Link</span>
                </button>
              )}

              {!isClosed && session.recipientId && (
                <button
                  onClick={handleCopyLink}
                  className="btn-loveweb-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Share link</span>
                </button>
              )}

              {isCreator && !isClosed && (
                <button
                  onClick={handleCloseSession}
                  className="text-[11px] tracking-[0.14em] uppercase text-[#a45a3f] hover:text-[#874e38] border border-[#a45a3f]/25 hover:bg-[#a45a3f]/8 px-3.5 py-1.5 rounded-full transition-all"
                >
                  End Session
                </button>
              )}
            </div>
          </div>

          {/* Session Progress Sub-bar */}
          <div className="mt-5 pt-4 border-t border-[#4f3f35]/10 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2 font-light text-[#6c5f57]">
              <span>Session: <strong className="font-mono text-[#382d26]">{session.slug}</strong></span>
              <span>·</span>
              <span>{questions.length} questions exchanged</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-light ${
                isClosed
                  ? 'bg-[#4f3f35]/10 text-[#4f3f35]'
                  : allAnswered
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {isClosed
                  ? 'Session Closed'
                  : allAnswered
                  ? 'All answers complete'
                  : `${questions.length - answeredQuestionsCount} pending answers`}
              </span>
            </div>
          </div>
        </div>

        {/* Closed Banner Notice */}
        {isClosed && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
            <Lock className="w-4 h-4 shrink-0 text-amber-700" />
            <span>
              This session has concluded. All questions and responses are preserved below.
            </span>
          </div>
        )}

        {/* Creator Question Composer (Only shown to Creator when session is active) */}
        {isCreator && !isClosed && (
          <CreatorPromptComposer
            questionCount={questions.length}
            sessionId={session.uuid}
            onPublish={handlePublishQuestion}
            onNotify={(msg) => setToastMessage(msg)}
          />
        )}

        {/* Recipient Guidance Banner */}
        {isRecipient && !isClosed && (
          <div className="mb-8 p-5 rounded-2xl bg-white/70 border border-[#4f3f35]/10 backdrop-blur-sm flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="font-editorial text-lg text-[#382d26]">
                {allAnswered ? 'All caught up!' : 'Questions awaiting your answer'}
              </h4>
              <p className="text-xs text-[#6c5f57] font-light">
                {allAnswered
                  ? 'You have answered every question in this room. Stay tuned as your partner adds more.'
                  : `Please answer the questions below. Your partner sees your responses in real time.`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-sm font-medium text-[#382d26]">
                {answeredQuestionsCount}/{questions.length}
              </span>
            </div>
          </div>
        )}

        {/* Questions Stream Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#a45a3f]" />
            <h3 className="text-xs font-light tracking-[0.2em] uppercase text-[#6c5f57]">
              The Conversation Stream ({questions.length})
            </h3>
          </div>
        </div>

        {/* Empty State */}
        {questions.length === 0 && (
          <div className="rounded-3xl border border-dashed border-[#4f3f35]/20 bg-white/50 p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#a45a3f]/10 text-[#a45a3f] flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-editorial text-2xl text-[#382d26]">
              {isCreator ? 'Ask the first question' : 'Waiting for partner…'}
            </h4>
            <p className="text-xs sm:text-sm text-[#6c5f57] font-light max-w-sm mx-auto leading-relaxed">
              {isCreator
                ? 'Use the composer above to write your first open prompt or multiple-choice question.'
                : 'Your partner has not asked a question yet. As soon as they hit send, it will appear here.'}
            </p>
          </div>
        )}

        {/* Chronological Questions Stream */}
        <div className="space-y-6">
          {questions.map((question, idx) => (
            <QuestionCard
              key={question.uuid}
              question={question}
              index={idx}
              answers={answersMap[question.uuid] || []}
              isCreator={isCreator}
              isRecipient={isRecipient}
              currentUserId={user?.uuid}
              isClosed={isClosed}
              onDelete={handleDeleteQuestion}
              onSubmitAnswer={handleSubmitAnswer}
              onNotify={(msg) => setToastMessage(msg)}
            />
          ))}
        </div>
      </main>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}

export default function CommunicationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbf8f3] flex items-center justify-center">
          <div className="font-editorial italic text-base text-[#6c5f57] animate-pulse">
            Loading private conversation…
          </div>
        </div>
      }
    >
      <CommunicationContent params={params} />
    </Suspense>
  );
}
