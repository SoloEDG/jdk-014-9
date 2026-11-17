import { ref, watch, computed, type Ref } from "vue";
import type {
  Bookmark,
  ComicDocument,
  ReadingLocation,
} from "../../../shared/document";
import { makeId } from "../../../shared/commands";
import { writeSession, type SavedSession } from "../lib/storage";
import { readingMetrics } from "../lib/metrics";
export function useProgress(
  doc: Ref<ComicDocument>,
  location: Ref<ReadingLocation>,
  saved: SavedSession | null,
) {
  const bookmarks = ref<Bookmark[]>(saved?.bookmarks ?? []),
    status = ref("本地自动保存已开启"),
    metrics = computed(() => readingMetrics(doc.value, location.value));
  function save() {
    status.value = writeSession({
      document: doc.value,
      location: location.value,
      bookmarks: bookmarks.value,
    });
  }
  watch([doc, location, bookmarks], save, { deep: true });
  function add() {
    const same = bookmarks.value.find(
      (b) =>
        b.location.pageId === location.value.pageId &&
        b.location.panelId === location.value.panelId,
    );
    if (same) {
      status.value = "此处分镜已收藏";
      return;
    }
    const c = doc.value.chapters.find((c) => c.id === location.value.chapterId);
    bookmarks.value.push({
      id: makeId("bookmark"),
      label: `${c?.title ?? "章节"} · 第 ${metrics.value.pageIndex} 页`,
      location: { ...location.value },
      created: Date.now(),
    });
  }
  function remove(id: string) {
    bookmarks.value = bookmarks.value.filter((b) => b.id !== id);
  }
  function reconcile() {
    const ids = new Set(
      doc.value.chapters.flatMap((c) => c.pages.map((p) => p.id)),
    );
    bookmarks.value = bookmarks.value.filter((b) => ids.has(b.location.pageId));
  }
  return { bookmarks, status, metrics, add, remove, reconcile, save };
}
