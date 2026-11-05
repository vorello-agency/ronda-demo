# Ronda · Club de Tenis

Landing editorial de un club de tenis conceptual, diseñada y desarrollada por Vorello Agency. Construida con Next.js 16 (App Router), React 19, TypeScript y Tailwind CSS 4.

> **Proyecto conceptual.** El club, las instalaciones y las actividades son ficticios, y las fotografías fueron generadas con IA. Los accesos de reserva y de clases muestran un aviso de demostración: no se realizan reservas, inscripciones ni pagos reales.

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
npm run lint
npm run typecheck
```

`typecheck` genera los tipos de rutas de Next.js (`next typegen`) y luego ejecuta `tsc --noEmit`.

## Producción

```sh
npm run build
npm run start
```

`build` compila con Webpack (`next build --webpack`) y prerenderiza la página como contenido estático. `start` sirve la compilación en `http://127.0.0.1:3000`.

## Estructura

- `src/app/`: layout, página, estilos globales y fuentes locales.
- `src/components/`: secciones de la landing y acciones modales.
- `src/config/site.ts`: identidad, navegación y textos de los avisos.
- `src/data/courts.ts`: datos de las tres canchas.
- `public/images/`: fotografías WebP optimizadas.

## Fuentes

Anton y DM Sans se distribuyen localmente en `src/app/fonts/` bajo la SIL Open Font License 1.1. Sus licencias están junto a los archivos de fuente.
