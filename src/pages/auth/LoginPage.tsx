/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { MOCK_USERS } from '../../services/mockDataService';
import { isFirebaseConfigured } from '../../config/firebase';
import { GoogleProfileOnboardingModal } from '../../components/auth/GoogleProfileOnboardingModal';
import { UserPortalService } from '../../services/userPortalService';
import { INDIAN_MEDIA } from '../../data/indianMediaAssets';

export interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, switchSimulatedPersona, simulatedUserId } = useAuth();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('alfanewsservice@gmail.com');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Alfa News Admin');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{ name: string; email: string }>({
    name: 'Alfa User',
    email: 'alfanewsservice@gmail.com',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, displayName);
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      if (isFirebaseConfigured) {
        await loginWithGoogle();
      }
      const userProfile = UserPortalService.getProfile();
      if (!userProfile.onboardingCompleted || !userProfile.phoneNumber) {
        setPendingGoogleUser({
          name: userProfile.displayName || displayName,
          email: userProfile.email || email,
        });
        setIsOnboardingOpen(true);
      } else {
        onSuccess();
      }
    } catch {
      setPendingGoogleUser({ name: displayName, email });
      setIsOnboardingOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen google-hero-glow flex flex-col font-sans">
      <div className="h-[2px] w-full google-spectrum-bar" />

      <div className="flex-1 flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Desktop Visual Showcase */}
          <div className="hidden lg:flex lg:col-span-6 rounded-3xl overflow-hidden border border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#242629] flex-col justify-between">
            <div className="relative flex-1 min-h-[280px] overflow-hidden bg-[#eef4ff]">
              <img
                src={INDIAN_MEDIA.heroNewsroom}
                alt="Newsroom editors working together"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6 text-white space-y-1">
                <div className="text-xs text-white/80">NewsPress India</div>
                <h2 className="text-xl font-bold text-white leading-snug">
                  Print editions, field stories, and broadcast bulletins in one workspace.
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-2.5 text-xs text-[#5f6368] dark:text-[#bdc1c6]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1e8e3e] shrink-0" />
                <span>300 DPI print-ready broadsheet plates</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1a73e8] shrink-0" />
                <span>Verified reporter marketplace with UPI payouts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#ea4335] shrink-0" />
                <span>Built-in broadcast video studio</span>
              </div>
            </div>
          </div>

          {/* Sign-In Form */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="bg-white dark:bg-[#242629] border border-[#e0e3e7] dark:border-[#3c4043] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
              <div className="h-1 w-full google-spectrum-bar" />
              <div className="p-5 sm:p-8 space-y-5">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center justify-center gap-2">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="2.5" y="3.5" width="19" height="17" rx="4" stroke="#4285f4" strokeWidth="2.2" />
                      <line x1="6.5" y1="8.5" x2="12.5" y2="8.5" stroke="#ea4335" strokeWidth="2.2" strokeLinecap="round" />
                      <line x1="6.5" y1="12.5" x2="17.5" y2="12.5" stroke="#fbbc04" strokeWidth="2.2" strokeLinecap="round" />
                      <line x1="6.5" y1="16.5" x2="14.5" y2="16.5" stroke="#34a853" strokeWidth="2.2" strokeLinecap="round" />
                      <circle cx="16.2" cy="8.5" r="1.6" fill="#4285f4" />
                    </svg>
                    <span className="font-bold text-xl tracking-tight">
                      <span className="text-[#4285f4]">N</span>
                      <span className="text-[#ea4335]">e</span>
                      <span className="text-[#fbbc04]">w</span>
                      <span className="text-[#4285f4]">s</span>
                      <span className="text-[#34a853]">P</span>
                      <span className="text-[#ea4335]">r</span>
                      <span className="text-[#202124] dark:text-[#f8f9fa]">ess</span>
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-[#202124] dark:text-[#f8f9fa]">
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                  </h1>
                </div>

                {/* Google Sign-In Primary Option */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] px-4 border border-[#dadce0] dark:border-[#5f6368] rounded-full bg-white dark:bg-[#1a1c1e] hover:bg-[#f8fafd] dark:hover:bg-[#2e3135] text-[#202124] dark:text-[#f8f9fa] text-sm font-semibold flex items-center justify-center gap-2.5 cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#e0e3e7] dark:border-[#3c4043]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white dark:bg-[#242629] px-3 text-[#5f6368] dark:text-[#9aa0a6]">
                      or email
                    </span>
                  </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {mode === 'register' && (
                    <Input
                      label="Full Name"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                  )}

                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    leftIcon={<Mail className="w-4 h-4" />}
                  />

                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    leftIcon={<Lock className="w-4 h-4" />}
                  />

                  {error && (
                    <div className="p-3 rounded-xl google-surface-red border text-xs text-[#c5221f] dark:text-[#f28b82]">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={isSubmitting}
                  >
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>

                {/* Quick Demo Accounts */}
                <div className="pt-3 border-t border-[#e0e3e7] dark:border-[#3c4043] space-y-2">
                  <div className="text-[11px] font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                    Quick access
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {MOCK_USERS.slice(0, 3).map((u) => (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => {
                          switchSimulatedPersona(u.uid);
                          onSuccess();
                        }}
                        className={`min-h-[34px] px-3 rounded-full text-xs transition-colors cursor-pointer ${
                          u.uid === simulatedUserId
                            ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#173054] dark:text-[#8ab4f8] font-semibold'
                            : 'bg-[#f1f3f4] dark:bg-[#2e3135] text-[#3c4043] dark:text-[#dadce0] hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]'
                        }`}
                      >
                        {u.displayName.split('(')[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5f6368] dark:text-[#9aa0a6] pt-2 border-t border-[#e0e3e7] dark:border-[#3c4043]">
                  <span>{mode === 'signin' ? 'New here?' : 'Have an account?'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'signin' ? 'register' : 'signin');
                      setError(null);
                    }}
                    className="text-[#1a73e8] dark:text-[#8ab4f8] hover:underline font-semibold cursor-pointer py-1"
                  >
                    {mode === 'signin' ? 'Create Account' : 'Sign In'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6] space-x-3">
              <a href="/terms" className="hover:text-[#1a73e8]">Terms</a>
              <span aria-hidden="true">·</span>
              <a href="/privacy" className="hover:text-[#1a73e8]">Privacy</a>
              <span aria-hidden="true">·</span>
              <a href="/legal" className="hover:text-[#1a73e8]">Legal</a>
            </div>
          </div>
        </div>
      </div>

      <GoogleProfileOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        initialName={pendingGoogleUser.name}
        email={pendingGoogleUser.email}
        onSuccess={() => {
          setIsOnboardingOpen(false);
          onSuccess();
        }}
      />
    </div>
  );
};
