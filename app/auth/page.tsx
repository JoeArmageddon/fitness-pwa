'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

function ApexLogo() {
  return (
    <svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="apexG" x1="30%" y1="90%" x2="70%" y2="0%">
          <stop offset="0%" stopColor="#0A84FF"/>
          <stop offset="100%" stopColor="#5E5CE6"/>
        </linearGradient>
        <radialGradient id="apexGlow" cx="50%" cy="48%" r="40%">
          <stop offset="0%" stopColor="rgba(10,132,255,0.4)"/>
          <stop offset="100%" stopColor="rgba(10,132,255,0)"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="56" rx="38" ry="26" fill="url(#apexGlow)"/>
      <path d="M50 17 L84 76 H66 L50 45 L34 76 H16 Z" fill="url(#apexG)"/>
    </svg>
  );
}

function AuthContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
    });
    if (params.get('error')) setError('Authentication failed. Please try again.');
  }, [router, params]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-8 pt-safe">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10 animate-fade-up">
        <div className="w-20 h-20 rounded-3xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
          <ApexLogo />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Apex</h1>
        <p className="text-white/40 text-sm mt-1 text-center">Your Personal Performance Operating System</p>
      </div>

      <div className="w-full max-w-sm space-y-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Magic link sent */}
        {sent ? (
          <div className="card text-center py-8 animate-scale-in">
            <div className="w-14 h-14 bg-green-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <h2 className="font-bold text-white mb-1">Check your email</h2>
            <p className="text-sm text-white/50">We sent a magic link to <span className="text-white/80">{email}</span></p>
            <button onClick={() => setSent(false)} className="mt-4 text-sm text-blue-400 font-semibold">
              Try a different email
            </button>
          </div>
        ) : (
          <>
            {/* Google Sign-In */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3.5 rounded-2xl active:scale-95 transition-all shadow-sm disabled:opacity-60"
            >
              {googleLoading ? (
                <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30 font-medium">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Email Magic Link */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-apple pl-10 w-full"
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : <Mail size={17} />}
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-xs text-white/25 px-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
