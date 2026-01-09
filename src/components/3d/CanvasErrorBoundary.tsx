import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Html } from '@react-three/drei';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.warn('Canvas error caught:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            // Fallback inside Canvas must be 3D or HTML
            return (
                <Html center>
                    <div className="bg-red-900/90 text-white p-4 rounded border border-red-700 backdrop-blur-md max-w-sm text-center">
                        <h3 className="font-bold mb-2">Erro na Cena 3D</h3>
                        <p className="text-xs mb-3 opacity-80">
                            {this.state.error?.message || 'Falha ao renderizar objetos 3D'}
                        </p>
                        <button
                            onClick={() => this.setState({ hasError: false })}
                            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded"
                        >
                            Tentar novamente
                        </button>
                    </div>
                </Html>
            );
        }

        return this.props.children;
    }
}
