import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Match Literario · 17 Feria del Libro de Manizales',
  description:
    'Responde unas preguntas rápidas sobre lo que te gusta leer y te armamos una ruta a tu medida por la Feria.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#faf6e9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
