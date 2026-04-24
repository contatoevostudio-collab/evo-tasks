import { useRef } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /** distância mínima (em px) para disparar */
  threshold?: number;
  /** delta perpendicular máximo antes de descartar o gesto (px) */
  tolerance?: number;
}

interface Handlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
}

/**
 * Hook para detectar swipe em mouse + touch.
 *
 *   const swipe = useSwipe({
 *     onSwipeLeft: () => next(),
 *     onSwipeRight: () => prev(),
 *     threshold: 50,
 *   });
 *
 *   <div {...swipe}>conteúdo</div>
 */
export function useSwipe(opts: SwipeHandlers): Handlers {
  const { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 40, tolerance = 60 } = opts;
  const start = useRef<{ x: number; y: number } | null>(null);

  const fire = (endX: number, endY: number) => {
    if (!start.current) return;
    const dx = endX - start.current.x;
    const dy = endY - start.current.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    start.current = null;

    if (ax > ay && ay <= tolerance) {
      if (dx <= -threshold) onSwipeLeft?.();
      else if (dx >= threshold) onSwipeRight?.();
    } else if (ay > ax && ax <= tolerance) {
      if (dy <= -threshold) onSwipeUp?.();
      else if (dy >= threshold) onSwipeDown?.();
    }
  };

  return {
    onTouchStart: (e) => { const t = e.touches[0]; start.current = { x: t.clientX, y: t.clientY }; },
    onTouchEnd:   (e) => { const t = e.changedTouches[0]; fire(t.clientX, t.clientY); },
    onMouseDown:  (e) => { start.current = { x: e.clientX, y: e.clientY }; },
    onMouseUp:    (e) => { fire(e.clientX, e.clientY); },
  };
}
