/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Login & Google Authentication
 * Alfa New Gen Platforms - Google Sign-In & Comprehensive Profile Onboarding
 */

import React, { useState } from 'react';
import { Newspaper, Mail, Lock, ShieldCheck, UserCheck, Sparkles, ArrowRight, Building2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { MOCK_USERS, MOCK_TENANTS } from '../../services/mockDataService';
import { isFirebaseConfigured } from '../../config/firebase';
import { GoogleProfileOnboardingModal } from '../../components/auth/GoogleProfileOnboardingModal';
import { UserPortalService } from '../../services/userPortalService';

export interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, switchSimulatedPersona, simulatedUserId } = useAuth();
  const { currentTenant } = useTenant();

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
      const msg = err instanceof Error ? err.message : 'Authentication failed';
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
      // Check onboarding
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
    } catch (err: unknown) {
      // In offline/demo mode, launch onboarding modal for user to fill details
      setPendingGoogleUser({
        name: displayName,
        email: email,
      });
      setIsOnboardingOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafd] dark:bg-[#202124] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-sans font-bold text-2xl shadow-md mb-3">
          AL
        </div>
        <h2 className="text-2xl font-bold font-sans text-slate-900 dark:text-white tracking-tight">
          Alfa New Gen Platforms
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-1">
          Cloud Newsroom, Digital ePaper, YouTube Studio & Marketplace
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-8 shadow-xl space-y-6">
          {/* Persona Fast Switcher for Developer Review */}
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300 space-y-2 font-sans">
            <div className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Interactive Role Persona Fast-Track</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal font-sans">
              Select an accredited persona to test role-based access control and tenant isolation immediately:
            </p>
            <div className="grid grid-cols-1 gap-1.5 pt-1">
              {MOCK_USERS.slice(0, 3).map((u) => (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => {
                    switchSimulatedPersona(u.uid);
                    onSuccess();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-left text-xs font-sans transition-colors flex items-center justify-between cursor-pointer ${
                    u.uid === simulatedUserId
                      ? 'bg-blue-600 text-white font-medium shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="truncate">{u.displayName.split('(')[0]}</span>
                  <span className="text-[11px] opacity-75 capitalize">{u.platformRole !== 'none' ? u.platformRole : 'newsroom'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Full Name & Byline"
                placeholder="e.g. Johnathan Miller"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            )}

            <Input
              label="Newsroom Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            />

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-sans">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center"
              isLoading={isSubmitting}
            >
              {mode === 'signin' ? 'Sign In to Newsroom' : 'Create Publisher Account'}
            </Button>

            {/* Google Sign In Button */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google Sign-In & Complete Profile</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-xs font-sans text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800">
            <span>
              {mode === 'signin' ? "Don't have an account?" : 'Already accredited?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'register' : 'signin');
                setError(null);
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
            >
              {mode === 'signin' ? 'Register Newsroom' : 'Sign In'}
            </button>
          </div>
        </div>

        {/* Footer Links to Alfa New Gen Policies */}
        <div className="mt-6 text-center text-xs text-slate-500 space-x-3">
          <a href="/terms" className="hover:underline">Terms of Service</a>
          <span>•</span>
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          <span>•</span>
          <a href="/legal" className="hover:underline">Safe Harbor & Legal</a>
        </div>
      </div>

      {/* Google Profile Onboarding Modal */}
      <GoogleProfileOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        initialName={pendingGoogleUser.name}
        initialEmail={pendingGoogleUser.email}
        onSuccess={() => {
          setIsOnboardingOpen(false);
          onSuccess();
        }}
      />
    </div>
  );
};
