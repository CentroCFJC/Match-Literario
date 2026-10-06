'use client';

/* eslint-disable @next/next/no-img-element -- gráficos decorativos de tamaño
   fijo servidos desde /public. */

import { motion } from 'framer-motion';

import { BotonPrincipal } from '@/components/ui/BotonPrincipal';
import { CabeceraPaso } from '@/components/ui/CabeceraPaso';
import { Chip } from '@/components/ui/Chip';
import { OpcionTarjeta } from '@/components/ui/OpcionTarjeta';
import { ayudaDelPaso, pasoPorNumero } from '@/lib/pasos';
import { useMatchStore } from '@/store/useMatchStore';

/**
 * Pasos 1 a 6 del wizard.
 *
 * Un solo componente los cubre todos: la diferencia entre pasos es
 * configuración (`src/lib/pasos.ts`), no código.
 */
export function Wizard() {
  const paso = useMatchStore((estado) => estado.paso);
  const seleccion = useMatchStore((estado) => estado.seleccion);
  const alternarEnLista = useMatchStore((estado) => estado.alternarEnLista);
  const fijarUnico = useMatchStore((estado) => estado.fijarUnico);
  const siguientePaso = useMatchStore((estado) => estado.siguientePaso);
  const pasoAnterior = useMatchStore((estado) => estado.pasoAnterior);

  const config = pasoPorNumero(paso);
  if (!config) return null;

  const valor = seleccion[config.clave];
  const seleccionadas = config.unica
    ? valor === null
      ? []
      : [valor as string]
    : (valor as string[]);
  const alTope = !config.unica && config.max !== undefined && seleccionadas.length >= config.max;
  const comodinActivo = Boolean(config.comodin && seleccionadas.includes(config.comodin));
  const sinSeleccion = seleccionadas.length === 0;

  const alElegir = (label: string) => {
    if (config.unica) {
      fijarUnico(config.clave as 'edad', label);
    } else {
      alternarEnLista(
        config.clave as 'mood' | 'generos' | 'tematicas' | 'voces',
        label,
        config.max,
        config.comodin,
      );
    }
  };

  return (
    <div className="flex h-full flex-col">
      <CabeceraPaso
        numero={config.num}
        titulo={config.titulo}
        ayuda={ayudaDelPaso(config)}
        onVolver={pasoAnterior}
      />

      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-2 pt-4">
        {/*
          Solo animación de ENTRADA, sin `AnimatePresence mode="wait"`.
          Con salida, dos toques rápidos en "Continuar" dejaban la salida a
          medias: el paso viejo no se desmontaba, el nuevo no se montaba y el
          wizard se quedaba congelado con el encabezado de un paso y los chips
          de otro. Cambiar de `key` desmonta al instante y el paso nuevo entra
          con un fundido: se ve igual y no hay estado intermedio que se atasque.
        */}
        <motion.div
          key={config.num}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 0.9, 0.32, 1] }}
        >
            {config.layout === 'grid' ? (
              <div
                className="flex flex-wrap gap-[10px]"
                role={config.unica ? 'radiogroup' : 'group'}
                aria-label={config.titulo}
              >
                {config.opciones.map((opcion) => {
                  const seleccionado = seleccionadas.includes(opcion.label);
                  // Con el comodín activo el resto se apaga; sin él, se apagan
                  // los no seleccionados cuando ya se llegó al máximo.
                  const deshabilitado =
                    !seleccionado &&
                    ((comodinActivo && opcion.label !== config.comodin) || alTope);
                  return (
                    <Chip
                      key={opcion.label}
                      label={opcion.label}
                      seleccionado={seleccionado}
                      deshabilitado={deshabilitado}
                      onClick={() => alElegir(opcion.label)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-3" role="radiogroup" aria-label={config.titulo}>
                {config.opciones.map((opcion) => (
                  <OpcionTarjeta
                    key={opcion.label}
                    label={opcion.label}
                    hint={opcion.hint}
                    seleccionada={seleccionadas.includes(opcion.label)}
                    onClick={() => alElegir(opcion.label)}
                  />
                ))}
              </div>
            )}

            {config.decoracion ? (
              <div
                className="pb-2"
                style={{
                  display: 'flex',
                  justifyContent: config.decoracion.alineacion,
                  marginTop: config.decoracion.margenSuperior,
                  pointerEvents: 'none',
                }}
                aria-hidden="true"
              >
                <img
                  src={config.decoracion.src}
                  alt=""
                  style={{ width: config.decoracion.ancho, height: 'auto', opacity: 0.62 }}
                />
              </div>
            ) : null}
        </motion.div>
      </div>

      <div className="flex-shrink-0 bg-surface-page px-6 pb-[22px] pt-[14px]">
        <BotonPrincipal deshabilitado={sinSeleccion} onClick={siguientePaso}>
          Continuar
        </BotonPrincipal>
      </div>
    </div>
  );
}
