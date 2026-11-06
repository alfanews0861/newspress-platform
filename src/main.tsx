import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in NewsPress app:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8fafd] dark:bg-[#202124] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-white dark:bg-[#292a2d] border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm text-left">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white font-sans">
                NewsPress Platform Notice
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              {this.state.error?.message || 'A runtime initialization error occurred. Please refresh.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs"
            >
              Reload Platform
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
