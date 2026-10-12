'use client';

import React from 'react';
import { Answer, Question } from '../types/qa';
import { MessageCircle, CheckCircle2, Clock, Sparkles } from 'lucide-react';

interface AnswerFeedProps {
  answers: Answer[];
  question: Question | null;
}

export const AnswerFeed: React.FC<AnswerFeedProps> = ({ answers, question }) => {
  if (!question) return null;

  const relevantAnswers = answers.filter((a) => a.question_id === question.uuid);

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
    <div className="mt-8 border-t border-[#4f3f35]/12 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#4f3f35]/70" />
          <h3 className="text-xs font-light tracking-[0.2em] uppercase text-[#6c5f57]">
            Received Responses
          </h3>
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#4f3f35]/8 text-[#4f3f35] border border-[#4f3f35]/15">
            {relevantAnswers.length}
          </span>
        </div>
        {relevantAnswers.length > 0 && (
          <span className="text-[11px] font-light tracking-[0.1em] text-[#a45a3f] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 animate-pulse" />
            Live Synced
          </span>
        )}
      </div>

      {relevantAnswers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#4f3f35]/15 p-8 text-center bg-white/40">
          <div className="w-10 h-10 rounded-full bg-[#4f3f35]/5 flex items-center justify-center mx-auto mb-3 text-[#4f3f35]/60 border border-[#4f3f35]/10">
            <Clock className="w-4 h-4 animate-pulse" />
          </div>
          <p className="font-editorial italic text-base text-[#382d26] mb-1">
            Listening for words from the other party...
          </p>
          <p className="text-[11px] font-light tracking-[0.1em] uppercase text-[#998d85]">
            As soon as they submit, their answer will appear here gently
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {relevantAnswers.map((answer) => (
            <div
              key={answer.uuid}
              className="p-4 rounded-2xl bg-white/70 border border-[#4f3f35]/12 shadow-xs transition-all duration-300 hover:border-[#4f3f35]/25 hover:shadow-sm animate-gentle-enter"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#4f3f35]/10 text-[#4f3f35] flex items-center justify-center text-[10px] font-medium">
                    {answer.user_id.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-medium text-[#382d26] tracking-tight">
                    Respondent
                  </span>
                </div>
                <span className="text-[11px] font-light text-[#998d85]">{formatTime(answer.createdAt)}</span>
              </div>

              {answer.selected_option && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#a45a3f]" />
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#a45a3f]/10 text-[#874e38] border border-[#a45a3f]/20">
                    {answer.selected_option}
                  </span>
                </div>
              )}

              {answer.text_answer && (
                <p className="text-sm text-[#4f3f35] mt-2 bg-[#fbf8f3]/80 p-3.5 rounded-xl border border-[#4f3f35]/8 leading-relaxed whitespace-pre-wrap font-sans font-light">
                  &ldquo;{answer.text_answer}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
