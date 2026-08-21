/**
 * Generación del `session_id`.
 *
 * NO se usa `crypto.randomUUID()` a secas: esa función solo existe en
 * **contextos seguros** (HTTPS o localhost). En cuanto la app se sirve por HTTP
 * plano —una prueba desde el móvil contra la IP de la red local, una preview
 * interna— `crypto.randomUUID` es `undefined` y la app se cae en el primer toque
 * de INICIAR.
 *
 * Y tampoco es solo un problema de desarrollo: `randomUUID` llegó en Safari 15.4
 * (2022) y Chrome 92, así que en teléfonos viejos fallaría incluso por HTTPS. En
 * una feria con miles de visitantes de todo tipo de dispositivo, eso son
 * sesiones perdidas.
 *
 * La cascada es: `randomUUID` → `getRandomValues` (que sí existe en contextos no
 * seguros y desde hace mucho más tiempo) → `Math.random()` como último recurso.
 * El valor siempre tiene forma de UUID v4 válido, que es lo que valida
 * `esquemaRespuesta` antes de escribir en la hoja.
 */

/** UUID v4 en formato canónico `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`. */
export function uuidV4(): string {
  const cripto: Crypto | undefined = globalThis.crypto;

  if (typeof cripto?.randomUUID === 'function') {
    return cripto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof cripto?.getRandomValues === 'function') {
    cripto.getRandomValues(bytes);
  } else {
    // Último recurso. `Math.random()` no es criptográficamente seguro, pero para
    // un identificador anónimo de sesión —que solo necesita no chocar con el de
    // otra persona— es suficiente, y es mejor que no poder usar la app.
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Bits fijos que marcan la versión 4 y la variante RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
