'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ElegantShape } from './ui/shape-landing-hero';

type Mode = 'signin' | 'signup';

export default function AuthScreen({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/oauth` : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange in the provider will flip the app to the authed view.
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        // If email confirmation is required there is no active session yet.
        if (!data.session) setCheckEmail(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) setError(error.message);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0a0a14] relative flex items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/[0.05] via-transparent to-accent-secondary/[0.05] blur-3xl" />
        <ElegantShape delay={0.3} width={500} height={120} rotate={12} gradient="from-cyan-500/[0.15]" className="left-[-8%] top-[12%]" />
        <ElegantShape delay={0.5} width={420} height={110} rotate={-15} gradient="from-violet-500/[0.15]" className="right-[-4%] top-[68%]" />
        <ElegantShape delay={0.4} width={240} height={70} rotate={-8} gradient="from-indigo-500/[0.15]" className="left-[6%] bottom-[6%]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 text-text-secondary/70 text-sm font-body hover:text-text-primary transition-colors flex items-center gap-1.5 mx-auto"
          >
            ← Back to home
          </button>
        )}
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl tracking-wide">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-primary via-white to-accent-secondary">
              BuildAI
            </span>
          </h1>
          <p className="text-text-secondary text-sm font-body mt-2">
            Describe your dream building. Walk through it in seconds.
          </p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
          {checkEmail ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">📬</div>
              <h2 className="font-display text-text-primary text-lg mb-2">Check your email</h2>
              <p className="text-text-secondary text-sm font-body">
                We sent a confirmation link to <span className="text-accent-primary">{email}</span>. Click it to activate your account, then sign in.
              </p>
              <button
                onClick={() => { setCheckEmail(false); setMode('signin'); }}
                className="mt-5 text-accent-primary text-sm font-body hover:underline"
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-text-primary text-lg mb-1">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-text-secondary/70 text-xs font-body mb-5">
                {mode === 'signin' ? 'Sign in to continue to BuildAI.' : 'Start designing in seconds.'}
              </p>

              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white text-gray-800 font-body text-sm font-medium hover:bg-gray-100 transition-colors mb-4"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-text-secondary/50 text-[10px] font-mono uppercase">or</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-text-secondary text-xs font-body mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-black/20 border border-white/[0.08] rounded-xl px-4 py-2.5 text-text-primary placeholder-text-secondary/40 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary text-xs font-body mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/20 border border-white/[0.08] rounded-xl px-4 py-2.5 text-text-primary placeholder-text-secondary/40 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-accent-danger text-xs font-body bg-accent-danger/10 border border-accent-danger/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-display font-medium tracking-wide rounded-xl text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-accent-primary/25 transition-all"
                >
                  {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-text-secondary/70 text-xs font-body mt-4">
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
                  className="text-accent-primary hover:underline"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-text-secondary/40 text-[10px] font-body mt-6">
          Built for the WFCP World Congress 2026 · Kenya
        </p>
      </div>
    </div>
  );
}
