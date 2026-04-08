import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureClientError } from '../../services/clientErrors';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  reportId: string | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    reportId: null,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return {
      hasError: true,
      reportId: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const report = captureClientError('error-boundary', error, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({ reportId: report.id });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoLogin = () => {
    window.location.assign('/login');
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
            App Error
          </p>
          <h1 className="mt-3 text-xl font-bold text-gray-900">Something went wrong.</h1>
          <p className="mt-2 text-sm text-gray-600">
            The app encountered an unexpected issue. A local crash report was captured so this can be investigated.
          </p>

          {this.state.reportId && (
            <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Report ID: {this.state.reportId}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Reload App
            </button>
            <button
              type="button"
              onClick={this.handleGoLogin}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }
}
