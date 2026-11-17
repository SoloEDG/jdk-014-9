import type { ComicDocument, ReadingLocation } from "../../../shared/document";
export function readingMetrics(doc: ComicDocument, at: ReadingLocation) {
  const pages = doc.chapters.flatMap((c) => c.pages),
    i = pages.findIndex((p) => p.id === at.pageId),
    chapter = doc.chapters.find((c) => c.id === at.chapterId),
    page = pages[i];
  return {
    percent: Math.round(
      ((Math.max(0, i) + 1) / Math.max(1, pages.length)) * 100,
    ),
    pageIndex: (chapter?.pages.findIndex((p) => p.id === at.pageId) ?? 0) + 1,
    pageCount: chapter?.pages.length ?? 0,
    total: pages.length,
    panels: page?.panels.length ?? 0,
  };
}
