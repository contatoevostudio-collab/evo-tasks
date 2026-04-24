import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome, FiCalendar, FiBriefcase, FiTrendingUp, FiList,
  FiDollarSign, FiZap, FiMoreHorizontal, FiX, FiFileText,
} from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import type { PageType } from '../types';

interface NavItem {
  id: PageType;
  label: string;
  Icon: React.ElementType;
}

const PRIMARY: NavItem[] = [
  { id: 'home',     label: 'Home',      Icon: FiHome },
  { id: 'tarefas',  label: 'Calendário', Icon: FiCalendar },
  { id: 'financas', label: 'Finanças',  Icon: FiDollarSign },
  { id: 'empresas', label: 'Empresas',  Icon: FiBriefcase },
];

const SECONDARY: NavItem[] = [
  { id: 'crm',       label: 'CRM',       Icon: FiTrendingUp },
  { id: 'todo',      label: 'To Do',     Icon: FiList },
  { id: 'ideias',    label: 'Ideias',    Icon: FiZap },
  { id: 'propostas', label: 'Propostas', Icon: FiFileText },
];

const hexToRgb = (hex: string): string => {
  const v = hex.replace('#', '');
  const c = v.length === 3 ? v.split('').map(x => x + x).join('') : v;
  return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
};

interface Props {
  currentPage: PageType;
  onChangePage: (p: PageType) => void;
}

/**
 * Barra de navegação inferior para mobile. Visível apenas em <=700px via CSS.
 * Mostra 4 páginas principais + botão "Mais" que abre um sheet com as demais.
 */
export function MobileBottomNav({ currentPage, onChangePage }: Props) {
  const { accentColor } = useTaskStore();
  const accentRgb = hexToRgb(accentColor);
  const [moreOpen, setMoreOpen] = useState(false);

  const inSecondary = SECONDARY.some((s) => s.id === currentPage);

  return (
    <>
      {/* Bottom nav bar */}
      <nav
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 40,
          background: 'var(--sidebar-bg, rgba(8,12,30,0.92))',
          borderTop: '1px solid var(--b2)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '6px 4px calc(6px + env(safe-area-inset-bottom))',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.28)',
        }}
      >
        {PRIMARY.map((item) => (
          <NavButton key={item.id} item={item} active={currentPage === item.id} accentColor={accentColor} accentRgb={accentRgb} onClick={() => onChangePage(item.id)} />
        ))}

        {/* More */}
        <button
          onClick={() => setMoreOpen(true)}
          aria-label="Mais"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: 'transparent', border: 'none',
            cursor: 'pointer',
            color: inSecondary ? accentColor : 'var(--t3)',
            padding: '6px 10px 2px',
            flex: 1,
          }}
        >
          <FiMoreHorizontal size={20} />
          <span style={{ fontSize: 9, fontWeight: 700 }}>Mais</span>
        </button>
      </nav>

      {/* More sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMoreOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'flex-end',
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              style={{
                width: '100%', background: 'var(--modal-bg)',
                borderTop: '1px solid var(--b2)',
                borderTopLeftRadius: 18, borderTopRightRadius: 18,
                padding: '18px 16px calc(18px + env(safe-area-inset-bottom))',
                backdropFilter: 'blur(20px) saturate(1.6)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Outras páginas</span>
                <button onClick={() => setMoreOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4, display: 'flex' }}>
                  <FiX size={16} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {SECONDARY.map((item) => {
                  const active = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onChangePage(item.id); setMoreOpen(false); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '14px 8px', borderRadius: 12,
                        background: active ? `rgba(${accentRgb}, 0.14)` : 'var(--s1)',
                        border: `1px solid ${active ? accentColor : 'var(--b2)'}`,
                        color: active ? accentColor : 'var(--t2)',
                        cursor: 'pointer',
                      }}
                    >
                      <item.Icon size={20} />
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavButton({ item, active, accentColor, accentRgb, onClick }: {
  item: NavItem;
  active: boolean;
  accentColor: string;
  accentRgb: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={item.label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        background: 'transparent', border: 'none',
        cursor: 'pointer',
        color: active ? accentColor : 'var(--t3)',
        padding: '6px 10px 2px',
        flex: 1,
        position: 'relative',
      }}
    >
      <item.Icon size={20} style={{
        filter: active ? `drop-shadow(0 0 6px rgba(${accentRgb}, 0.6))` : 'none',
      }} />
      <span style={{ fontSize: 9, fontWeight: 700 }}>{item.label}</span>
      {active && (
        <span style={{
          position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
          width: 18, height: 2, borderRadius: 2,
          background: accentColor, boxShadow: `0 0 8px ${accentColor}`,
        }} />
      )}
    </button>
  );
}
