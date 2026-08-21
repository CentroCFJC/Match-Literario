/**
 * Azar reproducible.
 *
 * El §6.4 del prompt maestro pide elegir los comodines de serendipia "al azar
 * entre candidatos válidos". Un `Math.random()` normal rompería dos cosas:
 *
 *   · "Mi último match" — al volver a abrir la app, el resultado guardado y el
 *     recalculado dejarían de coincidir y saldrían otros autores.
 *   · La reproducibilidad del motor, que hoy está cubierta por tests.
 *
 * La solución es sembrar el azar con el `session_id`: cada persona recibe una
 * selección distinta, pero la misma persona recibe siempre la suya. El motor
 * sigue siendo una función pura de sus entradas.
 */

/**
 * Hash de 32 bits de una cadena (variante de FNV-1a). Determinista y sin
 * dependencias: el mismo texto da siempre la misma semilla.
 */
export function semillaDesdeTexto(texto: string): number {
  let hash = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // `>>> 0` lo deja como entero sin signo.
  return hash >>> 0;
}

/**
 * Generador pseudoaleatorio `mulberry32`: rápido, sin estado global y con buena
 * distribución para lo que necesitamos (barajar una lista corta).
 * Devuelve una función que da números en [0, 1).
 */
export function generadorAleatorio(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Baraja de Fisher-Yates con un generador dado. No muta la lista original.
 */
export function barajar<T>(lista: readonly T[], aleatorio: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
