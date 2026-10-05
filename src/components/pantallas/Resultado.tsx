'use client';

/* eslint-disable @next/next/no-img-element -- marco y fotos de tamaño fijo. */

import { motion } from 'framer-motion';
import { useState } from 'react';

import { BotonPrincipal } from '@/components/ui/BotonPrincipal';
import {
  IconoAdvertencia,
  IconoCheck,
  IconoFlechaDerecha,
  IconoMas,
  IconoReiniciar,
} from '@/components/ui/iconos';
import { TextoConCursivas } from '@/components/ui/TextoConCursivas';
import { useCalcularMatch } from '@/hooks/useCalcularMatch';
import { useActualizarRespuesta } from '@/hooks/useEnviarRespuesta';
import { chipsAutor, colorAvatar, iniciales, textoOrigen } from '@/lib/autores';
import type { Autor } from '@/lib/data/types';
import { SECCIONES_RESULTADO } from '@/lib/match';
import type { ResultadoMatch } from '@/lib/match';
import { useMatchStore } from '@/store/useMatchStore';

/** Pantalla 10: el resultado del match, con sus tres estados de carga. */
export function Resultado() {
  const estado = useMatchStore((e) => e.estadoResultado);

  if (estado === 'error') return <ResultadoError />;
  if (estado === 'skeleton') return <ResultadoEsqueleto />;
  return <ResultadoListo />;
}

// ---------------------------------------------------------------------------

function ResultadoError() {
  const calcular = useCalcularMatch();
  return (
    <div className="flex h-full flex-col items-center justify-center px-11 text-center">
      <div className="mb-[14px] text-coral-2">
        <IconoAdvertencia tamano={46} />
      </div>
      <h2 className="m-0 mb-2 font-display text-[22px] font-extrabold text-burgundy">
        No pudimos cargar los autores
      </h2>
      <p className="m-0 mb-[26px] font-body text-[15px] leading-[1.5] text-text-muted">
        Revisa tu conexión e inténtalo de nuevo.
      </p>
      <button
        type="button"
        onClick={() => void calcular()}
        className="min-h-[50px] rounded-pill border-none bg-magenta px-[34px] font-display text-[16px] font-bold text-cream-white"
      >
        Reintentar
      </button>
    </div>
  );
}

function ResultadoEsqueleto() {
  return (
    <div className="flm-skeleton flex-1 overflow-hidden px-6 py-5" aria-busy="true">
      <div className="mb-5 h-[260px] rounded-l bg-cream" />
      <div className="mb-4 h-4 w-[55%] rounded-s bg-cream" />
      <div className="flex gap-3">
        <div className="h-24 flex-1 rounded-[18px] bg-cream" />
        <div className="h-24 flex-1 rounded-[18px] bg-cream" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ResultadoListo() {
  const resultados = useMatchStore((e) => e.resultados);
  const autores = useMatchStore((e) => e.autores);
  const agenda = useMatchStore((e) => e.agenda);
  const irA = useMatchStore((e) => e.irA);
  const abrirHojaExtra = useMatchStore((e) => e.abrirHojaExtra);
  const abrirHojaFeedback = useMatchStore((e) => e.abrirHojaFeedback);
  const reiniciar = useMatchStore((e) => e.reiniciar);
  const pedirReinicio = useMatchStore((e) => e.pedirReinicio);
  const agendaSucia = useMatchStore((e) => e.agendaSucia);
  const fijarAgendaSucia = useMatchStore((e) => e.fijarAgendaSucia);
  const actualizarRespuesta = useActualizarRespuesta();
  // Cada sección se expande por su cuenta: quien solo quiere más de lo suyo no
  // tiene que cargar también con la lista de descubrimiento, y al revés.
  const [matchExpandido, setMatchExpandido] = useState(false);
  const [tambienExpandido, setTambienExpandido] = useState(false);

  const porId = new Map(autores.map((autor) => [autor.id, autor]));
  const emparejados = resultados
    .map((resultado) => ({ resultado, autor: porId.get(resultado.autorId) }))
    .filter((par): par is { resultado: ResultadoMatch; autor: Autor } => Boolean(par.autor));

  if (emparejados.length === 0) return <ResultadoEsqueleto />;

  const destacado = emparejados[0];
  const corte = SECCIONES_RESULTADO.destacado + SECCIONES_RESULTADO.match.total;

  // Cada sección arranca recortada para que la primera pantalla sea corta.
  const todosDelMatch = emparejados.slice(SECCIONES_RESULTADO.destacado, corte);
  const delMatch = matchExpandido
    ? todosDelMatch
    : todosDelMatch.slice(0, SECCIONES_RESULTADO.match.visibles);

  const todosTambien = emparejados.slice(corte);
  const tambien = tambienExpandido
    ? todosTambien
    : todosTambien.slice(0, SECCIONES_RESULTADO.tambien.visibles);

  const ocultosMatch = todosDelMatch.length - delMatch.length;
  const ocultosTambien = todosTambien.length - tambien.length;

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-24">
        <CabeceraDestacado par={destacado} />

        {delMatch.length > 0 ? (
          <div className="px-6 pt-[22px]">
            <h3 className="m-0 mb-[14px] font-display text-[18px] font-extrabold text-burgundy">
              Tu match literario
            </h3>
            <div className="flex flex-col gap-3">
              {delMatch.map((par) => (
                <TarjetaAutor key={par.autor.id} par={par} />
              ))}
            </div>

            {ocultosMatch > 0 ? (
              <BotonVerMas cuantos={ocultosMatch} onClick={() => setMatchExpandido(true)} />
            ) : null}
          </div>
        ) : null}

        {tambien.length > 0 ? (
          <div className="px-6 pt-6">
            <h3 className="m-0 mb-[14px] font-display text-[16px] font-bold text-text-muted">
              También te puede interesar
            </h3>
            <div className="flex flex-col gap-3">
              {tambien.map((par) => (
                <TarjetaAutor key={par.autor.id} par={par} compacta />
              ))}
            </div>

            {ocultosTambien > 0 ? (
              <BotonVerMas cuantos={ocultosTambien} onClick={() => setTambienExpandido(true)} />
            ) : null}
          </div>
        ) : null}

        <div className="px-6 pt-[26px]">
          <div className="flex flex-col gap-[10px]">
            <TarjetaEnlace
              titulo="Cuéntanos más"
              subtitulo="Cinco preguntas para mejorar la Feria · opcional"
              onClick={() => abrirHojaExtra(true)}
            />
            <TarjetaEnlace
              titulo="¿Te sirvió tu match?"
              subtitulo="Déjanos tu opinión · opcional"
              onClick={() => abrirHojaFeedback(true)}
            />
          </div>
        </div>

        <div className="px-6 pt-[22px] text-center">
          <button
            type="button"
            onClick={() => (agenda.length > 0 ? pedirReinicio(false) : reiniciar())}
            className="inline-flex items-center gap-[7px] border-none bg-transparent font-display text-[14px] font-bold text-magenta"
          >
            <IconoReiniciar tamano={16} />
            Reiniciar el test
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--surface-page)] from-[68%] to-transparent px-5 pb-5 pt-[14px]">
        <BotonPrincipal
          variante="oscuro"
          onClick={() => {
            // "Mi agenda" es el disparador que persiste los cambios de agenda:
            // se añaden/quitan autores en esta pantalla y se guardan al ver la
            // agenda. Solo se escribe si la agenda está sucia; tocar el botón
            // sin haber cambiado nada no toca Sheets.
            if (agendaSucia) {
              void actualizarRespuesta().then((ok) => {
                if (ok) fijarAgendaSucia(false);
              });
            }
            irA('agenda');
          }}
          className="!text-[16px]"
        >
          Mi agenda
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-pill bg-yellow px-[7px] text-[13px] font-extrabold text-burgundy">
            {agenda.length}
          </span>
        </BotonPrincipal>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface Par {
  resultado: ResultadoMatch;
  autor: Autor;
}

/** Cabecera burdeos con el match principal dentro del marco ilustrado. */
function CabeceraDestacado({ par }: { par: Par }) {
  const { autor, resultado } = par;
  const abrirModalAutor = useMatchStore((e) => e.abrirModalAutor);
  const { anadido, alternar } = useAgendaDeAutor(autor);

  return (
    <div className="relative bg-burgundy px-[26px] pb-[30px] pt-[26px] text-center">
      <div className="mb-4 font-body text-[13px] tracking-[.04em] text-pink-light">
        Tu match ideal es
      </div>

      <div className="relative mx-auto mb-4 h-[212px] w-[196px]">
        <div
          className="absolute bottom-[22%] left-[22%] right-[22%] top-[20%] overflow-hidden rounded-[4px]"
          style={{ background: colorAvatar(autor) }}
        >
          {autor.fotoUrl ? (
            <img src={autor.fotoUrl} alt={autor.nombreVisible} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-[34px] font-extrabold text-cream-white">
              {iniciales(autor.nombreVisible)}
            </div>
          )}
        </div>
        <img
          src="/marco.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        {/*
          El centrado va en este contenedor y NO en el elemento animado.
          Framer Motion escribe `transform` en línea para la escala, lo que pisa
          el `-translate-x-1/2` de Tailwind y dejaba el porcentaje desplazado a
          la derecha. Con un contenedor a todo el ancho y `justify-center`, el
          centrado no depende de ninguna transformación.
        */}
        <div className="absolute bottom-[-2px] left-0 right-0 z-[2] flex justify-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.35, ease: [0.22, 0.9, 0.32, 1] }}
            className="rounded-pill bg-yellow px-[14px] py-1 font-display text-[15px] font-extrabold text-burgundy shadow-card"
          >
            {resultado.porcentaje}%
          </motion.div>
        </div>
      </div>

      <h2 className="m-0 mb-1 mt-2 font-display text-[26px] font-extrabold text-cream-white">
        {autor.nombreVisible}
      </h2>
      <div className="mb-4 font-body text-[13px] text-pink-light">{textoOrigen(autor)}</div>

      {autor.bioCorta ? (
        <p className="m-0 mb-[14px] text-pretty font-body text-[14px] leading-[1.5] text-cream-white">
          <TextoConCursivas texto={autor.bioCorta} segmentos={autor.bioCortaSegmentos} />
        </p>
      ) : null}

      {autor.libroDestacado ? (
        <p className="m-0 mb-[18px] font-body text-[13px] text-pink-light">
          Libro destacado:{' '}
          <span className="font-script text-[16px] italic text-yellow">{autor.libroDestacado}</span>
        </p>
      ) : null}

      <div className="mb-[18px] flex flex-wrap justify-center gap-2">
        {chipsAutor(autor).map((chip) => (
          <span
            key={chip}
            className="rounded-pill bg-white/[.14] px-3 py-[5px] font-body text-[12px] text-cream-white"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="flex justify-center gap-[10px]">
        <button
          type="button"
          onClick={() => abrirModalAutor(autor.id)}
          className="min-h-[44px] rounded-pill border-none bg-cream-white px-[22px] font-display text-[13px] font-bold text-burgundy"
        >
          Ver perfil
        </button>
        <button
          type="button"
          onClick={alternar}
          className="inline-flex min-h-[44px] items-center gap-[7px] rounded-pill border-none px-[22px] font-display text-[13px] font-bold"
          style={{
            background: anadido ? 'var(--color-yellow)' : 'var(--color-magenta)',
            color: anadido ? 'var(--color-burgundy)' : 'var(--color-cream-white)',
          }}
        >
          {anadido ? <IconoCheck tamano={18} /> : <IconoMas tamano={18} />}
          {anadido ? 'Añadido' : 'Añadir a mi agenda'}
        </button>
      </div>
    </div>
  );
}

/** Tarjeta de autor de las listas. `compacta` es la variante de "También…". */
function TarjetaAutor({ par, compacta = false }: { par: Par; compacta?: boolean }) {
  const { autor, resultado } = par;
  const abrirModalAutor = useMatchStore((e) => e.abrirModalAutor);
  const { anadido, alternar } = useAgendaDeAutor(autor);

  return (
    <div
      className="flex items-center gap-[14px] rounded-[18px] bg-surface-card"
      style={{
        padding: compacta ? '12px 14px' : '14px',
        boxShadow: compacta ? '0 4px 14px -8px rgba(74,18,33,.16)' : 'var(--shadow-card)',
      }}
    >
      <button
        type="button"
        onClick={() => abrirModalAutor(autor.id)}
        aria-label={`Ver el perfil de ${autor.nombreVisible}`}
        className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-pill border-none font-display font-extrabold text-cream-white"
        style={{
          width: compacta ? 48 : 56,
          height: compacta ? 48 : 56,
          fontSize: compacta ? 17 : 20,
          background: colorAvatar(autor),
          opacity: compacta ? 0.92 : 1,
        }}
      >
        {autor.fotoUrl ? (
          <img src={autor.fotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          iniciales(autor.nombreVisible)
        )}
      </button>

      <button
        type="button"
        onClick={() => abrirModalAutor(autor.id)}
        className="min-w-0 flex-1 border-none bg-transparent p-0 text-left"
      >
        <div className="flex items-center gap-2">
          <span
            className="font-display font-bold text-ink"
            style={{ fontSize: compacta ? 15 : 16 }}
          >
            {autor.nombreVisible}
          </span>
          <span
            className="font-display font-extrabold"
            style={{
              fontSize: compacta ? 12 : 13,
              color: compacta ? 'var(--text-muted)' : 'var(--color-magenta)',
            }}
          >
            {resultado.porcentaje}%
          </span>
        </div>

        {compacta ? (
          <div className="mt-[2px] font-body text-[12px] text-text-muted">{textoOrigen(autor)}</div>
        ) : (
          <div className="mt-[6px] flex flex-wrap gap-[5px]">
            {chipsAutor(autor, 2).map((chip) => (
              <span
                key={chip}
                className="rounded-pill bg-cream px-[9px] py-[3px] font-body text-[11px] text-burgundy"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={alternar}
        aria-label={
          anadido ? `Quitar a ${autor.nombreVisible} de mi agenda` : `Añadir a ${autor.nombreVisible} a mi agenda`
        }
        className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-pill border-none text-cream-white transition-colors duration-150"
        style={{ background: anadido ? 'var(--color-burgundy)' : 'var(--color-magenta)' }}
      >
        {anadido ? <IconoCheck tamano={19} /> : <IconoMas tamano={19} />}
      </button>
    </div>
  );
}

/** Botón que expande una sección de la lista de autores. */
function BotonVerMas({ cuantos, onClick }: { cuantos: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 min-h-[46px] w-full rounded-pill border-none bg-transparent font-display text-[14px] font-bold text-burgundy shadow-[inset_0_0_0_2px_var(--color-burgundy)]"
    >
      {cuantos === 1 ? 'Ver 1 autor más' : `Ver ${cuantos} autores más`}
    </button>
  );
}

function TarjetaEnlace({
  titulo,
  subtitulo,
  onClick,
}: {
  titulo: string;
  subtitulo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-[16px] border-none bg-cream px-[18px] py-4 text-left"
    >
      <span>
        <span className="block font-display text-[15px] font-bold text-burgundy">{titulo}</span>
        <span className="font-body text-[12px] text-text-muted">{subtitulo}</span>
      </span>
      <span className="flex-shrink-0 text-burgundy">
        <IconoFlechaDerecha tamano={20} />
      </span>
    </button>
  );
}

/**
 * Añade o quita a un autor de la agenda (todas sus actividades a la vez) y
 * muestra el toast correspondiente. Es el comportamiento del botón "+".
 */
export function useAgendaDeAutor(autor: Autor) {
  const actividades = useMatchStore((e) => e.actividades);
  const agenda = useMatchStore((e) => e.agenda);
  const alternarAutor = useMatchStore((e) => e.alternarAutor);
  const mostrarToast = useMatchStore((e) => e.mostrarToast);

  // Una actividad puede tener varios autores: la de este autor es cualquiera en
  // cuya lista `autor_ids` aparezca.
  const suyas = actividades.filter((a) => a.autorIds.includes(autor.id)).map((a) => a.id);
  const anadido = suyas.length > 0 && suyas.every((id) => agenda.includes(id));

  return {
    anadido,
    alternar: () => {
      if (suyas.length === 0) {
        mostrarToast(`${autor.nombreVisible} aún no tiene actividades programadas`);
        return;
      }
      alternarAutor(autor.id);
      mostrarToast(
        anadido ? `${autor.nombreVisible} quitado de tu agenda` : `${autor.nombreVisible} añadido a tu agenda`,
      );
    },
  };
}
