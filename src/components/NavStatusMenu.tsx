import { useRef, useEffect } from 'react';
import { FiCheck } from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import type { Company } from '../types';

type CompanyStatus = 'ativo' | 'pausado' | 'inativo';

const STATUS_PILL_COLORS: Record<CompanyStatus, string> = {
  ativo: '#30d158',
  pausado: '#ff9f0a',
  inativo: '#636366',
};

interface Props {
  companyId: string;
  pos: { x: number; y: number };
  companies: Company[];
  onClose: () => void;
}

export function NavStatusMenu({ companyId, pos, companies, onClose }: Props) {
  const { updateCompany } = useTaskStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const company = companies.find(c => c.id === companyId);
  const current = (company?.status ?? 'ativo') as CompanyStatus;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', left: pos.x, top: pos.y,
        background: 'var(--modal-bg)',
        borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        zIndex: 9999, overflow: 'hidden', minWidth: 130,
      }}
    >
      <div style={{ padding: '6px 10px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)' }}>
        Status
      </div>
      {(['ativo', 'pausado', 'inativo'] as CompanyStatus[]).map(s => (
        <button
          key={s}
          onClick={() => { updateCompany(companyId, { status: s }); onClose(); }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', background: current === s ? 'var(--s2)' : 'transparent',
            border: 'none', cursor: 'pointer', fontSize: 12,
            color: current === s ? 'var(--t1)' : 'var(--t2)',
            transition: 'background .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = current === s ? 'var(--s2)' : 'transparent'; }}
        >
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_PILL_COLORS[s], flexShrink: 0 }} />
          {s.charAt(0).toUpperCase() + s.slice(1)}
          {current === s && <FiCheck size={10} style={{ marginLeft: 'auto', color: '#64C4FF' }} />}
        </button>
      ))}
    </div>
  );
}
