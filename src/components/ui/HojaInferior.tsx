'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Hoja que sube desde abajo sobre un fondo oscurecido — el patrón del modal de
 * autor y de las tres hojas opcionales del diseño.
 *
 * El cierre con Escape NO se maneja aquí sino en `AppMatchLiterario`, porque
 * cuando hay varias capas abiertas importa el orden (compartir → modal →
 * cuéntanos más → feedback), igual que en el diseño.
 */

interface HojaInferiorProps {
  children: ReactNode;
  onCerrar: () => void;
  /** Altura máxima de la hoja como porcentaje del alto disponible. */
  altoMaximo?: string;
  /** `z-index`: el modal de autor va en 20 y las hojas encima. */
  zIndex?: number;
  etiqueta: string;
}

export function HojaInferior({
  children,
  onCerrar,
  altoMaximo = '92%',
  zIndex = 20,
  etiqueta,
}: HojaInferiorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onCerrar}
      className="absolute inset-0 flex flex-col justify-end"
      style={{ zIndex, background: 'rgba(40, 14, 20, 0.55)' }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: [0.22, 0.9, 0.32, 1] }}
        onClick={(evento) => evento.stopPropagation()}
        className="no-scrollbar overflow-y-auto rounded-t-[28px] bg-surface-page"
        style={{ maxHeight: altoMaximo }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Manija gris de las hojas opcionales. */
export function ManijaHoja() {
  return <div className="mx-auto mb-4 h-[5px] w-10 rounded-pill bg-[var(--border-soft)]" />;
}
