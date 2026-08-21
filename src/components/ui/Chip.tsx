'use client';

/**
 * Chip seleccionable. Es el control base de casi todo el wizard.
 *
 * Los valores replican `chipStyle()` del diseño: 44px de alto mínimo (área
 * táctil), borde de 2px, amarillo cuando está seleccionado y 38 % de opacidad
 * cuando el paso ya llegó a su máximo de selecciones.
 */

interface ChipProps {
  label: string;
  seleccionado: boolean;
  /** `true` cuando el paso alcanzó su máximo y este chip no está seleccionado. */
  deshabilitado?: boolean;
  onClick: () => void;
}

export function Chip({ label, seleccionado, deshabilitado = false, onClick }: ChipProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={seleccionado}
      aria-disabled={deshabilitado}
      disabled={deshabilitado}
      onClick={onClick}
      className="inline-flex min-h-[44px] items-center rounded-pill border-2 px-4 py-[11px] font-body text-[14px] leading-[1.2] text-text-primary transition-[background-color,border-color,opacity] duration-150 ease-standard"
      style={{
        borderColor: seleccionado ? 'var(--color-burgundy)' : 'var(--border-soft)',
        background: seleccionado ? 'var(--color-yellow)' : 'var(--surface-card)',
        fontWeight: seleccionado ? 700 : 500,
        opacity: deshabilitado ? 0.38 : 1,
        cursor: deshabilitado ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}
