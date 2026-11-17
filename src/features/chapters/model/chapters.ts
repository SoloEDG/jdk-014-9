import { ref, type Ref } from "vue";
import type { ComicDocument } from "../../../shared/document";
import {
  renameChapter,
  moveChapter,
  deleteChapter,
  splitStoryboardPanel,
  fixPageOrder,
} from "../lib/operations";
import { fullRevisionReport, reorderReport, type RevisionReport } from "../lib/revision";

/**
 * 章节与分镜结构编辑。
 * 任何会改变听读顺序有效性的操作都产出 RevisionReport，
 * 并通过 onStructuralChange 抬升文档修订号，使旧播放队列作废。
 */
export function useChapters(
  doc: Ref<ComicDocument>,
  onStructuralChange: () => void,
) {
  const editing = ref(""),
    draft = ref(""),
    error = ref(""),
    report = ref<RevisionReport | null>(null);

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
  }
  function move(id: string, delta: number) {
    if (moveChapter(doc.value, id, delta)) {
      report.value = reorderReport(doc.value, id);
      onStructuralChange();
    }
  }
  function remove(id: string) {
    if (!deleteChapter(doc.value, id)) {
      error.value = "至少保留一个章节";
      return;
    }
    report.value = fullRevisionReport(doc.value);
    onStructuralChange();
  }
  function split(pageId: string, panelId: string) {
    report.value = splitStoryboardPanel(doc.value, pageId, panelId);
    onStructuralChange();
  }
  function repair(pageId: string) {
    const removed = fixPageOrder(doc.value, pageId);
    report.value = {
      kind: "repair",
      summary: removed.length
        ? `已剔除 ${removed.length} 个失效顺序条目，并补齐未收录线索`
        : "本页顺序没有失效条目，已补齐未收录线索",
      details: removed.length
        ? [`失效线索：${removed.join("、")}`]
        : ["全部引用有效。"],
      affectedPages: [],
      invalidCueIds: [],
      createdAt: Date.now(),
    };
    onStructuralChange();
  }
  function dismissReport() {
    report.value = null;
  }
  return {
    editing,
    draft,
    error,
    report,
    begin,
    rename,
    move,
    remove,
    split,
    repair,
    dismissReport,
  };
}
