'use client';

import { motion } from 'framer-motion';

import { IconoFlechaIzquierda } from '@/components/ui/iconos';
import { TOTAL_PASOS } from '@/lib/pasos';

/**
 * Cabecera compartida por los 8 pasos: botón de volver, barra de progreso
 * animada y contador "3/08".
 */

interface CabeceraPasoProps {
  numero: number;
  titulo: string;
  ayuda?: string;
  onVolver: () => void;
}

export function CabeceraPaso({ numero, titulo, ayuda, onVolver }: CabeceraPasoProps) {
  const porcentaje = (numero / TOTAL_PASOS) * 100;

  return (
    <div className="flex-shrink-0 px-6 pb-1 pt-2">
      <div className="mb-[14px] flex items-center gap-[14px]">
        <button
          type="button"
          onClick={onVolver}
          aria-label="Volver al paso anterior"
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-pill border-none bg-surface-card text-burgundy shadow-card"
        >
          <IconoFlechaIzquierda tamano={20} />
        </button>
        <div
          className="h-[6px] flex-1 overflow-hidden rounded-pill bg-cream"
          role="progressbar"
          aria-valuenow={numero}
          aria-valuemin={1}
          aria-valuemax={TOTAL_PASOS}
          aria-label={`Paso ${numero} de ${TOTAL_PASOS}`}
        >
          <motion.div
            className="h-full rounded-pill bg-magenta"
            initial={false}
            animate={{ width: `${porcentaje}%` }}
            transition={{ duration: 0.28, ease: [0.22, 0.9, 0.32, 1] }}
          />
        </div>
        <span className="flex-shrink-0 font-display text-[13px] font-bold text-text-muted">
          {numero}/{String(TOTAL_PASOS).padStart(2, '0')}
        </span>
      </div>
      <h2 className="m-0 mb-1 text-balance font-display text-[25px] font-extrabold leading-[1.12] text-ink">
        {titulo}
      </h2>
      {ayuda ? <p className="m-0 font-body text-[13px] text-text-muted">{ayuda}</p> : null}
    </div>
  );
}
