import { cloneElement, isValidElement, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  placement?: Placement;
  delay?: number;
  children: React.ReactElement;
  disabled?: boolean;
}

/**
 * Hover tooltip. Envelope o elemento trigger:
 *   <Tooltip content="Editar"><button><FiEdit2 /></button></Tooltip>
 *
 * O trigger precisa ser um ReactElement (ex: <button>, não string).
 */
export function Tooltip({ content, placement = 'top', delay = 300, children, disabled }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  if (!isValidElement(children)) return children;

  const show = () => {
    if (disabled) return;
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setOpen(true), delay);
    setTimer(t);
  };
  const hide = () => {
    if (timer) clearTimeout(timer);
    setOpen(false);
  };

  const pos = getPlacement(placement);

  const trigger = cloneElement(children as React.ReactElement<any>, {
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  });

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      {trigger}
      <AnimatePresence>
        {open && content && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, ...pos.initialOffset }}
            animate={{ opacity: 1, scale: 1, ...pos.finalOffset }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            role="tooltip"
            style={{
              position: 'absolute',
              ...pos.style,
              background: 'var(--s1)',
              border: '1px solid var(--b2)',
              borderRadius: 6,
              padding: '5px 9px',
              fontSize: 11,
              color: 'var(--t1)',
              whiteSpace: 'nowrap',
              zIndex: 200, // var(--z-tooltip)
              pointerEvents: 'none',
              boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {content}
            {/* Arrow */}
            <span
              style={{
                position: 'absolute',
                width: 8, height: 8,
                background: 'var(--s1)',
                borderRight: '1px solid var(--b2)',
                borderBottom: '1px solid var(--b2)',
                ...pos.arrowStyle,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

function getPlacement(p: Placement) {
  const gap = 8;
  switch (p) {
    case 'top':
      return {
        style: { bottom: `calc(100% + ${gap}px)`, left: '50%', transform: 'translateX(-50%)' },
        initialOffset: { y: 4 }, finalOffset: { y: 0 },
        arrowStyle: { bottom: -5, left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
      };
    case 'bottom':
      return {
        style: { top: `calc(100% + ${gap}px)`, left: '50%', transform: 'translateX(-50%)' },
        initialOffset: { y: -4 }, finalOffset: { y: 0 },
        arrowStyle: { top: -5, left: '50%', transform: 'translateX(-50%) rotate(225deg)' },
      };
    case 'left':
      return {
        style: { right: `calc(100% + ${gap}px)`, top: '50%', transform: 'translateY(-50%)' },
        initialOffset: { x: 4 }, finalOffset: { x: 0 },
        arrowStyle: { right: -5, top: '50%', transform: 'translateY(-50%) rotate(-45deg)' },
      };
    case 'right':
      return {
        style: { left: `calc(100% + ${gap}px)`, top: '50%', transform: 'translateY(-50%)' },
        initialOffset: { x: -4 }, finalOffset: { x: 0 },
        arrowStyle: { left: -5, top: '50%', transform: 'translateY(-50%) rotate(135deg)' },
      };
  }
}
