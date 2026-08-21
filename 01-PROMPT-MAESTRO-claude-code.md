# PROMPT MAESTRO — "Match Literario" · Feria del Libro de Manizales

> Pega este documento completo como primer mensaje en Claude Code. Es la especificación funcional y técnica del proyecto. Trabájalo por fases en el orden indicado. Cuando algo no esté definido, prioriza simplicidad, accesibilidad y rendimiento en móvil.

---

## 1. Contexto y objetivo

Construye una **webapp mobile-first** para la Feria del Libro de Manizales (Universidad de Caldas · Centro de Ciencia Francisco José de Caldas). El usuario responde un wizard de 8 preguntas tipo "píldoras" (selección simple y múltiple) y obtiene un **ranking de autores/autoras** con los que tiene afinidad, tipo "match/Tinder literario". Con esos resultados **arma una ruta** de qué autores ver, cuándo y dónde durante la feria, y puede **exportarla/compartirla** por WhatsApp o email.

La feria dura **7 días: 31 de agosto al 6 de septiembre de 2026** (deriva igualmente los días de la data real, por si hay ajustes de última hora), con 5 espacios simultáneos fijos y hasta 10 en picos. Se esperan ~300 autores y ~7.000 usuarios totales (800-1.000/día). Se libera una semana antes del evento.

Objetivos secundarios (críticos): **captar datos estratégicos anónimos** para un dashboard de administración en tiempo real, y **telemetría implícita** de uso. Cero datos personales identificables, cero cuentas de usuario.

---

## 2. Stack y principios

- **Next.js (App Router) + TypeScript.**
- **Tailwind CSS** + **Framer Motion** (transiciones del wizard, cards, modal).
- **Zustand** (o Context) para estado del wizard y de la ruta; persistencia en `localStorage`.
- **googleapis** (service account) para leer autores y escribir respuestas.
- **Tremor** o **Recharts** para el dashboard de admin.
- **Deploy:** Vercel. Node runtime en las rutas que usan `googleapis`.
- Principios: **mobile-first estricto**, animaciones fluidas pero respetando `prefers-reduced-motion`, accesibilidad AA, tiempo de wizard < 90 s, cero bloqueos por red (la data de autores se cachea).

---

## 3. Modelo de datos (Google Sheets)

Hay **dos spreadsheets**. Sus IDs vienen por variables de entorno.

### 3.1. Spreadsheet A — "Base Autores" (solo lectura para la app)

**Pestaña `Autores`** — una fila por autor/a:

| columna | tipo | uso |
|---|---|---|
| `id` | texto (AUT001…) | ID estable, clave primaria |
| `nombre_completo` | texto | nombre real |
| `nombre_visible` | texto | cómo se muestra en la card |
| `genero_autor` | enum (F/M/No binario/Colectivo) | **diversidad del ranking** |
| `pais` | texto | |
| `origen` | enum (Local / Caldas / Nacional / Latinoamérica / Internacional) | genera tag de "voces" |
| `bio_corta` | texto ≤ 280 | card |
| `bio_larga` | texto | modal |
| `foto_url` | URL | imagen pública (ver §8) |
| `libro_destacado` | texto | opcional, modal |
| `web_o_red` | URL | opcional |
| `generos` | lista separada por comas | vocab controlado (§4) |
| `tematicas` | lista | vocab controlado |
| `mood` | lista | vocab controlado |
| `publico` | lista | vocab controlado |
| `estilo` | lista | vocab controlado |
| `voces` | lista | vocab controlado |
| `activo` | TRUE/FALSE | si FALSE, se oculta (cancelaciones) |

**Pestaña `Actividades`** — una fila por actividad (un autor tiene varias; una actividad puede tener varios autores):

| columna | tipo | uso |
|---|---|---|
| `actividad_id` | texto (ACT001…) | |
| `autor_ids` | lista de ids separada por comas | vincula a `Autores.id` |
| `titulo` | texto | |
| `tipo` | enum de actividades feria (§4) | |
| `fecha` | YYYY-MM-DD | de aquí se derivan los días del evento |
| `hora_inicio` | HH:MM (24h) | |
| `hora_fin` | HH:MM | para detectar choques |
| `lugar` | texto (sala/escenario) | |
| `descripcion` | texto | opcional |
| `activo` | TRUE/FALSE | cancelaciones |

**Pestaña `Vocabulario`** — referencia del vocab controlado (§4), para que la curaduría use listas desplegables (validación de datos en Sheets). La app no la lee; es solo para consistencia humana.

### 3.2. Spreadsheet B — "Respuestas Match" (la app escribe)

**Pestaña `Respuestas`** — una fila por sesión (append). Columnas exactas en §7.4.
**Pestaña `Feedback`** — opcional, para texto libre largo (autor faltante, etc.) si se prefiere separar.

---

## 4. Vocabulario controlado (canónico)

Las opciones del wizard y los tags de los autores **deben usar exactamente estos valores**. No inventar sinónimos.

- **generos:** Novela · Cuento · Poesía · Ensayo · Crónica/Periodismo · No ficción · Novela gráfica/Cómic · Infantil · Juvenil · Teatro · Terror/Suspenso · Ciencia ficción · Fantasía · Romance
- **tematicas:** Historia y memoria · Feminismos y género · Medio ambiente y territorio · Política y sociedad · Ciencia y tecnología · Amor y relaciones · Salud mental y bienestar · Arte y cultura · Espiritualidad y filosofía · Humor y vida cotidiana · Deporte · Gastronomía · Viajes · Negocios y emprendimiento · Crianza y familia · Identidad y diversidad
- **mood:** Evadirme y soñar · Entender el presente · Emocionarme · Reírme · Incomodarme y pensar · Aprender algo nuevo · Conectar con mis raíces
- **publico:** Infantil · Juvenil · Adulto joven · Adulto
- **estilo:** Accesible · Literario/Experimental · Académico
- **voces:** Autoras mujeres · Voces locales (Caldas/Manizales) · Voces colombianas · Voces latinoamericanas · Autores jóvenes/emergentes · Voces indígenas y afro · Voces internacionales
- **actividades_tipo (para Actividades.tipo y la pregunta 7):** Oferta/muestra editorial · Presentaciones de libros · Actividades culturales · Conversatorios · Feria Gráfica · Talleres

> **Nota sobre la fuente:** en el Google Sheets real, las columnas multi-valor de `Autores` (`generos`, `tematicas`, `mood`, `publico`, `voces`) se llenan con un Apps Script que permite "toggle" de valores desde un desplegable (selecciona y se agrega; vuelve a seleccionar y se quita), guardando siempre el resultado como texto separado por `, ` en la celda — la app debe parsear exactamente ese formato (`split(',')` + `trim()`), igual que cualquier celda de texto normal. No hay diferencia estructural para el backend entre esto y una celda llenada a mano.

---

## 5. Flujo del wizard (8 pantallas)

Una pregunta por pantalla, con barra de progreso, botón atrás, transición animada (slide/fade), y opciones tipo "píldora" (chips grandes, táctiles, ≥ 44px). Estados: sin selección deshabilita "continuar" (salvo preguntas opcionales). Se guarda todo en el store.

1. **"¿Qué buscas cuando lees?"** (múltiple) → tags **mood**.
   Opciones = los 7 valores de `mood` con microcopy amable (ej. "Evadirme y soñar 🌙", "Entender el presente 🗞️"…).
2. **"¿Qué géneros te laten?"** (múltiple) → **generos**.
3. **"¿De qué quieres leer y hablar?"** (múltiple) → **tematicas**.
4. **"¿Cómo te gusta leer?"** (simple, escala) → **estilo**. De "Lo que ya disfruto" (Accesible) a "Cosas raras y experimentales" (Literario/Experimental), con opción intermedia. Este valor también sube el peso de serendipia.
5. **"¿A quién te gustaría leer?"** (múltiple) → **voces**. Incluir opción "Me da igual, sorpréndeme". Alimenta match y diversidad.
6. **"¿Cuántos años tienes?"** (simple) → 13-17 / 18-25 / 26-40 / 41-60 / 60+. Mapea a **publico** (13-17→Juvenil; 18-25→Adulto joven; 26-40 y 41-60→Adulto; 60+→Adulto) y se guarda como dato demográfico.
7. **"¿Qué te interesa de la feria?"** (múltiple) → **actividades_tipo**. Filtra/pondera y sirve de filtro de ruta.
8. **"Arma tu agenda"** — dos partes: días (derivados de `Actividades.fecha`, múltiple) + franja (Mañana/Tarde/Noche, múltiple). Alimenta ruta y curva de aforo.

Al terminar → pantalla de "calculando tu match" (animación breve ~1.5 s) → resultados.

---

## 6. Algoritmo de match

### 6.1. Construcción de vectores
- **Universo de tags** = unión de todos los valores de las 6 categorías de tags.
- **Vector del autor:** para cada tag presente en sus columnas, peso = `pesoCategoria`. Config inicial (tunable):
  `tematicas: 1.3 · mood: 1.2 · voces: 1.1 · generos: 1.0 · estilo: 0.8 · publico: 0.6 · actividades: 0.4`.
- **Vector del usuario:** tags derivados de sus respuestas, mismos pesos por categoría; múltiples selecciones suman.

### 6.2. Score
- `raw = cosine(vectorUsuario, vectorAutor)` sobre el espacio de tags.
- **Curva de presentación (siempre hay match):** transforma `raw ∈ [0,1]` a un `%` mostrado en `[55, 99]` con una función monótona (ej. `55 + 44 * raw^0.6`). Nadie ve 0 %.
- Guarda tanto `raw` (para ordenar/analytics) como el `%` (para mostrar).

### 6.3. Diversidad (re-ranking MMR)
Tras ordenar por `raw`, re-rankea con **Maximal Marginal Relevance**:
`selecciona el autor que maximiza  λ·raw − (1−λ)·maxSimilitudConYaElegidos`, con `λ = 0.7`.
La "similitud entre autores" penaliza compartir `genero_autor` **y** el mismo género literario dominante. Resultado: no salen 10 autores casi idénticos seguidos; se garantiza variedad de voces y géneros.

### 6.4. Segmentación del resultado
- **"Tu match literario"**: primeros 6-8 tras MMR.
- **"También te puede interesar"**: siguientes ~8 de afinidad media **+ 1-2 comodines de serendipia** (autores con un único tag fuerte compartido pero categoría distinta, elegidos al azar entre candidatos válidos) para generar descubrimiento.
- Si el usuario tuviera afinidad casi nula, se **fuerza** igualmente un ranking completo (nunca lista vacía).

### 6.5. Explicación del match ("por qué")
Para cada autor, calcula los **tags compartidos** con el usuario y muéstralos como "Coinciden en: Poesía · Feminismos · Emocionarme". Esto genera confianza y hace la app más "humana", no una caja negra.

---

## 7. Resultados, ruta y captura de datos

### 7.1. Pantalla de resultados
- Encabezado con el % del top match y microcopy celebratorio.
- Sección **"Tu match literario"**: cards pequeñas clickeables (foto miniatura, nombre, % match, 2-3 chips de coincidencia, botón **+** para añadir a ruta).
- Sección **"También te puede interesar"**: mismas cards, estilo más sobrio.
- **Card → modal expandible** (animado): foto grande, nombre, origen/país, bio larga, chips de géneros/temáticas, "por qué coincides", y la **lista de sus actividades** (día · hora · sala) cada una con su botón **+ añadir a mi ruta**. Si un autor está `activo=FALSE` no aparece.

### 7.2. Ruta ("Mi agenda")
- Pantalla única accesible desde botón flotante/bottom-nav con contador de items.
- Muestra las actividades añadidas **agrupadas por día**, ordenadas por hora, con lugar.
- **Detección de choques de horario:** si dos actividades se solapan, marca ambas con aviso visual ("Se cruza con…"). Registra el conflicto en telemetría.
- Filtro opcional por los días/franjas que el usuario eligió en P8.
- Cada item se puede quitar. La ruta persiste en `localStorage` (clave versionada). Si el usuario re-hace el wizard, el match se recalcula pero **la ruta guardada se conserva** (son elecciones explícitas).

### 7.3. Exportar / compartir
- **WhatsApp:** `https://wa.me/?text=` con la ruta formateada (texto plano: día, hora, autor, actividad, lugar).
- **Email:** `mailto:` con asunto y cuerpo equivalentes.
- **(Opcional) Descargar `.ics`** con las actividades como eventos de calendario.
- **(Opcional) Vista imprimible/screenshot** de la ruta.
Todo client-side; sin cuentas.

### 7.4. Escritura de datos estratégicos
Al **terminar el wizard** se hace append de una fila a `Respuestas`. Tras el resultado, se muestran **preguntas post-resultado opcionales y saltables** (no bloquean nada), que actualizan/añaden datos:
- ¿De dónde nos visitas? (Manizales / Caldas / Eje Cafetero / Resto de Colombia / Internacional)
- ¿Dónde consigues tus libros? (múltiple: librería física / online / bibliotecas / prestados / usados / digital)
- ¿Cómo te enteraste de la feria? (redes / radio / prensa / colegio o universidad / voz a voz / valla / otro)
- Feedback: "¿Te sirvió tu match?" 👍/👎 + texto opcional.
- "¿Qué autor/a te hubiera gustado ver y no está?" (texto libre opcional).
- "¿Qué temática sientes que falta?" (múltiple sobre `tematicas`).

**Columnas de la pestaña `Respuestas`** (una fila por sesión):
`timestamp, session_id, dispositivo, edad, origen_visitante, generos_sel, tematicas_sel, mood_sel, estilo_sel, voces_sel, actividades_interes_sel, dias_asistencia_sel, franjas_sel, donde_consigue_libros, como_se_entero, match_top_ids, autores_click_ids, autores_ruta_ids, n_autores_ruta, conflictos_detectados, feedback_util, feedback_texto, autor_faltante, tema_faltante, tiempo_total_seg, paso_abandono, completado, version_app`

Reglas: `session_id` = UUID anónimo (localStorage). Listas como texto separado por `;`. **No** capturar IP, nombre, email ni fingerprint. `paso_abandono` se registra si el usuario cierra antes de terminar (usar `sendBeacon`/append parcial).

### 7.5. Telemetría implícita
Registrar dentro de la misma fila (sin preguntar): `tiempo_total_seg`, autores clicados, autores añadidos a ruta, número de conflictos, dispositivo, paso de abandono. Objetivo: comparar autores **matcheados vs. clicados vs. añadidos** (la brecha revela problemas de foto/bio), y detectar choques de programación agregados.

---

## 8. Integración con Sheets (implementación)

Hay **una sola cuenta de servicio (service account)** de Google Cloud que se usa para las dos hojas: lee de "Base Autores" y escribe en "Respuestas Match". Es la misma identidad técnica para ambas, solo cambian los permisos que se le dan en cada archivo.

### 8.1. Crear la cuenta de servicio (una vez)
1. En Google Cloud Console: crear proyecto → habilitar **Google Sheets API** → crear una **Service Account** → generar una clave JSON.
2. El JSON trae un `client_email` (algo como `match-literario@proyecto.iam.gserviceaccount.com`) y una `private_key`. Esos dos valores van a las variables de entorno (§11); el JSON completo no se sube a ningún repo.

### 8.2. Compartir cada Google Sheets con esa cuenta
- **"Base Autores"** (la crean los organizadores): deben compartirla con el `client_email` de la cuenta de servicio en rol **Lector** (Viewer). Basta con "Compartir" → pegar ese correo → Lector.
- **"Respuestas Match"** (la crea el equipo de desarrollo, ver §8.3): se comparte con el mismo `client_email` en rol **Editor**, porque la app necesita escribir filas ahí.

### 8.3. Quién crea cada hoja y de dónde sale el ID
- **"Base Autores"**: la crean los organizadores a partir del Excel que les entregamos (`Base-Autores-Feria-del-Libro.xlsx`, ver documento de requerimiento). El **ID del Sheets** está en la URL, entre `/d/` y `/edit`: `https://docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit`. Ese ID va en `SHEET_AUTORES_ID`.
- **"Respuestas Match"**: la crea el equipo de desarrollo (a partir del Excel `Respuestas-Match-Feria-del-Libro.xlsx`), porque es la app quien escribe ahí y conviene tener control total desde el inicio (nombres de pestaña exactos, permisos, etc.). Su ID va en `SHEET_RESPUESTAS_ID`. Si el cliente prefiere ser dueño del archivo desde el día uno, también puede crearla él y solo darle acceso de Editor a la cuenta de servicio — funciona igual, el desarrollo no depende de quién sea el dueño, solo de que la cuenta de servicio tenga el permiso correcto.

### 8.4. Lectura de autores/actividades
- Ruta server-side con `googleapis` + la cuenta de servicio (scope `spreadsheets.readonly`), leyendo los rangos de las pestañas `Autores` y `Actividades` de `SHEET_AUTORES_ID`.
- Cachear con `export const revalidate = 300` (5 min) o ISR. Exponer una ruta secreta `POST /api/revalidate?token=...` para forzar refresco manual cuando la curaduría actualice la hoja (útil si hay una cancelación de última hora).
- Al parsear las columnas multi-valor (`generos`, `tematicas`, `mood`, `publico`, `voces`), separar por coma y hacer `trim()` a cada tag — así sea que se hayan escrito a mano o generado por el Apps Script de multi-select, el formato en la celda es el mismo texto separado por comas.

### 8.5. Fotos
- Aceptar `foto_url` de Google Drive (convertir enlaces `/file/d/ID/view` a formato de imagen directa, ej. `https://drive.google.com/uc?id=ID` o el endpoint de contenido correspondiente) **o** URLs ya hospedadas en otro sitio.
- Implementar fallback (avatar con iniciales) si la imagen falla o la celda está vacía. Optimizar con `next/image`.

### 8.6. Escritura de respuestas
- Ruta `POST /api/respuestas` que hace `spreadsheets.values.append` (valueInputOption RAW) a la pestaña `Respuestas` de `SHEET_RESPUESTAS_ID`, con reintentos y backoff. Validar y sanear input server-side.
- El **panel de admin** (§9) lee de esa misma hoja con `spreadsheets.readonly` sobre `SHEET_RESPUESTAS_ID`.
- A 7.000 filas totales el volumen es trivial para la Sheets API; no hace falta paginación agresiva, solo cache corto (§9).

### 8.7. Nunca exponer credenciales
Todo lo anterior va en rutas server / server actions, nunca en código de cliente. La `private_key` nunca se imprime en logs ni se manda al navegador.

---

## 9. Panel de administración (`/admin`)

- Protegido por contraseña simple: página de login que setea cookie httpOnly comparando contra `ADMIN_PASSWORD`; middleware protege `/admin`. Sin sistema de usuarios.
- Lee la pestaña `Respuestas` (cache corto, ~60 s, con botón "actualizar"). Dashboard con Tremor/Recharts:
  - **Demografía:** pirámide por edad; barras por origen del visitante.
  - **Aforo proyectado:** demanda por día y por franja (mapa de calor / barras) a partir de `dias_asistencia_sel` y `franjas_sel`.
  - **Gustos:** tags más seleccionados; co-ocurrencia de tags (qué se elige junto).
  - **Autores:** ranking de más matcheados, más clicados y más añadidos a ruta (tres barras comparables).
  - **Comercial:** dónde consiguen libros; cómo se enteraron (atribución de marketing).
  - **Calidad del match:** % de 👍 vs 👎; evolución diaria.
  - **Curaduría futura:** nube/lista de "autores que faltaron" y "temáticas que faltan".
  - **Funnel:** completados vs. abandonos por paso.
  - **Conflictos:** actividades que más se cruzan en las rutas (hallazgo operativo).
- Contadores en vivo arriba: sesiones hoy, sesiones totales, tasa de finalización, top autor del día.

---

## 10. Accesibilidad y calidad

- HTML semántico, roles/ARIA en wizard y modal, foco gestionado al abrir/cerrar modal, navegación por teclado, `Esc` cierra modal.
- Contraste AA; tamaños táctiles ≥ 44px; textos escalables.
- `prefers-reduced-motion`: desactiva animaciones no esenciales.
- Estados de carga (skeletons), error y vacío bien resueltos.
- Funciona con conexión lenta; nada crítico depende de una llamada en vivo a Sheets del lado cliente.
- Lighthouse objetivo: Performance y Accessibility ≥ 90 en móvil.

---

## 11. Variables de entorno

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=            # con \n escapados
SHEET_AUTORES_ID=
SHEET_RESPUESTAS_ID=
REVALIDATE_TOKEN=
ADMIN_PASSWORD=
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

## 12. Fases de construcción (orden sugerido)

1. Scaffold Next.js + Tailwind + estructura de carpetas + tokens de diseño (placeholder hasta recibir la guía del equipo de diseño).
2. Capa de datos: lectura de `Autores` y `Actividades` desde Sheets + tipos TypeScript + cache/revalidate. Mock de datos si aún no hay hoja real.
3. Wizard de 8 pantallas con estado y animaciones.
4. Motor de match (§6) con tests unitarios sobre casos sintéticos (usuario sin afinidad → debe forzar match; usuario con muchos géneros → debe diversificar).
5. Resultados + modal + explicación de coincidencias.
6. Ruta (agenda) + detección de choques + persistencia + export WhatsApp/email/.ics.
7. Preguntas post-resultado + escritura a `Respuestas` + telemetría (incluido abandono).
8. Panel `/admin` con auth simple + dashboard.
9. Accesibilidad, performance, estados de error, pulido de motion.
10. Deploy en Vercel + dominio + prueba de carga ligera.

Entrega cada fase funcionando y verificable antes de pasar a la siguiente. Deja el diseño visual desacoplado en tokens (colores, tipografías, radios, sombras) para poder aplicar la guía de estilo del equipo de diseño sin refactorizar.
