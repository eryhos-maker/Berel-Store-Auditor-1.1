import React, { ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary Component to catch errors in the React Tree
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  // Explicitly declare props to satisfy TypeScript if inference fails
  declare props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 min-h-screen flex flex-col items-center justify-center text-red-900 font-sans">
          <div className="max-w-2xl w-full bg-white p-6 rounded-lg shadow-xl border-l-4 border-red-600">
            <h1 className="text-2xl font-bold mb-4">Algo salió mal (Application Error)</h1>
            <p className="mb-4 font-semibold">Se ha detectado un error inesperado. Por favor, toma una captura de pantalla y repórtalo.</p>
            <div className="bg-gray-100 p-4 rounded mb-6 border border-gray-200 overflow-auto max-h-96">
              <p className="font-bold text-red-700 font-mono text-sm mb-2">{this.state.error?.toString()}</p>
              <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                {this.state.error?.stack}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors shadow-lg"
            >
              Intentar Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);