/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Newspaper, Mail, Lock, ShieldCheck, UserCheck, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { MOCK_USERS, MOCK_TENANTS } from '../../services/mockDataService';
import { isFirebaseConfigured } from '../../config/firebase';

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
      await loginWithGoogle();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafd] dark:bg-[#202124] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-sans font-bold text-2xl shadow-md mb-3">
          NP
        </div>
        <h2 className="text-2xl font-semibold font-sans text-slate-900 dark:text-white tracking-tight">
          NewsPress Platform
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-1">
          Multi-Tenant Newspaper Production & Marketplace SaaS
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
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

            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              Sign In with Google
            </Button>
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
      </div>
    </div>
  );
};
