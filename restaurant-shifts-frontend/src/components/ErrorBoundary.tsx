import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-bold">Щось пішло не так</h1>
          <p className="text-[var(--tg-hint)]">
            Спробуйте перезавантажити застосунок
          </p>
          <button
            type="button"
            className="btn-primary max-w-xs"
            onClick={() => window.location.reload()}
          >
            Перезавантажити
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
