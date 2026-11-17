import type { ComicDocument } from "../../../shared/document";
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
