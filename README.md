# Match Literario

Webapp de la **17 Feria del Libro de Manizales**. Responde ocho preguntas rápidas
sobre lo que te gusta leer y te arma una ruta a tu medida por la feria: autores
afines y una agenda con sus actividades.


> No necesitas nada más que esto para arrancar el proyecto.

Repo: https://github.com/CentroCFJC/Match-Literario

## Arrancar

```bash
git clone https://github.com/CentroCFJC/Match-Literario.git
cd Match-Literario
npm install
npm run dev          # http://localhost:3000
```

La **lectura** (autores y actividades) usa Google Sheets real cuando `SHEET_AUTORES_ID`
está configurado en `.env`; si falta, cae a un mock con 20 autores y 30 actividades
que cubren todo el vocabulario. La **escritura** (respuestas) ya va a Google Sheets
real y requiere las variables de `.env` (service account + `SHEET_RESPUESTAS_ID`).

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build` | build de producción |
| `npm test` | tests de la lógica pura (match y agenda) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Estructura

```
src/
  app/
    page.tsx                    ruta única; toda la navegación es estado
    layout.tsx  globals.css     tokens del design system
    api/catalogo/route.ts       GET  autores + programación
    api/respuestas/route.ts     POST crea una respuesta (una fila por sesión)
    api/respuestas/[sessionId]/route.ts  PATCH actualiza esa misma fila (upsert)
  components/
    AppMatchLiterario.tsx       raíz: qué pantalla se ve + efectos transversales
    ContenedorApp.tsx           ancho y alto de la superficie (layout compartido)
    pantallas/                  Bienvenida, Wizard, PasoAgenda, Calculando,
                                Resultado, Agenda
    hojas/                      ModalAutor, HojaCuentanosMas, HojaFeedback,
                                HojaCompartir, HojaConfirmarReinicio
    ui/                         Chip, OpcionTarjeta, BotonPrincipal,
                                CabeceraPaso, HojaInferior, Toast,
                                iconos.tsx (todo icono de la UI: nada de
                                emoji ni glifos tipográficos, ver abajo)
  hooks/
    useCalcularMatch.ts         Calculando → esqueleto → resultado
    useEnviarRespuesta.ts       POST /api/respuestas
  lib/
    vocabulario.ts              ← espejo de la pestaña `Vocabulario` de la hoja
    pasos.ts                    configuración de los 8 pasos del wizard
    agenda.ts                   días del evento, cruces de horario, compartir
    autores.ts                  iniciales, color de avatar, chips
    catalogo.ts                 carga de /api/catalogo en el cliente
    data/
      types.ts                  ← esquema de las 4 pestañas reales
      source.ts                 ← frontera con los datos (lectura mock, escritura real)
      googleSheets.ts           ← cliente/auth de Google Sheets (server-only)
      parseo.ts                 fila de Sheets → objeto (probado)
      serializacion.ts          objeto → fila de Sheets (probado)
      actualizacion.ts          búsqueda por session_id + fusión del PATCH (probado)
      mock.ts                   datos de ejemplo con la forma de la hoja real
      esquemas.ts               validación (zod) de POST/PATCH /api/respuestas
    match/
      config.ts                 ← todos los números del algoritmo
      motor.ts                  lógica pura: coseno, pesos, calibración, MMR
      adaptador.ts              Autor/Actividad → PerfilAutor
      types.ts  index.ts
  store/
    useMatchStore.ts            Zustand + persistencia en localStorage
tests/                          motor · agenda · sheets (contrato con la hoja)
sheets/                         copia de los .xlsx que hay en Drive, como
                                referencia del esquema real
```

## Cómo funciona el match

`src/lib/match/motor.ts`, en seis pasos:

1. **Vectorizar** — lector y autor se convierten en vectores binarios por
   categoría sobre el vocabulario controlado.
2. **Similitud** — coseno por categoría. `estilo` y `edad` usan tablas de
   afinidad en vez de coseno, porque son valores ordenados, no conjuntos.
3. **Combinar** — suma ponderada con los `PESOS` de `config.ts`. Si la persona no
   respondió una categoría (o marcó "Me da igual, sorpréndeme"), esa categoría se
   descarta y su peso se reparte entre las demás: no responder no penaliza a nadie.
4. **Bonificar** — un empujón si las actividades del autor caen en los días y
   franjas que la persona eligió, y otro menor si está marcado como destacado.
   Son bonificaciones, no filtros: nadie desaparece de la lista.
5. **Calibrar** — el puntaje crudo (0-1) se convierte en el porcentaje que se ve
   en pantalla mediante una curva cóncava, para que el número se lea como
   afinidad y no como probabilidad.
6. **Diversificar** — MMR elige *quiénes* entran en la lista para que no salgan
   cinco poetas seguidos; el orden final vuelve a ser por afinidad, para que los
   porcentajes se lean de mayor a menor.
7. **Descubrir** — 1-2 plazas se reservan a comodines de serendipia: autores que
   comparten un solo tag fuerte con la persona pero por lo demás son de otro
   mundo. Se eligen al azar entre los candidatos válidos, con el azar **sembrado
   por el `session_id`**: varía entre personas y es estable para la misma, así
   que "Mi último match" no cambia al volver.

Se calculan 16 autores: 1 destacado + 6 en "Tu match literario" + 6 en "También
te puede interesar", y el resto aparece con "Ver más autores". Con ~300 autores
invitados, mostrar solo cinco dejaría a casi todos sin una impresión y haría
inservible el análisis de "matcheados vs. clicados vs. añadidos".

Todo el módulo es puro: mismas entradas, misma salida. No sabe si los datos
vienen del mock o de Google Sheets, y esa independencia es intencional.

**Los pesos y las constantes viven solo en `src/lib/match/config.ts`.** Los pesos
por categoría (§6.1), la curva de calibración (§6.2) y el λ de MMR (§6.3) son los
del prompt maestro; lo que no viene de ahí está marcado como tal en el archivo.

## Layout

`src/components/ContenedorApp.tsx` es el único sitio donde se decide el ancho y
el alto de la superficie. En móvil la app ocupa toda la pantalla; en escritorio
el contenido se centra en una columna de 448px con el fondo propio de la app
extendido a todo el viewport. No se simula un dispositivo. Las pantallas solo
trabajan con `h-full` dentro del contenedor y superponen sus hojas con
`absolute inset-0`, así que ninguna necesita saber nada del breakpoint.

## Design system

Los tokens de color, tipografía y espaciado están copiados literalmente del
design system "Feria del Libro de Manizales" a `src/app/globals.css`, y
expuestos a Tailwind en `tailwind.config.ts` (`bg-magenta`, `text-burgundy`,
`rounded-pill`, `shadow-card`, …).

Las tipografías (Fivo Sans Modern, Myriad Pro y Freight Text Pro) están en
`public/fonts/`, y las reglas `@font-face` de `globals.css` las toman de ahí.

**Nunca uses emoji ni símbolos tipográficos decorativos** (`⚠ ✓ × ← → ↻ ❤`,
etc.) en la interfaz: cada plataforma los pinta distinto (el caso real que lo
disparó fue un `❤` saliendo como el glifo a todo color de Apple en iOS). Todo
icono vive como SVG en `src/components/ui/iconos.tsx`, heredando el color del
texto vía `currentColor`.

Los recursos gráficos de `public/*.webp` (edificios, flor, aro de bordado) son
recortes optimizados de los grabados originales en `Nativos/` (identidad
visual de la 17ª Feria — vintage, correspondencia, bordado). Se procesan con
`sharp` (ya en `node_modules`): para convertir un grabado con textura en una
silueta plana de un solo color, se extrae su canal alfa y se rellena con el
color de marca, descartando el sombreado interno — funciona bien cuando el
alfa original sigue el dibujo fino (huecos entre trazos), no cuando el
recorte es un bloque macizo. Ver §10 de `HANDOFF.md` para el detalle completo
y qué recursos sí sirven para esto.

## Fuente de verdad de los datos

El esquema del proyecto está calcado de los dos Google Sheets reales, cuya copia
está en `sheets/`:

- **"Base Autores"** — pestañas `Autores` (18 columnas), `Actividades` (10) y
  `Vocabulario`. La app solo lee. Los días de la feria **se derivan** de
  `Actividades.fecha`; no hay fechas codificadas.
- **"Respuestas Match"** — pestaña `Respuestas` (28 columnas). La app solo
  escribe: `POST` crea una fila por sesión y `PATCH /api/respuestas/[sessionId]`
  la actualiza (upsert por `session_id`). Ya no existe la pestaña `Feedback`; el
  feedback vive en las columnas 21-23 de `Respuestas`.

Las tres primeras filas de cada pestaña son instrucciones para la curaduría, no
datos: los rangos con las filas correctas están en `RANGOS`, en
`src/lib/data/source.ts`. `tests/sheets.test.ts` prueba el parseo con filas
copiadas de esos archivos.

## Fases del proyecto

1. **Frontend y arquitectura** — hecho. 126 tests en verde, probado en
   escritorio y en celular por red local.
2. **Conexión con Google Sheets** — hecho. Tanto la **lectura**
   (`getAutores` + `getActividades`) como la **escritura** (`saveRespuesta` +
   `updateRespuesta`) usan Google Sheets real. La lectura se cachea y se puede
   revalidar con `POST /api/revalidate?token=...`.
2.5. **Ajustes de UI del test con usuarios** (9 sep 2026, rama
   `feat/ui-test-usuarios`) — siete ajustes de texto/datos, rediseño completo
   de la bienvenida y la pantalla de cálculo con la identidad visual de la
   Feria, y eliminación de emoji de toda la interfaz. Detalle completo en
   §10 de [`HANDOFF.md`](./HANDOFF.md#10-ajustes-del-test-con-usuarios-9-sep-2026).
   Deja dos pendientes fuera del código para quien administre las hojas:
   crear el encabezado `visita_previa` en `Respuestas!AB2`, y revisar si hay
   que actualizar un desplegable de rangos etarios en `Base Autores`.
3. **Panel de administración y despliegue** — pendiente, tercera persona.

Cada persona trabaja en su propia rama y abre PR contra `main`; así se evita
que las fases se pisen mientras están en curso.
