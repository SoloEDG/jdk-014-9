import type { ComicPage, Panel, ReadingMode } from "../../../shared/document";
export function frameStyle(page: ComicPage, panel: Panel, mode: ReadingMode) {
  const r =
    mode === "panel"
      ? panel.rect
      : { x: 0, y: 0, width: page.width, height: page.height };
  return {
    aspectRatio: `${r.width}/${r.height}`,
    width: "100%",
    backgroundImage: `url("${page.image}")`,
    backgroundSize: `${(page.width / r.width) * 100}% ${(page.height / r.height) * 100}%`,
    backgroundPosition: `${(r.x / (page.width - r.width || 1)) * 100}% ${(r.y / (page.height - r.height || 1)) * 100}%`,
  };
}
export function constrainPan(x: number, y: number, zoom: number) {
  const limit = (zoom - 1) * 220;
  return {
    x: Math.max(-limit, Math.min(limit, x)),
    y: Math.max(-limit, Math.min(limit, y)),
  };
}
