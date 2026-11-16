import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} · ${site.descriptor}`,
    short_name: site.name,
    description: site.description,
    lang: "es-UY",
    start_url: "/",
    display: "browser",
    background_color: "#eeece3",
    theme_color: "#263f9e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
