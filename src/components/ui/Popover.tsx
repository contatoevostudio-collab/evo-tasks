import { cloneElement, isValidElement, useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface PopoverProps {
  content: React.ReactNode;
  placement?: Placement;
  children: React.ReactElement;
  width?: number;
  trigger?: 'click' | 'hover';
}

/**
 * Balão de conteúdo clicável (não é tooltip — pode conter botões, forms).
 *   <Popover content={<ColorPicker />} placement="bottom">
 *     <button>Escolher cor</button>
 *   </Popover>
 */
export function Popover({ content, placement = 'bottom', children, width = 220, trigger = 'click' }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open || trigger !== 'click') return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, trigger]);

  if (!isValidElement(children)) return children;

  const pos = getPos(placement);

  const triggerEl = cloneElement(children as React.ReactElement<any>, {
    ...(trigger === 'click' ? { onClick: (e: React.MouseEvent) => { e.stopPropagation(); setOpen((o) => !o); } }
                             : { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false) }),
  });

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {triggerEl}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: pos.fromY }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: pos.fromY }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'absolute',
              ...pos.style,
              width,
              background: 'var(--s1)',
              border: '1px solid var(--b2)',
              borderRadius: 10,
              padding: 12,
              zIndex: 40,
              boxShadow: '0 12px 32px rgba(0,0,0,0.30)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

function getPos(p: Placement) {
  const gap = 8;
  switch (p) {
    case 'top':    return { style: { bottom: `calc(100% + ${gap}px)`, left: '50%', transform: 'translateX(-50%)' }, fromY: 4 };
    case 'bottom': return { style: { top: `calc(100% + ${gap}px)`, left: '50%', transform: 'translateX(-50%)' }, fromY: -4 };
    case 'left':   return { style: { right: `calc(100% + ${gap}px)`, top: '50%', transform: 'translateY(-50%)' }, fromY: 0 };
    case 'right':  return { style: { left: `calc(100% + ${gap}px)`, top: '50%', transform: 'translateY(-50%)' }, fromY: 0 };
  }
}
