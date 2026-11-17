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

/**
 * 逐格顺序与听读顺序保持一致：
 * 按页面 cueOrder 中第一次出现的分镜线索确定该页内分镜的先后，
 * 未被 cueOrder 收录的分镜按几何位置追加——避免两种模式剧情位置错位。
 */
function orderedPanels(doc: ComicDocument): {
  chapterId: string;
  pageId: string;
  panelId: string;
}[] {
  const positions: { chapterId: string; pageId: string; panelId: string }[] =
    [];
  for (const chapter of doc.chapters) {
    for (const page of chapter.pages) {
      const ordered: string[] = [];
      const seen = new Set<string>();
      const panelOfCue = (cueId: string) =>
        page.panels.find((panel) =>
          panel.cues.some((cue) => cue.id === cueId),
        );
      for (const cueId of page.cueOrder) {
        const panel = panelOfCue(cueId);
        if (panel && !seen.has(panel.id)) {
          seen.add(panel.id);
          ordered.push(panel.id);
        }
      }
      for (const panel of page.panels)
        if (!seen.has(panel.id)) ordered.push(panel.id);
      for (const panelId of ordered)
        positions.push({
          chapterId: chapter.id,
          pageId: page.id,
          panelId,
        });
    }
  }
  return positions;
}

export function advance(
  doc: ComicDocument,
  at: ReadingLocation,
  delta: number,
  mode: ReadingMode,
): ReadingLocation {
  if (mode === "panel") {
    const positions = orderedPanels(doc);
    const i = positions.findIndex(
      (p) => p.pageId === at.pageId && p.panelId === at.panelId,
    );
    const next =
      positions[Math.max(0, Math.min(positions.length - 1, i + delta))];
    return next
      ? { ...at, ...next, zoom: 1, x: 0, y: 0 }
      : { ...at };
  }

  // 整页模式按页推进
  const pages: ReadingLocation[] = [];
  for (const c of doc.chapters)
    for (const p of c.pages)
      pages.push({
        chapterId: c.id,
        pageId: p.id,
        panelId: p.panels[0]!.id,
        zoom: 1,
        x: 0,
        y: 0,
      });
  const i = pages.findIndex((p) => p.pageId === at.pageId);
  return pages[Math.max(0, Math.min(pages.length - 1, i + delta))] ?? at;
}
