'use client';

import React, { useState } from 'react';
import { Question, Answer, QuestionType } from '../types/qa';
import { useAuth } from '../lib/auth';
import { questionApi } from '../lib/api';
import {
  Send,
  Plus,
  Trash2,
  FileQuestion,
  ListFilter,
  X,
  Loader2,
  Lock,
  Clock,
  CheckCircle2,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

interface AskerViewProps {
  questions: Question[];
  answersMap: Record<string, Answer[]>;
  onPublish: (question: Question) => void;
  onDeleteQuestion?: (questionUuid: string) => void;
  onNotify: (msg: string) => void;
  sessionId?: string;
}

export const AskerView: React.FC<AskerViewProps> = ({
  questions,
  answersMap,
  onPublish,
  onDeleteQuestion,
  onNotify,
  sessionId,
}) => {
  const { user } = useAuth();
  const isCreator = user?.userRole === 'creator';

  const [title, setTitle] = useState('');
  const [type, setType] = useState<QuestionType>('open');
  const [options, setOptions] = useState<string[]>(['Option A', 'Option B', 'Option C']);
  const [category, setCategory] = useState('Thought');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, `Choice ${String.fromCharCode(65 + options.length)}`]);
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
      onNotify('Please enter a question title.');
      return;
    }
    if (!user) {
      onNotify('You must be signed in to publish a question.');
      return;
    }
    if (!isCreator) {
      onNotify('Only creators can publish questions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const question = await questionApi.create({
        title: title.trim(),
        type,
        options: type === 'multiple-choice' ? options.filter((o) => o.trim().length > 0) : undefined,
        category: category.trim() || undefined,
        user_id: user.uuid,
        ...(sessionId ? { session_id: sessionId } : {}),
      });

      onPublish(question);
      onNotify(`Question #${questions.length + 1} published! Recipient will see it instantly.`);
      setTitle('');
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Failed to publish question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (questionUuid: string) => {
    setDeletingId(questionUuid);
    try {
      await questionApi.delete(questionUuid);
      if (onDeleteQuestion) {
        onDeleteQuestion(questionUuid);
      }
      onNotify('Question removed.');
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Failed to delete question');
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-light tracking-[0.25em] uppercase text-[#6c5f57] block mb-1">
            Creator Panel
          </span>
          <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#382d26] tracking-tight">
            Ask Questions
          </h2>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#4f3f35]/5 text-[#4f3f35] border border-[#4f3f35]/10">
            {questions.length} {questions.length === 1 ? 'question' : 'questions'} asked
          </span>
        </div>
      </div>

      {/* Main Upload Card */}
      <div className="paper-panel p-6 sm:p-8">
        {!isCreator ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#4f3f35]/5 border border-[#4f3f35]/15 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#4f3f35]/50" />
            </div>
            <p className="font-editorial text-lg text-[#382d26]">Creator only</p>
            <p className="text-sm font-light text-[#6c5f57] max-w-xs">
              Only creator accounts can publish questions.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#4f3f35]/10">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#a45a3f]">
                Question #{questions.length + 1}
              </span>
              <span className="text-[11px] text-[#998d85] font-light">
                Multiple questions can be asked in this session
              </span>
            </div>

            {/* Question textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="question-input" className="text-xs font-light tracking-[0.18em] uppercase text-[#382d26]">
                  Question Title <span className="text-[#a45a3f]">*</span>
                </label>
                <span className="text-[11px] text-[#998d85]">{title.length} characters</span>
              </div>
              <textarea
                id="question-input"
                rows={3}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Type your question here…"
                className="w-full loveweb-input p-4 text-sm sm:text-base leading-relaxed resize-none"
              />
            </div>

            {/* Question type toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="type-open"
                onClick={() => setType('open')}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                  type === 'open'
                    ? 'bg-white border-[#382d26] shadow-sm'
                    : 'bg-white/40 border-[#4f3f35]/12 text-[#6c5f57] hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileQuestion className="w-4 h-4 text-[#4f3f35]" />
                  <span className="text-xs font-medium text-[#382d26] tracking-tight">Open Expression</span>
                </div>
                <p className="text-[11px] text-[#998d85] font-light">Recipient types text answer</p>
              </button>

              <button
                type="button"
                id="type-multiple-choice"
                onClick={() => setType('multiple-choice')}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                  type === 'multiple-choice'
                    ? 'bg-white border-[#382d26] shadow-sm'
                    : 'bg-white/40 border-[#4f3f35]/12 text-[#6c5f57] hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ListFilter className="w-4 h-4 text-[#4f3f35]" />
                  <span className="text-xs font-medium text-[#382d26] tracking-tight">Multiple Choice</span>
                </div>
                <p className="text-[11px] text-[#998d85] font-light">Recipient selects an option</p>
              </button>
            </div>

            {/* Multiple choice options */}
            {type === 'multiple-choice' && (
              <div className="space-y-3 p-4 rounded-2xl bg-[#fbf8f3]/80 border border-[#4f3f35]/12 animate-gentle-enter">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-light tracking-[0.15em] uppercase text-[#382d26]">Options</label>
                  <span className="text-[11px] text-[#998d85]">{options.length}/6 choices</span>
                </div>

                {options.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs font-serif italic text-[#4f3f35]">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Choice ${String.fromCharCode(65 + index)}`}
                      className="flex-1 loveweb-input px-3.5 py-2 text-xs"
                      required
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
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
                    className="mt-1 text-xs text-[#4f3f35] font-light tracking-wide flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#4f3f35]/15 hover:bg-[#4f3f35]/5 transition-all"
                  >
                    <Plus className="w-3 h-3 text-[#a45a3f]" />
                    <span>Add Another Choice</span>
                  </button>
                )}
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-[11px] font-light tracking-[0.16em] uppercase text-[#6c5f57] mb-1.5">
                Category / Topic
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Life, Travel, Fun, Philosophy"
                className="w-full loveweb-input px-3.5 py-2 text-xs"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 text-center">
              <button
                type="submit"
                id="publish-question-btn"
                disabled={isSubmitting}
                className="btn-loveweb w-full sm:w-auto px-10 py-3.5 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Publish Question #{questions.length + 1}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Session Questions & Answers List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-light tracking-[0.2em] uppercase text-[#6c5f57] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#a45a3f]" />
            Questions in this Session ({questions.length})
          </h3>
          <span className="text-[11px] text-[#998d85] font-light flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#a45a3f]" />
            Live WebSocket Sync
          </span>
        </div>

        {questions.length === 0 ? (
          <div className="paper-panel p-8 text-center text-xs text-[#998d85] font-light">
            No questions asked yet in this session. Use the form above to post your first question!
          </div>
        ) : (
          <div className="space-y-5">
            {questions.map((q, idx) => {
              const qAnswers = answersMap[q.uuid] || [];
              const hasAnswer = qAnswers.length > 0;

              return (
                <div
                  key={q.uuid}
                  className="paper-panel p-6 border-l-4 border-l-[#382d26] bg-white/80 space-y-4 transition-all"
                >
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-[0.16em] font-medium px-2 py-0.5 rounded-full bg-[#382d26] text-[#fbf8f3]">
                          Q#{idx + 1}
                        </span>
                        {q.category && (
                          <span className="text-xs text-[#6c5f57] italic">#{q.category}</span>
                        )}
                        <span className="text-[11px] text-[#998d85] font-light">
                          {q.type === 'multiple-choice' ? 'Choice Selection' : 'Open Expression'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-light ml-auto ${
                            hasAnswer
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {hasAnswer ? 'Answered' : 'Waiting for answer'}
                        </span>
                      </div>

                      <h4 className="font-editorial text-lg sm:text-xl text-[#382d26] leading-snug">
                        {q.title}
                      </h4>

                      {q.type === 'multiple-choice' && q.options && (
                        <div className="pt-1 flex flex-wrap gap-2">
                          {q.options.map((opt, i) => (
                            <span
                              key={i}
                              className="text-xs px-2.5 py-0.5 rounded-full bg-[#fbf8f3] text-[#4f3f35] border border-[#4f3f35]/15 font-light"
                            >
                              {String.fromCharCode(65 + i)}. {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {isCreator && (
                      <button
                        onClick={() => handleDelete(q.uuid)}
                        disabled={deletingId === q.uuid}
                        className="text-[#998d85] hover:text-[#a45a3f] p-1.5 rounded-full hover:bg-white transition-colors shrink-0 disabled:opacity-50"
                        title="Delete this question"
                      >
                        {deletingId === q.uuid ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#a45a3f]" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Recipient Response Area */}
                  <div className="pt-3 border-t border-[#4f3f35]/10">
                    {hasAnswer ? (
                      <div className="space-y-2">
                        {qAnswers.map((ans) => (
                          <div
                            key={ans.uuid}
                            className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs sm:text-sm text-[#382d26] font-normal leading-relaxed">
                                  {ans.selected_option ? (
                                    <span>
                                      Selected choice:{' '}
                                      <strong className="font-medium text-emerald-800">
                                        {ans.selected_option}
                                      </strong>
                                    </span>
                                  ) : (
                                    ans.text_answer
                                  )}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-[#998d85] shrink-0 font-light">
                              {formatTime(ans.submittedAt || ans.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-[#998d85] font-light italic py-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                        <span>Recipient has not answered this question yet.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
