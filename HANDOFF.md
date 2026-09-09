# HANDOFF — Fase 1 → Fase 2 (conexión con Google Sheets)

Hola. Yo hice el frontend y la arquitectura. Este documento es para ti, que
conectas los datos reales de Google Sheets.

**Resumen en dos frases:** el proyecto ya está estructurado contra las hojas
reales de Drive (columna por columna, fila de encabezado por fila de encabezado).
La **escritura** ya escribe en Google Sheets real (`saveRespuesta` +
`updateRespuesta`); solo quedan **dos funciones de lectura** que rellenar cuando
la base de autores esté lista, todas en **un archivo** (`src/lib/data/source.ts`).

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
| Tipos TS de las 4 pestañas reales (`Autores`, `Actividades`, `Respuestas`) | ✅ |
| Parseo de filas reales, con sus rarezas (ver §5) | ✅ |
| Serialización con el orden exacto de columnas | ✅ |
| Telemetría implícita completa (§7.5 del prompt maestro) | ✅ |
| `GET /api/catalogo`, `POST /api/respuestas` (crear) y `PATCH /api/respuestas/[sessionId]` (actualizar) | ✅ |
| 126 tests (match, agenda, serendipia y contrato con Sheets) | ✅ |
| **Escritura real a `googleapis`** (`saveRespuesta` + `updateRespuesta`) | ✅ |
| **Lectura real de autores/actividades** (base aún no lista) | ⏳ pendiente |
| Panel de administración y despliegue | ❌ (fase 3, otra persona) |

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 126 tests
npm run typecheck
```

Hoy la escritura va a Google Sheets real y la lectura funciona de punta a punta
con 20 autores y 30 actividades de ejemplo que imitan la forma de la hoja real.

---

## 2. Lo único que tienes que tocar

### `src/lib/data/source.ts`

```ts
export async function getAutores(): Promise<Autor[]>          // TODO: lectura real (pendiente)
export async function getActividades(): Promise<Actividad[]>  // TODO: lectura real (pendiente)
export async function saveRespuesta(entrada, contexto): Promise<Respuesta>     // POST → crea la fila (ya real)
export async function updateRespuesta(entrada, contexto): Promise<Respuesta>   // PATCH → upsert (ya real)
```

Solo quedan **`getAutores` y `getActividades`** por conectar. **No cambies las
firmas.** Cada una lleva su contrato y su `// TODO (lectura diferida)` con la
llamada concreta. Compruébalo con:

```bash
grep -rn "lectura diferida" src/
```

**Ya está hecho por ti** (probado, no lo reescribas):

| Qué | Dónde |
|---|---|
| Rangos A1 con la fila de encabezados descontada | `RANGOS` en `source.ts` |
| Fila de `Autores` → objeto `Autor` | `filaAAutor` en `data/parseo.ts` |
| Fila de `Actividades` → objeto `Actividad` | `filaAActividad` en `data/parseo.ts` |
| URLs de Drive → imagen servible | `normalizarFotoUrl` en `data/parseo.ts` |
| `Respuesta` → las 27 celdas en orden | `aFilaRespuestas` en `data/serializacion.ts` |
| Buscar la fila por `session_id` | `indiceFilaPorSessionId` en `data/actualizacion.ts` |
| Fusionar el PATCH conservando las columnas "(auto)" | `fusionarFilaRespuestas` en `data/actualizacion.ts` |
| Encabezados literales de `Respuestas` | `ENCABEZADOS_RESPUESTAS` en `data/serializacion.ts` |
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

Eso ya está reflejado en `RANGOS`. Si la curaduría inserta o borra filas ahí
arriba, es lo primero que hay que revisar.

---

## 4. Los dos spreadsheets

| | ID | Permiso para la service account | Pestañas |
|---|---|---|---|
| "Base Autores" | `SHEET_AUTORES_ID` | **Lector** | Autores, Actividades, Vocabulario |
| "Respuestas Match" | `SHEET_RESPUESTAS_ID` | **Editor** | Respuestas |

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

### `Respuestas` (28 columnas)

El orden exacto está en `ENCABEZADOS_RESPUESTAS`, y hay un test que falla si
`aFilaRespuestas` se desalinea.

Detalles que importan:
- `timestamp` en **UTC** (lo pide el encabezado de la hoja).
- `feedback_util` es **1 / 0 / vacío**, no `up`/`down`.
- `completado` es `TRUE`/`FALSE`.
- `dias_asistencia_sel` se guarda como fechas ISO (`2026-08-31; 2026-09-01`), no
  como etiquetas, para que el panel las agregue por fecha.
- `dispositivo` se deriva del user agent **en el servidor** y solo se guarda la
  categoría (movil/tablet/escritorio). El user agent completo no se guarda nunca:
  sería un fingerprint y el prompt maestro lo prohíbe.
- Una sesión es **una sola fila**: el `POST` la crea y el `PATCH` la actualiza
  (upsert por `session_id`). Ya no existe la pestaña `Feedback`: el feedback vive
  en las columnas 21-23 de `Respuestas`.
- **`visita_previa`** (columna 28, `AB`) se añadió el 9 sep 2026 y va **al
  final**, no junto a `origen_visitante`/`donde_consigue_libros`/
  `como_se_entero`: insertarla en medio habría desalineado las filas que la
  hoja ya tenía escritas. Guarda `Sí`/`No`/vacío. Ver §11.

---

## 7. Cómo comprobar que quedó bien

1. `npm test` sigue en verde (la lógica pura, no toca Sheets).
2. Recorre el wizard y comprueba que la fila cae en `Respuestas` del spreadsheet
   "Respuestas Match" (los logs `[data] CREATE …` del servidor muestran qué se
   escribió y en qué fila).
3. Toca "Mi agenda" o responde "¿Te sirvió tu match?" y comprueba que actualiza
   la MISMA fila (`[data] UPDATE …`), sin duplicar la sesión.
4. La lectura de autores sigue en mock: `GET /api/catalogo` devuelve los 20
   autores de ejemplo hasta que la base real esté lista.

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

## 10. Ajustes del test con usuarios (9 sep 2026)

Después de la Fase 2, un test con usuarios reales dejó una lista de siete
ajustes de UI más un rediseño de la bienvenida y la pantalla de cálculo.
Todo está en la rama **`feat/ui-test-usuarios`** (aún no mergeada a `main`
al escribir esto — revisa si ya hay PR abierto o mergeado antes de asumir
que esto sigue pendiente). 126 tests en verde, typecheck y lint limpios.

**Los siete puntos del test:**

1. Capitalización de "Feria" como nombre propio en todos los textos donde
   aparecía en minúscula (bienvenida, paso 7 del wizard, pantalla de
   cálculo, paso 8/agenda, hoja de compartir, metadescripción).
2. **Rangos etarios** cambiaron de `13-17 / 18-25 / 26-40 / 41-60 / 60+` a
   `6-17 / 18-28 / 29-40 / 41-60 / 60+` (`src/lib/vocabulario.ts`,
   `EDADES` + `EDAD_A_PUBLICO`). Si la hoja `Base Autores` tiene un
   desplegable con los valores viejos en la columna de origen del dato o en
   `Respuestas!edad`, **hay que actualizarlo a mano** — la app ya solo
   valida y escribe los nuevos.
3. El libro destacado del autor del match principal ahora se muestra
   directo en la tarjeta de `Resultado.tsx` (antes solo en el modal); para
   el resto de autores sigue solo en el modal.
4. "Cuéntanos más" pasó de dos a **cuatro** preguntas (ver el punto de
   `visita_previa` abajo) y se corrigió "Feria" en mayúscula ahí también.
5. "Tu autor/a más afín" → **"Tu match ideal es"** en la cabecera del
   resultado.
6. Rediseño completo de la bienvenida (`Bienvenida.tsx`) — ver más abajo.
7. Rediseño completo de la pantalla de cálculo (`Calculando.tsx`) — ver
   más abajo.

**Pregunta nueva "¿Habías venido antes a la Feria...?"** (Sí/No) en
"Cuéntanos más". Escribe en la columna `visita_previa`, **28ª y última**
columna de `Respuestas` (ver §6). Acción pendiente fuera del código:
**alguien con permiso de edición tiene que crear el encabezado
`visita_previa` en la celda `AB2`** de la hoja "Respuestas Match" (y su
descripción en `AB3` si se sigue esa convención); mientras no exista, la
app escribe igual en esa columna pero queda sin nombre para quien lea la
hoja o para el panel de la fase 3.

**Rediseño visual de `Bienvenida.tsx` y `Calculando.tsx`.** Se probaron
varias direcciones con el usuario antes de asentar esta; documento solo el
resultado final, porque los intentos intermedios (aves cruzando la
pantalla, plantas en las cuatro esquinas, un corazón bordándose punto a
punto en la bienvenida) fueron descartados y no viven en el código:

- **Bienvenida**: fondo amarillo (`bg-yellow`, el token `--color-yellow`)
  con un degradado sutil solo desde abajo. Una flor grande
  (`public/flor.webp`, recortada de `Nativos/Plantas 01.png`) cuelga desde
  arriba y roza el borde del identificador — anclada al propio bloque del
  logo, no al viewport, para que el roce se mantenga igual en cualquier
  alto de pantalla. Abajo, un perfil de Manizales hecho de siluetas planas
  (Catedral + Torre del Cable como hitos reconocibles, más tres edificios
  genéricos de relleno urbano) anclado al borde inferior, bajo los
  botones. El emblema central ya **no es un corazón**: es una
  **estampilla franqueada** (`Estampilla` en `src/components/ui/iconos.tsx`)
  con la silueta de la Catedral dentro y un matasellos superpuesto en la
  esquina — y el matasellos lleva un corazón pequeño en su centro, en la
  misma tinta y el mismo giro que el resto del sello (si se aísla para que
  se vea más nítido, deja de leerse como una impresión y pasa a verse como
  una calcomanía pegada encima).
- **Calculando**: ya no son dos rectángulos con un corazón; ahora es un
  corazón que se **borda en punto de cruz** dentro de un aro de bordado
  (`public/aro-bordado.webp`, de `Nativos/Aro de bordado.png`). El avance
  de las puntadas (69 puntadas, dos tonos de hilo) hace de barra de
  progreso implícita. Por eso `MINIMO_CALCULANDO_MS` en
  `useCalcularMatch.ts` subió de 1500 a **2200ms**: con el tiempo viejo la
  pantalla se iba justo cuando caía la última puntada y casi nadie llegaba
  a verla completa. Si se toca ese número hay que revisar en paralelo los
  `animation-delay` en `Calculando.tsx` y las clases `flm-puntada` /
  `flm-aro-entra` de `globals.css`.
- **Técnica de las siluetas de edificios**: los grabados de `Nativos/` son
  arte de colección con textura y color (halftone), no vectores planos —
  aplicarles un filtro de escala de grises se ve como una calcomanía
  ocupada, no como parte de la identidad plana de la app. Lo que funciona
  es extraer el canal alfa de la imagen y rellenarlo con un solo color de
  marca, descartando el sombreado interno; en la Catedral y la Torre del
  Cable el alfa original sigue el dibujo fino (los huecos de la celosía de
  la torre son transparentes de verdad), así que el resultado es una
  silueta limpia y reconocible. **No todos los recursos de `Nativos/`
  sirven para esto**: se probó con "Torre de Chipre" y su alfa es solo el
  contorno del recorte de papel, no el del edificio — el resultado era un
  borrón irreconocible y se descartó.
- Todos los recursos que se usaron están optimizados a WebP con `sharp`
  (ya en `node_modules`, no hace falta instalar nada): el aro de bordado
  pasó de 1,96MB a 160KB, la flor de ~200KB a 29KB, cada silueta de
  edificio pesa entre 2 y 8KB.

**Se eliminaron todos los emoji de la interfaz** (`👍`, `👎`, `⚠`, `✓`,
`×`, `←`, `→`, `↻`, y el `❤` que usaba la bienvenida antes del rediseño).
Cada plataforma los pintaba distinto — el caso que lo disparó fue el `❤`
saliendo como el glifo a todo color de Apple en iOS, ajeno a la paleta.
Ahora son iconos SVG en `src/components/ui/iconos.tsx` que heredan
`currentColor`. Si agregas UI nueva, **no uses caracteres emoji ni
símbolos tipográficos decorativos** (ni siquiera `⚠` o `→`): añade el
icono a ese archivo.

**Fallo de Google Sheets sin configurar deja de ser un error ruidoso.**
Antes, sin `.env`, cada intento de guardar reintentaba 3 veces con
backoff (hasta 11s) y terminaba en un `502` con `console.error`, lo que en
`next dev` levanta el panel de errores en pantalla — parecía un bug de la
app cuando en realidad solo faltaba la service account. Ahora
`SheetsSinConfigurar` (en `googleSheets.ts`) se detecta antes del primer
reintento y las rutas devuelven `501` de inmediato (~80ms), con un
`console.warn` una sola vez por proceso. El cliente (`useEnviarRespuesta.ts`)
trata el 501 como aviso, no como error. Esto es puramente de
desarrollo/observabilidad: no cambia el contrato con quien consuma la API
en producción con las credenciales puestas.

**Crédito institucional**: se agregó "Desarrollado por el Centro de
Ciencia Francisco José de Caldas" al pie de la bienvenida (bajo el aviso
de anonimato). No existía en ninguna pantalla; la institución ya estaba
nombrada en `01-PROMPT-MAESTRO-claude-code.md` §1 pero nunca llegó a la
UI.

## 11. Lo que sigue faltando del prompt maestro

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
