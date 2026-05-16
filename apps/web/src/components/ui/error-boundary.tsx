'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Algo deu errado</h2>
          <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="btn-primary"
          >
            Recarregar página
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-4 p-4 bg-red-50 rounded-lg text-xs text-red-700 max-w-lg overflow-auto">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
