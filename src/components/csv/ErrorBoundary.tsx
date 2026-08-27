import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CSV Cleaner UI Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#ffdad6]/40 border border-[#ba1a1a] rounded-2xl p-8 text-center max-w-xl mx-auto my-12 space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#ffdad6] text-[#ba1a1a] mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">warning</span>
          </div>
          <h3 className="text-xl font-bold text-[#410002] font-display">Something went wrong</h3>
          <p className="text-xs text-[#5f2f00]">
            An unforeseen interface error occurred while rendering data: {this.state.error?.message}
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem('csv_cleaner_active_session');
              window.location.reload();
            }}
            className="bg-[#012d1d] text-white text-xs font-semibold uppercase tracking-wider px-6 py-2.5 rounded-lg hover:bg-[#1b4332]"
          >
            Reset Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
