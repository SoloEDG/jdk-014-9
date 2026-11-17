import type { ComicDocument } from "../../../shared/document";
import {
  repairPageOrder,
  splitPanel,
  type RevisionReport,
} from "./revision";

export function renameChapter(
  doc: ComicDocument,
  id: string,
  title: string,
): boolean {
  const c = doc.chapters.find((c) => c.id === id);
  if (!c || !title.trim() || title.trim().length > 60) return false;
  c.title = title.trim();
  return true;
}

export function moveChapter(
  doc: ComicDocument,
  id: string,
  delta: number,
): boolean {
  const i = doc.chapters.findIndex((c) => c.id === id),
    j = i + delta;
  if (i < 0 || j < 0 || j >= doc.chapters.length) return false;
  const [chapter] = doc.chapters.splice(i, 1);
  doc.chapters.splice(j, 0, chapter!);
  return true;
}

export function deleteChapter(doc: ComicDocument, id: string): boolean {
  if (doc.chapters.length < 2) return false;
  const i = doc.chapters.findIndex((c) => c.id === id);
  if (i < 0) return false;
  doc.chapters.splice(i, 1);
  return true;
}

/** 分镜拆分：返回修订报告，由上层据此刷新修订号与提示面板 */
export function splitStoryboardPanel(
  doc: ComicDocument,
  pageId: string,
  panelId: string,
): RevisionReport {
  return splitPanel(doc, pageId, panelId);
}

/** 一键修订单页听读顺序，返回被剔除的失效线索 id */
export function fixPageOrder(
  doc: ComicDocument,
  pageId: string,
): string[] {
  for (const chapter of doc.chapters) {
    const page = chapter.pages.find((p) => p.id === pageId);
    if (page) return repairPageOrder(page);
  }
  return [];
}
