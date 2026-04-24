import { motion } from 'framer-motion';
import { Children } from 'react';

interface StaggerProps {
  children: React.ReactNode;
  /** delay entre filhos, em segundos */
  delay?: number;
  /** delay inicial antes do primeiro */
  initialDelay?: number;
  /** offset vertical em px (padrão: 8) */
  y?: number;
  /** classe/estilo do wrapper */
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Envelope que faz os filhos entrarem em sequência com fade + slide-up.
 * Útil em listas, grids de cards, linhas de tabela.
 *
 *   <Stagger delay={0.04}>
 *     {items.map((item) => <Card key={item.id} {...item} />)}
 *   </Stagger>
 */
export function Stagger({
  children, delay = 0.04, initialDelay = 0, y = 8, style, className,
}: StaggerProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: delay, delayChildren: initialDelay } },
      }}
    >
      {Children.map(children, (child, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y },
            show:   { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
