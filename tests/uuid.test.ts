/**
 * `session_id` en navegadores sin `crypto.randomUUID`.
 *
 * Esto salió probando desde un móvil contra la IP de la red local: por HTTP
 * plano el contexto no es seguro, `crypto.randomUUID` no existe y la app se caía
 * en el primer toque de INICIAR. Los tests recorren las tres ramas de la
 * cascada para que no vuelva a pasar.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { uuidV4 } from '@/lib/uuid';

const FORMATO_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const cripto = globalThis.crypto;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('uuidV4', () => {
  it('usa crypto.randomUUID cuando está disponible', () => {
    const espia = vi.spyOn(cripto, 'randomUUID');
    expect(uuidV4()).toMatch(FORMATO_UUID_V4);
    expect(espia).toHaveBeenCalled();
  });

  /** Sustituye `globalThis.crypto` mientras corre `accion`. */
  const conCrypto = <T,>(sustituto: unknown, accion: () => T): T => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { value: sustituto, configurable: true });
    try {
      return accion();
    } finally {
      if (original) Object.defineProperty(globalThis, 'crypto', original);
    }
  };

  it('cae a getRandomValues sin contexto seguro (HTTP en la red local)', () => {
    // Así se ve `crypto` por HTTP plano: existe, pero sin `randomUUID`.
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      cripto.getRandomValues(bytes);
      return bytes;
    });
    const generado = conCrypto({ getRandomValues }, uuidV4);

    expect(generado).toMatch(FORMATO_UUID_V4);
    expect(getRandomValues).toHaveBeenCalled();
  });

  it('cae a Math.random si tampoco hay Web Crypto', () => {
    expect(conCrypto(undefined, uuidV4)).toMatch(FORMATO_UUID_V4);
  });

  it('sigue dando identificadores únicos sin Web Crypto', () => {
    const generados = conCrypto(undefined, () =>
      new Set(Array.from({ length: 1000 }, uuidV4)),
    );
    expect(generados.size).toBe(1000);
  });

  it('marca siempre versión 4 y variante RFC 4122', () => {
    for (let i = 0; i < 200; i += 1) {
      const generado = uuidV4();
      expect(generado[14]).toBe('4');
      expect(['8', '9', 'a', 'b']).toContain(generado[19]);
    }
  });

  it('no repite identificadores', () => {
    const generados = new Set(Array.from({ length: 2000 }, uuidV4));
    expect(generados.size).toBe(2000);
  });

  it('el resultado pasa la validación de la API', async () => {
    const { z } = await import('zod');
    const esquema = z.string().uuid();
    for (let i = 0; i < 100; i += 1) {
      expect(esquema.safeParse(uuidV4()).success).toBe(true);
    }
  });
});
