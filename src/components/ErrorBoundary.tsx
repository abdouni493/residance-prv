import { Component, type ReactNode } from 'react';

interface State { hasError: boolean; }

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error: Error) {
    console.error('Page error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-ink-secondary">Une erreur est survenue.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg"
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
