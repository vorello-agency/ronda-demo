# Ronda · Club de Tenis

> Landing editorial y sistema de reservas simulado para un club de tenis contemporáneo. Caso de estudio y proyecto conceptual para el portfolio profesional de **Vorello Agency**.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

🌐 **Demo en vivo:** [ronda-demo.vorelloagency.com](https://ronda-demo.vorelloagency.com)

<p align="center">
  <img src="src/app/opengraph-image.jpg" alt="Ronda · Club de Tenis" width="100%" />
</p>

---

## 1. Propósito del proyecto

**Ronda** es un club de tenis conceptual con dos piezas: una landing editorial y un flujo de reservas. Demuestra dirección de arte digital, ingeniería frontend y lógica de producto probada, y cuenta con una identidad propia (cobalto, citrón y mineral) distinta a la de Lift.

> **Aviso de transparencia:** proyecto conceptual con fines demostrativos para el portfolio de Vorello Agency. El club, sus instalaciones y sus actividades son ficticios, y las fotografías fueron generadas con IA. `/reservar` simula la disponibilidad y la confirmación: no se realizan reservas, inscripciones ni pagos reales, y nada se guarda al cerrar la página.

## 2. Qué demuestra

- **Reservas en cinco pasos:** fecha → cancha → horario → resumen → confirmación simulada. El estado vive en la URL, por lo que cada selección se puede compartir y recargar.
- **Lógica pura y probada:** el reloj del club, la disponibilidad, los conflictos, la selección y los textos viven en `src/lib/booking/` sin depender de React. Se prueban con el corredor nativo de Node (más de 200 pruebas, sin dependencias de testing).
- **Disponibilidad simulada y determinista:** igual para todos los visitantes y estable entre recargas. El horario es siempre el del club (Montevideo), sin importar la zona del dispositivo.
- **Plano del club interactivo:** dibujado en SVG a partir de una geometría tipada, con vistas, paisaje y recorrido desde la calle hasta cada cancha.
- **Accesibilidad:** diálogos nativos con foco contenido y cierre con `Escape`, desplegables nativos, navegación por teclado y respeto de `prefers-reduced-motion`.
- **Rendimiento:** páginas prerrenderizadas como contenido estático, fuentes locales y fotografías WebP optimizadas.
- **SEO técnico:** metadatos, Open Graph, canonical, `sitemap.xml`, `robots.txt` y `manifest`.

## 3. Primeros pasos

Requisitos: Node.js 22.14 o superior y npm. No se necesitan variables de entorno ni credenciales.

```sh
git clone https://github.com/vorello-agency/ronda-demo.git
cd ronda-demo
npm ci
npm run dev
```

Abrir `http://127.0.0.1:3000`. Para otro puerto: `npm run dev -- --port 3017`.

### Comandos

| Comando             | Descripción                                                                  |
| :------------------ | :--------------------------------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo en `http://127.0.0.1:3000`                            |
| `npm test`          | Pruebas de la lógica de reservas y del plano (`src/**/*.test.ts`)            |
| `npm run lint`      | ESLint                                                                       |
| `npm run typecheck` | Genera los tipos de rutas (`next typegen`) y ejecuta `tsc --noEmit`          |
| `npm run build`     | Compila para producción con Webpack y prerenderiza `/` y `/reservar`         |
| `npm run start`     | Sirve la compilación en `http://127.0.0.1:3000`                              |

## 4. Estructura

```text
ronda-demo/
├── public/images/          # Fotografías WebP optimizadas
└── src/
    ├── app/                # Layout, home, ruta reservar/, estilos, fuentes locales, íconos, sitemap, robots y manifest
    ├── components/         # Secciones de la landing y atribución del estudio
    │   └── booking/        # Interfaz de reservas: plano, horarios, resumen, confirmación y barra fija
    ├── config/site.ts      # Identidad, URL pública, navegación y avisos
    ├── data/               # Canchas y geometría del club
    └── lib/booking/        # Lógica pura de reservas, con sus pruebas
```

## 5. Licencia y créditos

- **Diseño y desarrollo:** [Vorello Agency](https://vorelloagency.com).
- **Código:** [MIT](LICENSE). La licencia cubre el código, no las fotografías ni el logotipo de Vorello Agency.
- **Fotografías:** generadas con IA, solo con fines demostrativos de este proyecto.
- **Fuentes:** Anton y DM Sans, distribuidas localmente bajo la SIL Open Font License 1.1. Sus licencias están junto a los archivos en `src/app/fonts/`.
