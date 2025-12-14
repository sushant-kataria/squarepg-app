import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { db } from '../db';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleHardReset = async () => {
    if (window.confirm('This will clear all local data and reset the app. Are you sure?')) {
        try {
            await db.delete();
            localStorage.clear();
            window.location.href = '/';
        } catch (e) {
            console.error("Failed to delete DB", e);
            localStorage.clear();
            window.location.href = '/';
        }
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-xl p-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-6">
              We encountered an unexpected error. Usually, refreshing the page fixes this.
            </p>
            
            {this.state.error && (
                <div className="mb-6 p-3 bg-secondary/50 rounded text-xs text-left font-mono overflow-auto max-h-32">
                    {this.state.error.toString()}
                </div>
            )}

            <div className="flex flex-col gap-3">
                <button 
                  onClick={this.handleReset}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
                <button 
                  onClick={this.handleHardReset}
                  className="w-full bg-transparent text-destructive border border-destructive/20 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-destructive/5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset App Data
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;