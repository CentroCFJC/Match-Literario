'use client';

import type { ReactNode } from 'react';

/**
 * Botón de acción principal (la píldora magenta de "Continuar", "Iniciar", …).
 *
 * `variante`:
 *   - `solido`   — fondo magenta, texto crema. El CTA por defecto.
 *   - `contorno` — transparente con borde burdeos, para la acción secundaria.
 *   - `oscuro`   — fondo burdeos, usado en "Mi agenda".
 */

interface BotonPrincipalProps {
  children: ReactNode;
  onClick?: () => void;
  deshabilitado?: boolean;
  variante?: 'solido' | 'contorno' | 'oscuro';
  className?: string;
  type?: 'button' | 'submit';
}

const ESTILOS = {
  solido: {
    background: 'var(--color-magenta)',
    color: 'var(--color-cream-white)',
    boxShadow: 'none',
    border: 'none',
  },
  contorno: {
    background: 'transparent',
    color: 'var(--color-burgundy)',
    boxShadow: 'inset 0 0 0 2px var(--color-burgundy)',
    border: 'none',
  },
  oscuro: {
    background: 'var(--color-burgundy)',
    color: 'var(--color-cream-white)',
    boxShadow: 'none',
    border: 'none',
  },
} as const;

export function BotonPrincipal({
  children,
  onClick,
  deshabilitado = false,
  variante = 'solido',
  className = '',
  type = 'button',
}: BotonPrincipalProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={deshabilitado}
      aria-disabled={deshabilitado}
      className={`flex min-h-[52px] w-full items-center justify-center gap-[10px] rounded-pill px-6 font-display text-[17px] font-bold transition-opacity duration-150 ease-standard ${className}`}
      style={{
        ...ESTILOS[variante],
        opacity: deshabilitado ? 0.45 : 1,
        cursor: deshabilitado ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
