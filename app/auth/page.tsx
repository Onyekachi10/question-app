'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { UserRole } from '../../types/qa';
import { Heart, PenLine, Eye, LogIn, UserPlus, Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const router = useRouter();
  const { login, register, rateLimitError, clearRateLimitError } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('creator');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    clearRateLimitError();

    startTransition(async () => {
      try {
        if (mode === 'login') {
          await login({ email, username, userRole });
        } else {
          await register({ email, username, userRole });
        }
        router.push('/');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  };

  return (
    <div className="relative min-h-screen bg-[#fbf8f3] flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Glow orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#a45a3f]/8 rounded-full blur-3xl pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#4f3f35]/20 bg-white/70 shadow-sm mb-4">
            <Heart className="w-5 h-5 fill-[#4f3f35]/15 stroke-[#4f3f35]" />
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-[#382d26] tracking-tight">
            Questions &amp; Words
          </h1>
          <p className="mt-2 font-sans font-light text-xs tracking-[0.2em] uppercase text-[#6c5f57]">
            A serene question &amp; answer exchange
          </p>
        </div>

        {/* Panel */}
        <div className="bg-white/70 backdrop-blur-sm border border-[#4f3f35]/12 rounded-3xl shadow-sm p-8 sm:p-10">

          {/* Mode tabs */}
          <div className="flex items-center bg-[#4f3f35]/5 p-1 rounded-full border border-[#4f3f35]/10 mb-8">
            {(['login', 'register'] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                id={`auth-tab-${m}`}
                onClick={() => { setMode(m); setError(null); clearRateLimitError(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-light tracking-[0.14em] uppercase rounded-full transition-all duration-300 ${
                  mode === m
                    ? 'bg-[#382d26] text-[#fbf8f3] shadow-sm'
                    : 'text-[#6c5f57] hover:text-[#382d26]'
                }`}
              >
                {m === 'login' ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="auth-email" className="block text-[11px] font-light tracking-[0.18em] uppercase text-[#6c5f57] mb-1.5">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full loveweb-input px-4 py-3 text-sm"
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="auth-username" className="block text-[11px] font-light tracking-[0.18em] uppercase text-[#6c5f57] mb-1.5">
                Username
              </label>
              <input
                id="auth-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jordan"
                className="w-full loveweb-input px-4 py-3 text-sm"
              />
            </div>

            {/* Role selector */}
            <div>
              <label className="block text-[11px] font-light tracking-[0.18em] uppercase text-[#6c5f57] mb-2">
                I am a…
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['creator', 'recipient'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    id={`role-${role}`}
                    onClick={() => setUserRole(role)}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                      userRole === role
                        ? 'bg-white border-[#382d26] shadow-sm'
                        : 'bg-white/40 border-[#4f3f35]/12 text-[#6c5f57] hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      {role === 'creator' ? (
                        <PenLine className="w-3.5 h-3.5 text-[#4f3f35]" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-[#4f3f35]" />
                      )}
                      <span className="text-xs font-medium text-[#382d26] tracking-tight capitalize">
                        {role}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#998d85] font-light">
                      {role === 'creator' ? 'Ask questions' : 'Answer questions'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {(error || rateLimitError) && (
              <div
                id="auth-error"
                className="px-4 py-3 rounded-2xl bg-[#a45a3f]/8 border border-[#a45a3f]/25 text-[#a45a3f] text-xs font-light"
              >
                {error || rateLimitError}
              </div>
            )}

            {/* Submit */}
            <button
              id="auth-submit"
              type="submit"
              disabled={isPending}
              className="btn-loveweb w-full py-3.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>
                {isPending
                  ? 'Please wait…'
                  : mode === 'login'
                  ? 'Sign In'
                  : `Register as ${userRole}`}
              </span>
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] font-light text-[#998d85]">
            {mode === 'login' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className="text-[#a45a3f] hover:underline"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-[#a45a3f] hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
