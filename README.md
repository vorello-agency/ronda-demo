# Ronda · Club de Tenis

Landing editorial y sistema de reservas simulado de un club de tenis conceptual, diseñados y desarrollados por Vorello Agency. Construida con Next.js 16 (App Router), React 19, TypeScript y Tailwind CSS 4.

> **Proyecto conceptual.** El club, las instalaciones y las actividades son ficticios, y las fotografías fueron generadas con IA. `/reservar` simula la disponibilidad y la confirmación: no se realizan reservas, inscripciones ni pagos reales, y nada se guarda al cerrar la página.

## Requisitos

- Node.js 22.14 o superior
- npm

No se necesitan variables de entorno ni credenciales.

## Instalación

```sh
npm ci
```

## Desarrollo

```sh
npm run dev
```

Abrir `http://127.0.0.1:3000`. Para usar otro puerto: `npm run dev -- --port 3017`.

## Calidad

```sh
npm test
npm run lint
npm run typecheck
```

`test` ejecuta las pruebas de la lógica de reservas (`src/**/*.test.ts`) con el corredor nativo de Node, sin dependencias. `typecheck` genera los tipos de rutas de Next.js (`next typegen`) y luego ejecuta `tsc --noEmit`.

## Producción

```sh
npm run build
npm run start
```

`build` compila con Webpack (`next build --webpack`) y prerenderiza `/` y `/reservar` como contenido estático. `start` sirve la compilación en `http://127.0.0.1:3000`.

## Estructura

- `src/app/`: layout, home, ruta `reservar/`, estilos globales, fuentes locales, íconos (`icon.svg`, `apple-icon.png`, `favicon.ico`) e imagen para compartir (`opengraph-image.jpg`).
- `src/components/`: secciones de la landing, enlaces de reserva, atribución del estudio y aviso de clases.
- `src/components/booking/`: interfaz de reservas (plano, horarios, resumen, confirmación, barra fija) y su hoja `booking.css`.
- `src/lib/booking/`: lógica de reservas pura y probada: reloj del club, disponibilidad simulada, URL, conflictos y textos.
- `src/config/site.ts`: identidad, URL pública (base de los enlaces de la imagen para compartir), navegación y textos de los avisos.
- `src/data/courts.ts` y `src/data/club-plan.ts`: datos de las tres canchas y geometría del club.
- `public/images/`: fotografías WebP optimizadas.

## Fuentes

Anton y DM Sans se distribuyen localmente en `src/app/fonts/` bajo la SIL Open Font License 1.1. Sus licencias están junto a los archivos de fuente.
