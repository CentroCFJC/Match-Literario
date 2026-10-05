/**
 * Punto de entrada del motor de match.
 *
 * Importa siempre desde `@/lib/match`, no desde los módulos internos.
 */

export {
  actividadesPorAutor,
  aPerfilAutor,
  aPerfilesAutores,
  aPerfilLector,
} from './adaptador';
export { barajar, generadorAleatorio, semillaDesdeTexto } from './aleatorio';
export {
  AFINIDAD_ESTILO,
  AFINIDAD_PUBLICO_POR_DISTANCIA,
  BONUS_DISPONIBILIDAD_MAX,
  CALIBRACION,
  CATEGORIAS_MATCH,
  COMODINES_SERENDIPIA,
  MAX_TAGS_SERENDIPIA,
  MMR_LAMBDA,
  PESOS,
  SECCIONES_RESULTADO,
  SIMILITUD_AUTORES,
  TOTAL_RESULTADOS,
  VOZ_FILTRO_DURO,
} from './config';
export type { CategoriaMatch } from './config';
export {
  afinidadEstilo,
  afinidadPublico,
  calcularDesglose,
  calcularMatch,
  calibrar,
  candidatosSerendipia,
  coberturaDisponibilidad,
  coincidencias,
  cosenoBinario,
  elegirSerendipia,
  filtroDuroVoces,
  puntajeCrudo,
  seleccionarConMMR,
  similitudEntreAutores,
} from './motor';
export type { OpcionesMatch } from './motor';
export type { DesglosePuntaje, PerfilAutor, PerfilLector, ResultadoMatch } from './types';
