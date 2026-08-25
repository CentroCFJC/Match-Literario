/**
 * Cliente de Google Sheets (server-only).
 *
 * Centraliza la autenticación con la service account y el acceso a la API v4.
 * Se inicializa de forma perezosa (solo en la primera escritura) para que el
 * `npm run dev` sin credenciales siga sirviendo el catálogo mock: la lectura
 * todavía no toca Sheets, solo lo hace la escritura.
 *
 * La service account se define en `.env`:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY      (clave PEM en una línea, con `\n` escapados)
 */

import 'server-only';

import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

export type SheetsClient = sheets_v4.Sheets;

let cliente: SheetsClient | null = null;

/**
 * Devuelve (y cachea) el cliente de Sheets autenticado con la service account.
 *
 * Lanza si faltan las credenciales: la ruta que llama lo traduce a un 502 y el
 * cliente lo ignora, así que un despliegue sin configurar no tumba la app.
 */
export function getSheets(): SheetsClient {
  if (cliente) return cliente;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const clave = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !clave) {
    throw new Error(
      '[googleSheets] faltan credenciales: define GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY.',
    );
  }

  const auth = new google.auth.JWT({
    email,
    // En `.env` la clave va en una línea con `\n` literales; aquí se convierten
    // en saltos reales. Si ya viniera con saltos, el replace no hace nada.
    key: clave.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  cliente = google.sheets({ version: 'v4', auth });
  return cliente;
}

/**
 * Ejecuta `fn` con reintentos y backoff exponencial (por defecto 3 intentos:
 * espera 500ms, 1s y 2s entre ellos). Pensado para las escrituras, que pueden
 * fallar por cuota o por un pico de red; una lectura no lo necesita.
 */
export async function conReintento<T>(fn: () => Promise<T>, intentos = 3): Promise<T> {
  let ultimoError: unknown;

  for (let i = 0; i < intentos; i += 1) {
    try {
      return await fn();
    } catch (error) {
      ultimoError = error;
      if (i < intentos - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** i * 500));
      }
    }
  }

  throw ultimoError;
}
