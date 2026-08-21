'use client';

/**
 * Opción en formato tarjeta, con título y subtítulo.
 * Solo la usa el paso 4 ("¿Cómo te gusta leer?"), que en el diseño usa
 * `layout: 'cards'` en vez de chips.
 */

interface OpcionTarjetaProps {
  label: string;
  hint?: string;
  seleccionada: boolean;
  onClick: () => void;
}

export function OpcionTarjeta({ label, hint, seleccionada, onClick }: OpcionTarjetaProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionada}
      onClick={onClick}
      className="w-full rounded-m border-2 px-[18px] py-4 text-left transition-all duration-150 ease-standard"
      style={{
        borderColor: seleccionada ? 'var(--color-burgundy)' : 'var(--border-soft)',
        background: seleccionada ? 'var(--color-cream)' : 'var(--surface-card)',
        boxShadow: seleccionada ? 'var(--shadow-card)' : 'none',
      }}
    >
      <span className="block font-display text-[17px] font-bold text-ink">{label}</span>
      {hint ? (
        <span className="mt-[3px] block font-body text-[13px] text-text-muted">{hint}</span>
      ) : null}
    </button>
  );
}
