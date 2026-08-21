import { AppMatchLiterario } from '@/components/AppMatchLiterario';

/**
 * Ruta única de la app. Toda la navegación entre pantallas es estado en
 * Zustand, no rutas: el flujo es un wizard lineal dentro de una sola vista y
 * separarlo en URLs solo añadiría recargas a mitad del cuestionario.
 */
export default function Page() {
  return <AppMatchLiterario />;
}
