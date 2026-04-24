import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  /** fallback customizado. Se omitido, usa UI padrão. */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
  /** callback ao capturar erro (ex: enviar pra Sentry) */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/**
 * Captura erros de render nos componentes filhos e renderiza fallback
 * em vez de quebrar a tela inteira (que aparece como "tela preta").
 *
 * Uso (envelope a página no topo):
 *   <ErrorBoundary onError={(e) => console.error(e)}>
 *     <FinancePage />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }
      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 16,
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'rgba(255,69,58,0.14)',
        border: '1px solid rgba(255,69,58,0.3)',
        color: '#ff453a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 24px -6px rgba(255,69,58,0.45)',
      }}>
        <FiAlertTriangle size={24} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>
          Algo quebrou
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', maxWidth: 440, lineHeight: 1.5 }}>
          Essa parte do app encontrou um erro e não pôde renderizar. Você pode tentar
          recarregar — se persistir, o erro foi registrado.
        </div>
      </div>
      <button
        onClick={() => { reset(); location.reload(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 20px', borderRadius: 10,
          background: 'var(--s1)', border: '1px solid var(--b2)',
          color: 'var(--t1)', fontSize: 12, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <FiRefreshCw size={12} /> Recarregar
      </button>
      <details style={{ marginTop: 14, fontSize: 10, color: 'var(--t4)', maxWidth: 560 }}>
        <summary style={{ cursor: 'pointer' }}>Detalhes técnicos</summary>
        <pre style={{
          marginTop: 8, textAlign: 'left',
          background: 'var(--s1)', padding: 10, borderRadius: 8,
          overflow: 'auto', fontSize: 10, color: 'var(--t3)',
        }}>
          {error.name}: {error.message}
          {'\n'}
          {error.stack?.split('\n').slice(0, 4).join('\n')}
        </pre>
      </details>
    </div>
  );
}
