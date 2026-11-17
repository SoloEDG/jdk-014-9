import { ref, type Ref } from "vue";
import type { ComicDocument } from "../../../shared/document";
import { renameChapter, moveChapter, deleteChapter } from "../lib/operations";
export function useChapters(doc: Ref<ComicDocument>, changed: () => void) {
  const editing = ref(""),
    draft = ref(""),
    error = ref("");
  function begin(id: string) {
    editing.value = id;
    draft.value = doc.value.chapters.find((c) => c.id === id)?.title ?? "";
  }
  function rename() {
    if (!renameChapter(doc.value, editing.value, draft.value)) {
      error.value = "章节名需为 1–60 个字";
      return;
    }
    editing.value = "";
    error.value = "";
    changed();
  }
  function move(id: string, delta: number) {
    if (moveChapter(doc.value, id, delta)) changed();
  }
  function remove(id: string) {
    if (!deleteChapter(doc.value, id)) {
      error.value = "至少保留一个章节";
      return;
    }
    changed();
  }
  return { editing, draft, error, begin, rename, move, remove };
}
