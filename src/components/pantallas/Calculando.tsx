'use client';

/** Pantalla 9: animación de los dos libros y el corazón mientras corre el match. */
export function Calculando() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center px-10 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-[30px] h-[130px] w-[160px]" aria-hidden="true">
        <div className="flm-book-l absolute left-2 top-[34px] h-[66px] w-[52px] rounded-[6px_10px_10px_6px] border-l-[5px] border-burgundy bg-coral shadow-card" />
        <div className="flm-book-r absolute right-2 top-[34px] h-[66px] w-[52px] rounded-[10px_6px_6px_10px] border-r-[5px] border-burgundy bg-pink shadow-card" />
        <div className="flm-heart absolute left-1/2 top-1 ml-[-26px] flex h-[52px] w-[52px] items-center justify-center rounded-pill bg-magenta shadow-[0_8px_20px_-6px_var(--color-magenta)]">
          <span className="text-[26px] leading-none">❤</span>
        </div>
      </div>

      <h2 className="m-0 mb-[10px] text-balance font-display text-[23px] font-extrabold text-burgundy">
        Calculando tu match…
      </h2>
      <p className="m-0 font-body text-[15px] leading-[1.5] text-text-muted">
        Cruzando tus gustos con los autores de la feria…
      </p>
    </div>
  );
}
