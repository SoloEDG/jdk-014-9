import type {
  ComicDocument,
  ReadingLocation,
  ReadingMode,
} from "../../../shared/document";
import { resolveLocation, firstLocation } from "../../../shared/lookup";
export function normalize(
  doc: ComicDocument,
  at: ReadingLocation,
): ReadingLocation {
  const { chapter, page, panel } = resolveLocation(doc, at);
  if (!chapter || !page || !panel) return firstLocation(doc);
  return {
    ...at,
    chapterId: chapter.id,
    pageId: page.id,
    panelId: panel.id,
    zoom: Math.max(1, Math.min(3, at.zoom)),
    x: Number.isFinite(at.x) ? at.x : 0,
    y: Number.isFinite(at.y) ? at.y : 0,
  };
}
export function advance(
  doc: ComicDocument,
  at: ReadingLocation,
  delta: number,
  mode: ReadingMode,
): ReadingLocation {
  const positions: ReadingLocation[] = [];
  for (const c of doc.chapters)
    for (const p of c.pages)
      for (const panel of mode === "panel" ? p.panels : p.panels.slice(0, 1))
        positions.push({
          chapterId: c.id,
          pageId: p.id,
          panelId: panel.id,
          zoom: 1,
          x: 0,
          y: 0,
        });
  const i = positions.findIndex(
    (p) =>
      p.pageId === at.pageId && (mode === "page" || p.panelId === at.panelId),
  );
  return (
    positions[Math.max(0, Math.min(positions.length - 1, i + delta))] ?? at
  );
}
