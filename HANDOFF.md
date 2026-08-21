# HANDOFF — Fase 1 → Fase 2 (conexión con Google Sheets)

Hola. Yo hice el frontend y la arquitectura. Este documento es para ti, que
conectas los datos reales de Google Sheets.

**Resumen en dos frases:** el proyecto ya está estructurado contra las hojas
reales de Drive (columna por columna, fila de encabezado por fila de encabezado).
Solo quedan **cuatro funciones** que rellenar, todas en **un archivo**
(`src/lib/data/source.ts`); el parseo de filas y la serialización ya están
escritos y probados.

> **El dashboard/panel de administración y el despliegue NO son tu tarea.**
> Van en la fase 3, con la tercera persona del relevo.

---

## 1. Qué está listo

| Área | Estado |
|---|---|
| Next.js 15 (App Router) + TypeScript + Tailwind + Framer Motion | ✅ |
| Las 14 pantallas del diseño como componentes React funcionales | ✅ |
| Wizard de 8 pasos: máximos, comodín, progreso, días derivados de la data | ✅ |
| Motor de match con los pesos, la curva, el λ y la serendipia del prompt maestro | ✅ |
| Agenda con actividades de varios autores y detección de cruces | ✅ |
| Compartir por WhatsApp y correo | ✅ |
| Estado en Zustand persistido en `localStorage` | ✅ |
| Tipos TS de las 5 pestañas reales (`Autores`, `Actividades`, `Respuestas`, `Feedback`) | ✅ |
| Parseo de filas reales, con sus rarezas (ver §5) | ✅ |
| Serialización con el orden exacto de columnas | ✅ |
| Telemetría implícita completa (§7.5 del prompt maestro) | ✅ |
| `GET /api/catalogo` y `POST /api/respuestas` con validación definitiva | ✅ |
| 120 tests (match, agenda, serendipia y contrato con Sheets) | ✅ |
| **Llamadas reales a `googleapis`** | ❌ **← tu parte** |
| Panel de administración y despliegue | ❌ (fase 3, otra persona) |

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 120 tests
npm run typecheck
```

Hoy funciona de punta a punta con 20 autores y 30 actividades de ejemplo que
imitan la forma de la hoja real.

---

## 2. Lo único que tienes que tocar

### `src/lib/data/source.ts`

```ts
export async function getAutores(): Promise<Autor[]>
export async function getActividades(): Promise<Actividad[]>
export async function saveRespuesta(entrada, contexto): Promise<Respuesta>
export async function saveFeedback(fila): Promise<FilaFeedback>
```

Cámbiales el cuerpo. **No cambies las firmas.** Cada una lleva su contrato y su
`// TODO: reemplazar con lectura/escritura real de Google Sheets` con la llamada
concreta que hace falta. Compruébalo con:

```bash
grep -rn "reemplazar con lectura/escritura real" src/
```

**Ya está hecho por ti** (probado, no lo reescribas):

| Qué | Dónde |
|---|---|
| Rangos A1 con la fila de encabezados descontada | `RANGOS` en `source.ts` |
| Fila de `Autores` → objeto `Autor` | `filaAAutor` en `data/parseo.ts` |
| Fila de `Actividades` → objeto `Actividad` | `filaAActividad` en `data/parseo.ts` |
| URLs de Drive → imagen servible | `normalizarFotoUrl` en `data/parseo.ts` |
| `Respuesta` → las 28 celdas en orden | `aFilaRespuestas` en `data/serializacion.ts` |
| Fila de `Feedback` → 6 celdas | `aFilaFeedback` en `data/serializacion.ts` |
| Encabezados literales de ambas pestañas | `ENCABEZADOS_*` en `data/serializacion.ts` |
| `user-agent` → columna `dispositivo` | `dispositivoDesdeUserAgent` |

Tu `getAutores` debería quedar en algo así:

```ts
const { data } = await sheets.spreadsheets.values.get({
  spreadsheetId: process.env.SHEET_AUTORES_ID,
  range: RANGOS.autores,
});
return (data.values ?? []).map(filaAAutor).filter((a): a is Autor => a !== null);
```

---

## 3. Geometría de las hojas (lo primero que se rompe)

Las hojas empiezan con bloques de instrucciones para la curaduría, así que los
datos **no** arrancan en la fila 2:

| Pestaña | Instrucciones | Encabezados | Datos desde |
|---|---|---|---|
| `Autores` | filas 1-2 | **fila 3** | fila 4 |
| `Actividades` | fila 1 | **fila 2** | fila 3 |
| `Respuestas` | fila 1 | **fila 2** | fila 4 (la 3 son descripciones) |
| `Feedback` | fila 1 | **fila 2** | fila 4 |

Eso ya está reflejado en `RANGOS`. Si la curaduría inserta o borra filas ahí
arriba, es lo primero que hay que revisar.

---

## 4. Los dos spreadsheets

| | ID | Permiso para la service account | Pestañas |
|---|---|---|---|
| "Base Autores" | `SHEET_AUTORES_ID` | **Lector** | Autores, Actividades, Vocabulario |
| "Respuestas Match" | `SHEET_RESPUESTAS_ID` | **Editor** | Respuestas, Feedback |

`.env.example` ya trae los nombres del prompt maestro §11:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY,
SHEET_AUTORES_ID, SHEET_RESPUESTAS_ID,
SHEETS_CACHE_TTL_SECONDS, REVALIDATE_TOKEN,
NEXT_PUBLIC_APP_VERSION, NEXT_PUBLIC_APP_URL
```

La app **no lee la pestaña `Vocabulario`**: alimenta los desplegables de la hoja.
Su copia en código está en `src/lib/vocabulario.ts` y las dos tienen que decir lo
mismo. La propia hoja avisa: *"Avise al equipo de desarrollo antes de modificar"*.

---

## 5. Rarezas reales de la hoja que el parseo ya cubre

Están todas probadas en `tests/sheets.test.ts` con filas copiadas de los archivos
de `sheets/`. **No las descubras a mano el día del evento:**

1. **Celdas multivaluadas separadas por `", "`** (las escribe el Apps Script de
   selección múltiple). Se parten por coma y se recortan.
2. **Fila de ejemplo `AUT000`** (Piedad Bonnett) que trae la plantilla: se
   descarta hasta que la curaduría la borre.
3. **~940 filas en blanco** bajo los datos: se descartan por `id` vacío.
4. **Plantillas de actividad del Apps Script**: al dar de alta un autor se crea
   una fila `[Actividad de …]` sin fecha ni hora. Se descartan; si no, la agenda
   se llenaría de actividades fantasma.
5. **`activo` llega como `"TRUE"` o como booleano `true`** según el formato de la
   celda. `esVerdadero()` acepta ambos (y `SI`/`NO`).
6. **`foto_url` viene en tres formatos**: enlace de compartir de Drive
   (`/file/d/ID/view?usp=drive_link`), enlace directo (`/uc?id=ID`) y —esto pasa
   de verdad— **algún enlace a Google Docs**, que no es una imagen. Se normaliza
   a `drive.google.com/thumbnail?id=…` y lo que no sea imagen devuelve `null`,
   con lo que la UI cae al avatar de iniciales.
7. **`hora_fin` puede ir vacía**: se asume una hora de duración, que es lo que
   hace falta para detectar cruces.
8. **Tags a medio curar**: en la hoja real de hoy, `generos`, `tematicas` y
   `mood` están vacíos en casi todos los autores. El match lo soporta (esas
   categorías puntúan 0), pero **hasta que la curaduría los rellene los
   porcentajes serán planos**. Es lo primero que conviene avisar al equipo.
9. **Valores fuera del vocabulario** se descartan en vez de colarse: si alguien
   escribe "Género Inventado" no llega al match ni al panel.
10. **Los ids no son contiguos** (`AUT001`, `AUT002`, `AUT004`…). No asumas orden
    ni continuidad.

---

## 6. Esquema exacto que devuelven las funciones

La definición canónica, con el nombre de columna de cada campo, está en
**`src/lib/data/types.ts`**. Resumen:

### `Autores` → `Autor`

```
id | nombre_completo | nombre_visible | genero_autor | pais | origen |
bio_corta | bio_larga | foto_url | libro_destacado | web_o_red |
generos | tematicas | mood | publico | estilo | voces | activo
```

- `estilo` es **un solo valor** (desplegable), no una lista.
- `publico` usa su propio vocabulario: Infantil / Juvenil / Adulto joven / Adulto.
- `genero_autor` (F/M/No binario/Colectivo) **no puntúa afinidad**: solo
  diversifica el ranking (§6.3 del prompt maestro).
- Al leer, `conVozDeOrigen` añade a `voces` la voz que implica `origen`
  (Local/Caldas → "Voces locales", Nacional → "Voces colombianas", etc.), para
  que el origen pese aunque la curaduría no lo repita a mano.

### `Actividades` → `Actividad`

```
actividad_id | autor_ids | titulo | tipo | fecha | hora_inicio |
hora_fin | lugar | descripcion | activo
```

- `autor_ids` es una **lista**: una actividad puede tener varios autores, y la
  app lo muestra ("Mariana Ocampo, Paola Restrepo · Sala Fundadores").
- `fecha` en `YYYY-MM-DD`. **Los días del evento se derivan de aquí**, no están
  codificados: el paso 8 del wizard muestra las fechas que existan en la
  programación. Si no hay ninguna todavía, cae a los siete días de la feria.
- `hora_inicio`/`hora_fin` en `HH:MM` 24h; en memoria, minutos desde medianoche.

### `Respuestas` (28 columnas) y `Feedback` (6)

El orden exacto está en `ENCABEZADOS_RESPUESTAS` y `ENCABEZADOS_FEEDBACK`, y hay
un test que falla si `aFilaRespuestas` se desalinea.

Detalles que importan:
- `timestamp` en **UTC** (lo pide el encabezado de la hoja).
- `feedback_util` es **1 / 0 / vacío**, no `up`/`down`.
- `completado` es `TRUE`/`FALSE`.
- `dias_asistencia_sel` se guarda como fechas ISO (`2026-08-31; 2026-09-01`), no
  como etiquetas, para que el panel las agregue por fecha.
- `dispositivo` se deriva del user agent **en el servidor** y solo se guarda la
  categoría (movil/tablet/escritorio). El user agent completo no se guarda nunca:
  sería un fingerprint y el prompt maestro lo prohíbe.
- La fila de `Feedback` **solo se escribe si la persona respondió algo abierto**.

---

## 7. Cómo comprobar que quedó bien

1. `npm test` sigue en verde (usa el mock, no toca Sheets).
2. `curl http://localhost:3000/api/catalogo` devuelve tus autores reales.
3. Recorre el wizard: si el paso 8 muestra las fechas reales de la programación,
   `getActividades` está bien.
4. Si los porcentajes salen todos casi iguales, casi seguro es el punto 8 de §5
   (tags sin curar), no un fallo tuyo.
5. Envía una respuesta y comprueba que la fila cae alineada con los encabezados.

---

## 8. Decisiones de diseño que conviene que conozcas

- **No se simula un dispositivo.** En móvil la app va a pantalla completa; en
  escritorio se centra en una columna de 448px con el fondo a sangre. Todo se
  decide en `src/components/ContenedorApp.tsx`.
- **El catálogo se carga al abrir la app**, no al terminar el wizard: el paso 8
  necesita los días antes de calcular nada, y así el match no espera a la red.
- **Sin `AnimatePresence mode="wait"` entre pasos ni entre pantallas.** Con
  animación de salida, dos toques rápidos dejaban la transición a medias y la app
  se quedaba congelada entre dos vistas. Ahora solo hay animación de entrada. Las
  hojas modales sí la usan, porque se montan por booleano y su salida importa.
- **El botón "simular error de carga" del prototipo no se implementó.** Era
  andamio del diseño; la pantalla de error se muestra de verdad cuando falla
  `GET /api/catalogo`, que es justo lo que te interesa probar.
- **El botón "Programación" de la agenda está deshabilitado** porque no hay URL
  oficial. Tiene su `TODO` en `src/components/pantallas/Agenda.tsx`.
- **El `session_id` no usa `crypto.randomUUID()` directamente** (ver
  `src/lib/uuid.ts`). Esa función solo existe en contextos seguros y desde
  Safari 15.4 / Chrome 92: por HTTP plano, o en un teléfono viejo, la app se caía
  en el primer toque de INICIAR. Hay una cascada de respaldos y tests de las tres
  ramas. Lo mismo con `100dvh`, que tiene respaldo a `100vh` en `globals.css`.

---

## 9. Cambios recientes de UI (21 ago 2026)

Después de probar la app en el celular salieron cinco ajustes, ya aplicados y
con los tests puestos al día. No tocan el contrato de datos ni `source.ts`,
pero conviene conocerlos:

1. **`etiquetaDia()` en `vocabulario.ts`** ahora devuelve el día de la semana:
   `"Lunes 31 ago"` en vez de `"31 ago"`. Se calcula con `Date.UTC` (sin
   `toLocaleDateString`), igual que antes. Afecta al paso 8 del wizard y a los
   encabezados de la agenda, que ya reutilizaban esta función.
2. **El botón "Iniciar" de `Bienvenida.tsx`** ahora llama a `reiniciar()` antes
   de `empezarWizard()`, así que siempre arranca en blanco aunque queden
   respuestas de una sesión anterior en `localStorage`. "Mi último match" sigue
   mostrando lo guardado sin reiniciar nada.
3. Pregunta del paso 2: "¿Qué géneros te laten?" → **"¿Qué géneros te
   mueven?"** (`src/lib/pasos.ts`).
4. **Bio del autor destacado**: la tarjeta principal de resultado ahora
   muestra `bioCorta` directamente; "Ver perfil" abre el modal con
   `bioLarga`. Para el resto de autores (no destacados), el mismo modal
   muestra solo `bioCorta` — `ModalAutor.tsx` decide cuál mostrar comparando
   `resultados[0]?.autorId` con el autor abierto.
5. **`alternarAutor()` en `useMatchStore.ts`**: al quitar un autor de la
   agenda se quitan TODAS sus actividades, aunque las comparta con otro autor
   (antes solo se quitaban las que no compartía con nadie, lo que dejaba
   actividades huérfanas en la agenda). Si el otro autor las necesita de
   vuelta, basta con volver a tocar "+" en su tarjeta.

## 10. Lo que sigue faltando del prompt maestro

Nada de esto bloquea tu parte, pero conviene tenerlo en la lista:

- **§6.1/§6.2 forma del score**: el documento calcula **un solo coseno** sobre el
  espacio completo de tags con los pesos aplicados a las componentes. `motor.ts`
  calcula un **coseno por categoría** y los promedia con esos mismos pesos. Las
  proporciones entre categorías son las del documento y el ranking sale muy
  parecido, pero la normalización no es equivalente.
- **§8.4** `POST /api/revalidate?token=…` y el cacheo con `revalidate = 300`.
  La variable `REVALIDATE_TOKEN` ya está en `.env.example`; la ruta no existe.
- **§7.3** exportar `.ics` (opcional en el documento).
- **§8.5** optimizar las fotos con `next/image`. Hoy se usan `<img>`, que
  funciona con cualquier host sin configurar `remotePatterns`.

Las tipografías del design system (Fivo Sans Modern, Myriad Pro, Freight Text
Pro) **ya están** en `public/fonts/` y cargando; no tienes que hacer nada con
ellas.

Cualquier duda, escríbeme.
