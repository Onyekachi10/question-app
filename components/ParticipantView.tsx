'use client';

import React, { useState } from 'react';
import { Question, Answer } from '../types/qa';
import { useAuth } from '../lib/auth';
import {
  Heart,
  Send,
  CheckCircle2,
  Clock,
  Edit3,
  Loader2,
  Lock,
  Sparkles,
  AlertCircle,
  CheckCheck,
} from 'lucide-react';

interface ParticipantViewProps {
  questions: Question[];
  myAnswers: Record<string, Answer>; // questionUuid -> Answer
  onSubmitAnswer: (
    questionUuid: string,
    payload: { text_answer?: string; selected_option?: string }
  ) => Promise<void>;
  onNotify: (msg: string) => void;
  isClosed?: boolean;
}

export const ParticipantView: React.FC<ParticipantViewProps> = ({
  questions,
  myAnswers,
  onSubmitAnswer,
  onNotify,
  isClosed = false,
}) => {
  const { user } = useAuth();

  // Local state for answers being drafted per question
  const [draftOptions, setDraftOptions] = useState<Record<string, string>>({});
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});
  const [editingMap, setEditingMap] = useState<Record<string, boolean>>({});
  const [submittingMap, setSubmittingMap] = useState<Record<string, boolean>>({});

  const answeredCount = questions.filter((q) => Boolean(myAnswers[q.uuid])).length;
  const totalCount = questions.length;
  const allAnswered = totalCount > 0 && answeredCount === totalCount;

  const handleSubmit = async (question: Question) => {
    if (!user) {
      onNotify('You must be signed in to submit answers.');
      return;
    }
    if (isClosed) {
      onNotify('This session is closed.');
      return;
    }

    const qId = question.uuid;
    const selectedOption = draftOptions[qId] ?? (myAnswers[qId]?.selected_option || '');
    const textAnswer = draftTexts[qId] ?? (myAnswers[qId]?.text_answer || '');

    if (question.type === 'multiple-choice' && !selectedOption) {
      onNotify('Please select one of the choices.');
      return;
    }
    if (question.type === 'open' && !textAnswer.trim()) {
      onNotify('Please write your response.');
      return;
    }

    setSubmittingMap((prev) => ({ ...prev, [qId]: true }));
    try {
      await onSubmitAnswer(qId, {
        selected_option: question.type === 'multiple-choice' ? selectedOption : undefined,
        text_answer: question.type === 'open' ? textAnswer.trim() : undefined,
      });

      setEditingMap((prev) => ({ ...prev, [qId]: false }));
      onNotify('Your answer has been submitted.');
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : 'Failed to submit answer.');
    } finally {
      setSubmittingMap((prev) => ({ ...prev, [qId]: false }));
    }
  };

  const handleStartEdit = (question: Question) => {
    const existing = myAnswers[question.uuid];
    if (existing) {
      if (existing.selected_option) {
        setDraftOptions((prev) => ({ ...prev, [question.uuid]: existing.selected_option! }));
      }
      if (existing.text_answer) {
        setDraftTexts((prev) => ({ ...prev, [question.uuid]: existing.text_answer! }));
      }
    }
    setEditingMap((prev) => ({ ...prev, [question.uuid]: true }));
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
            Recipient View
          </span>
          <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#382d26] tracking-tight">
            Answer Questions
          </h2>
        </div>

        {totalCount > 0 && (
          <div className="text-right">
            <span
              className={`text-[11px] font-light px-3 py-1 rounded-full border ${
                allAnswered
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {allAnswered
                ? 'All answered!'
                : `${totalCount - answeredCount} pending`}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar (when questions exist) */}
      {totalCount > 0 && (
        <div className="paper-panel p-5 space-y-2 bg-white/70">
          <div className="flex items-center justify-between text-xs">
            <span className="font-light tracking-[0.14em] uppercase text-[#6c5f57]">
              Session Completion
            </span>
            <span className="font-mono text-[#382d26] font-medium">
              {answeredCount} / {totalCount} answered
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#4f3f35]/10 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${(answeredCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="paper-panel p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#a45a3f]/10 text-[#a45a3f] flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="font-editorial text-xl text-[#382d26]">
            Waiting for the creator…
          </h3>
          <p className="text-xs sm:text-sm text-[#6c5f57] font-light max-w-sm mx-auto leading-relaxed">
            The creator hasn&apos;t asked any questions in this session yet. When they publish a question, it will appear here instantly via WebSocket.
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#998d85] font-light pt-2">
            <Sparkles className="w-3.5 h-3.5 text-[#a45a3f]" />
            <span>Connected &amp; listening live</span>
          </div>
        </div>
      )}

      {/* List of Questions */}
      <div className="space-y-6">
        {questions.map((question, idx) => {
          const qId = question.uuid;
          const myAns = myAnswers[qId];
          const isEditing = editingMap[qId];
          const isSubmitting = submittingMap[qId];
          const isAnswered = Boolean(myAns) && !isEditing;

          const currentOption = draftOptions[qId] ?? (myAns?.selected_option || '');
          const currentText = draftTexts[qId] ?? (myAns?.text_answer || '');

          return (
            <div
              key={qId}
              className={`paper-panel p-6 sm:p-8 space-y-5 transition-all border-l-4 ${
                isAnswered
                  ? 'border-l-emerald-500 bg-white/90'
                  : 'border-l-[#a45a3f] bg-white/75'
              }`}
            >
              {/* Question Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-[#a45a3f] text-white">
                      Question #{idx + 1}
                    </span>
                    {question.category && (
                      <span className="text-xs text-[#6c5f57] italic">#{question.category}</span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-light flex items-center gap-1 ${
                      isAnswered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                    }`}
                  >
                    {isAnswered ? (
                      <>
                        <CheckCheck className="w-3 h-3" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>Needs Response</span>
                      </>
                    )}
                  </span>
                </div>

                <h3 className="font-editorial text-xl sm:text-2xl text-[#382d26] leading-snug">
                  {question.title}
                </h3>
              </div>

              {/* Already Answered View */}
              {isAnswered && myAns && (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-800 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Your Submitted Response
                    </span>
                    <span className="text-[10px] text-[#998d85] font-light">
                      {formatTime(myAns.submittedAt || myAns.createdAt)}
                    </span>
                  </div>

                  <div className="p-3 bg-white/80 rounded-xl text-sm text-[#382d26] leading-relaxed">
                    {myAns.selected_option ? (
                      <div>
                        Selected Choice:{' '}
                        <strong className="text-emerald-800 font-medium">
                          {myAns.selected_option}
                        </strong>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{myAns.text_answer}</p>
                    )}
                  </div>

                  {!isClosed && (
                    <div className="text-right pt-1">
                      <button
                        onClick={() => handleStartEdit(question)}
                        className="text-xs text-[#6c5f57] hover:text-[#382d26] flex items-center gap-1 ml-auto font-light"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Change my response</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Answering Form (when unanswered or editing) */}
              {(!isAnswered || isEditing) && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(question);
                  }}
                  className="space-y-4 pt-2"
                >
                  {/* Multiple Choice Options */}
                  {question.type === 'multiple-choice' && question.options && (
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-light tracking-[0.16em] uppercase text-[#6c5f57] block mb-1">
                        Select one choice <span className="text-[#a45a3f]">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {question.options.map((opt, i) => {
                          const isSelected = currentOption === opt;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                setDraftOptions((prev) => ({ ...prev, [qId]: opt }))
                              }
                              className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#382d26] text-[#fbf8f3] border-[#382d26] shadow-sm'
                                  : 'bg-white/60 border-[#4f3f35]/15 text-[#382d26] hover:bg-white hover:border-[#4f3f35]/30'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-[#4f3f35]/8 text-[#4f3f35]'
                                }`}
                              >
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span className="text-xs font-normal flex-1">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Open Expression textarea */}
                  {question.type === 'open' && (
                    <div>
                      <label className="text-[11px] font-light tracking-[0.16em] uppercase text-[#6c5f57] block mb-1.5">
                        Your response <span className="text-[#a45a3f]">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={currentText}
                        onChange={(e) =>
                          setDraftTexts((prev) => ({ ...prev, [qId]: e.target.value }))
                        }
                        placeholder="Write your words here…"
                        className="w-full loveweb-input p-3.5 text-sm leading-relaxed resize-none"
                      />
                    </div>
                  )}

                  {/* Submit / Cancel Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => setEditingMap((prev) => ({ ...prev, [qId]: false }))}
                        className="text-xs text-[#998d85] hover:text-[#6c5f57] font-light"
                      >
                        Cancel
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#998d85] font-light">
                        Answers sync instantly with creator
                      </span>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || isClosed}
                      className="btn-loveweb text-xs px-6 py-2.5 flex items-center gap-2 shadow-xs disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isEditing ? 'Update Response' : 'Submit Answer'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
