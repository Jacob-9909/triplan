import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Triplan",
    short_name: "Triplan",
    description: "가고 싶은 곳을 모으고 함께 여행을 계획하는 플래너",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7f1",
    theme_color: "#cc4126",
    lang: "ko",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
