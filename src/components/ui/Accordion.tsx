import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';

export interface AccordionItemData {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
}

interface AccordionProps {
  items: AccordionItemData[];
  allowMultiple?: boolean;
}

/**
 * Lista de itens colapsáveis. Por padrão apenas um pode estar aberto.
 *   <Accordion items={[{ id: 'q1', title: 'Como...', content: <p>...</p> }]} />
 */
export function Accordion({ items, allowMultiple }: AccordionProps) {
  const [openSet, setOpenSet] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.defaultOpen).map((i) => i.id)),
  );

  const toggle = (id: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item) => {
        const open = openSet.has(item.id);
        return (
          <div
            key={item.id}
            style={{
              background: 'var(--s1)',
              border: '1px solid var(--b2)',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={open}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--t1)',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'left',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{item.title}</div>
                {item.subtitle && (
                  <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 400, marginTop: 2 }}>
                    {item.subtitle}
                  </div>
                )}
              </div>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'flex', color: 'var(--t3)' }}
              >
                <FiChevronDown size={14} />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '0 14px 14px', color: 'var(--t2)', fontSize: 12, lineHeight: 1.5 }}>
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
