'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

import { useMatchStore } from '@/store/useMatchStore';

/** Duración del toast, igual que en el diseño. */
const DURACION_MS = 1800;

/**
 * Aviso efímero sobre el contenido ("Valentina Ríos añadida a tu agenda").
 * Se auto-cierra; vive en la capa más alta de la pantalla.
 */
export function Toast() {
  const toast = useMatchStore((estado) => estado.toast);
  const mostrarToast = useMatchStore((estado) => estado.mostrarToast);

  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => mostrarToast(null), DURACION_MS);
    return () => clearTimeout(temporizador);
  }, [toast, mostrarToast]);

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-[96px] left-6 right-6 z-30 rounded-[14px] bg-ink px-[18px] py-[13px] text-center font-body text-[14px] text-cream-white shadow-raised"
        >
          {toast}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
