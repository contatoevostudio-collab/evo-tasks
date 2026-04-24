import type { CSSProperties } from 'react';

interface RowActionsProps {
  children: React.ReactNode;
  /** Sempre visível (sem hover-only). Default: false. */
  alwaysVisible?: boolean;
  gap?: number;
  style?: CSSProperties;
}

/**
 * Wrapper para ações de linha (editar/excluir/duplicar) em tabelas e listas.
 * Por padrão aparece só no hover do pai — o pai precisa ter a classe
 * `row-actions-host` (ou fazer show manual via group-hover no estilo).
 *
 * Uso:
 *   <div className="row-actions-host">
 *     ...conteúdo da linha...
 *     <RowActions>
 *       <button onClick={edit}><FiEdit2 /></button>
 *       <button onClick={remove}><FiTrash2 /></button>
 *     </RowActions>
 *   </div>
 */
export function RowActions({ children, alwaysVisible, gap = 4, style }: RowActionsProps) {
  return (
    <div
      className={alwaysVisible ? undefined : 'row-actions'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap,
        opacity: alwaysVisible ? 1 : 0,
        transition: 'opacity .15s var(--ease-out, cubic-bezier(.4,0,.2,1))',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
