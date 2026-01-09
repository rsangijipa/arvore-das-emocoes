import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.warn('Global error caught:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950 text-white p-6 z-50">
                    <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-2xl">
                        <h2 className="text-2xl font-serif text-red-400 mb-4">Algo deu errado</h2>
                        <p className="text-zinc-400 mb-6">
                            Ocorreu um erro inesperado na aplicação.
                        </p>

                        <div className="bg-zinc-950 p-4 rounded border border-zinc-800 mb-6 overflow-auto max-h-48">
                            <code className="text-xs text-red-300 font-mono">
                                {this.state.error?.message || 'Erro desconhecido'}
                            </code>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 px-4 bg-white text-black font-medium rounded hover:bg-zinc-200 transition-colors"
                        >
                            Recarregar Aplicação
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
