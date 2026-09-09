'use client';

import type { ReactNode } from 'react';

/**
 * Contenedor compartido de la app. Es el único sitio donde se decide el ancho y
 * el alto de la superficie: las pantallas solo trabajan dentro de él con `h-full`
 * y superponen sus hojas modales con `absolute inset-0`.
 *
 * En móvil la app ocupa toda la pantalla. En escritorio NO se simula un
 * dispositivo: no hay bisel, ni notch, ni barra de estado falsa. El contenido
 * se centra en una columna cómoda (448px, el ancho del diseño con algo de aire)
 * y el fondo propio de la app se extiende a todo el viewport por detrás, de modo
 * que la vista ancha se lee como una versión centrada de la app y no como una
 * maqueta flotando sobre un lienzo vacío.
 */

interface ContenedorAppProps {
  children: ReactNode;
  /**
   * Clase de fondo de la pantalla actual. Sigue decidiéndose en un solo sitio
   * —la tabla de `AppMatchLiterario`—, y aquí se aplica al lienzo entero para
   * que el color llegue a sangre también en escritorio, y no quede la columna
   * de 448px flotando sobre un fondo distinto.
   */
  fondo?: string;
}

export function ContenedorApp({ children, fondo = 'bg-surface-page' }: ContenedorAppProps) {
  return (
    // El fondo de la app, a sangre en todo el viewport.
    <div className={`min-alto-pantalla flex w-full justify-center ${fondo}`}>
      {/*
        `relative` ancla las hojas modales y el toast.
        `overflow-hidden` recorta la hoja mientras entra desde abajo.
        El safe area solo tiene efecto en móviles con notch; en escritorio es 0.
        `alto-pantalla` es `100dvh` con respaldo a `100vh` (ver `globals.css`).
      */}
      <div className="alto-pantalla relative flex w-full max-w-md flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
        {children}
      </div>
    </div>
  );
}
