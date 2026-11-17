import type { ComicDocument, ReadingLocation } from "./document";
export function resolveLocation(doc: ComicDocument, at: ReadingLocation) {
  const chapter =
    doc.chapters.find((c) => c.id === at.chapterId) ?? doc.chapters[0];
  const page =
    chapter?.pages.find((p) => p.id === at.pageId) ?? chapter?.pages[0];
  const panel =
    page?.panels.find((p) => p.id === at.panelId) ?? page?.panels[0];
  return { chapter, page, panel };
}
export function firstLocation(doc: ComicDocument): ReadingLocation {
  const c = doc.chapters[0],
    p = c?.pages[0];
  return {
    chapterId: c?.id ?? "",
    pageId: p?.id ?? "",
    panelId: p?.panels[0]?.id ?? "",
    zoom: 1,
    x: 0,
    y: 0,
  };
}
