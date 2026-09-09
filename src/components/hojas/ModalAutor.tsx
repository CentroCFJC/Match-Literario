'use client';

/* eslint-disable @next/next/no-img-element -- foto de tamaño fijo servida desde
   Google Drive; `next/image` exigiría declarar el host y no aporta a 92px. */

import { colorAvatar, etiquetasAutor, iniciales, textoOrigen } from '@/lib/autores';
import { HojaInferior } from '@/components/ui/HojaInferior';
import { IconoCerrar, IconoCheck, IconoFlechaDerecha, IconoMas } from '@/components/ui/iconos';
import { etiquetaDia, minutosAHora } from '@/lib/vocabulario';
import { useMatchStore } from '@/store/useMatchStore';

/** Pantalla 11: ficha completa del autor, con sus actividades. */
export function ModalAutor() {
  const autorId = useMatchStore((e) => e.modalAutorId);
  const autores = useMatchStore((e) => e.autores);
  const actividades = useMatchStore((e) => e.actividades);
  const agenda = useMatchStore((e) => e.agenda);
  const resultados = useMatchStore((e) => e.resultados);
  const alternarActividad = useMatchStore((e) => e.alternarActividad);
  const abrirModalAutor = useMatchStore((e) => e.abrirModalAutor);

  const autor = autores.find((a) => a.id === autorId);
  if (!autor) return null;

  const cerrar = () => abrirModalAutor(null);

  const suyas = actividades
    .filter((actividad) => actividad.autorIds.includes(autor.id))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicioMin - b.inicioMin);

  // "Coinciden en" (§6.5) sale del propio motor: son las etiquetas del
  // vocabulario que autor y lector comparten. Si el autor no venía en el
  // resultado, se muestran sus propias etiquetas.
  const resultado = resultados.find((r) => r.autorId === autor.id);
  const coincidencias = resultado?.coincidencias.length
    ? resultado.coincidencias.slice(0, 4)
    : [...autor.tematicas, ...autor.generos].slice(0, 2);

  // La bio larga solo se muestra para el autor destacado ("Tu match ideal es"):
  // en su tarjeta ya se ve la corta, y "Ver perfil" es el único lugar donde
  // amplía. Para el resto, el perfil se queda en la corta.
  const esDestacado = resultados[0]?.autorId === autor.id;
  const bio = esDestacado ? autor.bioLarga || autor.bioCorta : autor.bioCorta;

  return (
    <HojaInferior
      onCerrar={cerrar}
      altoMaximo="94%"
      zIndex={20}
      etiqueta={`Perfil de ${autor.nombreVisible}`}
    >
      <div className="relative rounded-t-[28px] bg-burgundy px-6 pb-[26px] pt-6 text-center">
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute right-4 top-4 flex h-[34px] w-[34px] items-center justify-center rounded-pill border-none bg-white/[.18] text-cream-white"
        >
          <IconoCerrar tamano={18} />
        </button>
        <div
          className="mx-auto mb-3 mt-[6px] flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-pill font-display text-[34px] font-extrabold text-cream-white"
          style={{ background: colorAvatar(autor) }}
        >
          {autor.fotoUrl ? (
            <img src={autor.fotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            iniciales(autor.nombreVisible)
          )}
        </div>
        <h2 className="m-0 mb-[3px] font-display text-[24px] font-extrabold text-cream-white">
          {autor.nombreVisible}
        </h2>
        <div className="font-body text-[13px] text-pink-light">{textoOrigen(autor)}</div>
      </div>

      <div className="px-6 pb-7 pt-[22px]">
        <p className="m-0 mb-5 text-pretty font-body text-[15px] leading-[1.55] text-ink">
          {bio}
        </p>

        {/* El destacado ya lo muestra en la pantalla de resultado. */}
        {autor.libroDestacado && !esDestacado ? (
          <p className="m-0 mb-5 font-body text-[14px] text-text-muted">
            Libro destacado:{' '}
            <span className="font-script text-[16px] italic text-burgundy">
              {autor.libroDestacado}
            </span>
          </p>
        ) : null}

        <div className="mb-[22px] flex flex-wrap gap-[7px]">
          {etiquetasAutor(autor).map((etiqueta) => (
            <span
              key={etiqueta}
              className="rounded-pill bg-surface-card px-3 py-[5px] font-body text-[12px] text-burgundy shadow-card"
            >
              {etiqueta}
            </span>
          ))}
        </div>

        {coincidencias.length > 0 ? (
          <div className="mb-6 rounded-[16px] bg-yellow px-4 py-[14px]">
            <div className="mb-2 font-display text-[13px] font-bold text-burgundy">Coinciden en</div>
            <div className="flex flex-wrap gap-[7px]">
              {coincidencias.map((coincidencia) => (
                <span
                  key={coincidencia}
                  className="rounded-pill bg-burgundy px-[11px] py-1 font-body text-[12px] text-cream-white"
                >
                  {coincidencia}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mb-3 font-display text-[16px] font-extrabold text-burgundy">
          Sus actividades
        </div>
        {suyas.length === 0 ? (
          <p className="m-0 font-body text-[14px] text-text-muted">
            Todavía no hay actividades programadas para este autor.
          </p>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {suyas.map((actividad) => {
              const anadida = agenda.includes(actividad.id);
              // Los demás autores de la misma actividad, si los hay.
              const acompanantes = actividad.autorIds
                .filter((id) => id !== autor.id)
                .map((id) => autores.find((a) => a.id === id)?.nombreVisible)
                .filter((nombre): nombre is string => Boolean(nombre));

              return (
                <div
                  key={actividad.id}
                  className="rounded-[16px] bg-surface-card p-[14px] shadow-card"
                >
                  <div className="mb-1 font-display text-[15px] font-bold text-ink">
                    {actividad.titulo}
                  </div>
                  <div className="mb-1 font-body text-[12px] text-text-muted">
                    {etiquetaDia(actividad.fecha)} · {minutosAHora(actividad.inicioMin)} ·{' '}
                    {actividad.lugar}
                  </div>
                  {acompanantes.length > 0 ? (
                    <div className="mb-2 font-body text-[12px] text-text-muted">
                      Con {acompanantes.join(', ')}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => alternarActividad(actividad.id)}
                    className="mt-2 inline-flex min-h-[40px] items-center gap-[6px] rounded-pill border-none px-[18px] font-display text-[13px] font-bold"
                    style={{
                      background: anadida ? 'var(--color-burgundy)' : 'var(--color-yellow)',
                      color: anadida ? 'var(--color-cream-white)' : 'var(--color-burgundy)',
                    }}
                  >
                    {anadida ? <IconoCheck tamano={15} /> : <IconoMas tamano={15} />}
                    {anadida ? 'En tu agenda' : 'Añadir a mi agenda'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {autor.webORed ? (
          <a
            href={autor.webORed}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-[5px] font-display text-[14px] font-bold text-magenta"
          >
            Ver su web o redes
            <IconoFlechaDerecha tamano={15} />
          </a>
        ) : null}
      </div>
    </HojaInferior>
  );
}
