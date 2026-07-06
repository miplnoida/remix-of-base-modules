import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logApplicationError } from '@/lib/globalErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error | null) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Auto-recover from stale lazy-chunk errors after a deploy by reloading once.
    const msg = String(error?.message || '');
    const isChunkError =
      /Loading chunk [\d]+ failed/i.test(msg) ||
      /Loading CSS chunk/i.test(msg) ||
      /dynamically imported module/i.test(msg) ||
      /Failed to fetch dynamically imported module/i.test(msg) ||
      error?.name === 'ChunkLoadError';
    if (isChunkError) {
      const KEY = '__chunk_reload_attempted__';
      try {
        if (!sessionStorage.getItem(KEY)) {
          sessionStorage.setItem(KEY, '1');
          window.location.reload();
          return;
        }
      } catch {
        // ignore storage failures and fall through to error UI
      }
    }

    // Log to system_error_logs using global error handler
    this.logError(error, errorInfo);
  }

  async logError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      // Create a new error with enriched stack trace including component info
      const enrichedError = new Error(error.message);
      enrichedError.stack = `${error.stack}\n\nComponent Stack:\n${errorInfo.componentStack}`;
      enrichedError.name = error.name;
      
      await logApplicationError(enrichedError, {
        module: 'ERROR_BOUNDARY',
        action: 'react_render_error',
      });
    } catch (logError) {
      console.error('Failed to log error to system:', logError);
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-muted p-4 rounded-lg overflow-auto max-h-48">
                  <p className="font-mono text-sm text-destructive">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={this.handleGoHome}>
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
                <Button onClick={this.handleReload}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
