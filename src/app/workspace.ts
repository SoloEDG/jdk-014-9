import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { demoDocument, useLibrary } from "../features/library";
import { useChapters } from "../features/chapters";
import { useReader } from "../features/reader";
import { useAudio } from "../features/audio";
import { useProgress, readSession } from "../features/progress";

export function useWorkspace() {
  const saved = readSession();
  const doc = ref(saved?.document ?? demoDocument());
  /**
   * 文档结构修订号。任何会影响听读顺序有效性的编辑（章节移动/删除、
   * 分镜拆分、顺序修订）都抬升它；播放队列据此让旧代际整体作废。
   */
  const revision = ref(0);
  const reader = useReader(doc);
  if (saved) reader.dispatch({ type: "restore", location: saved.location });

  const progress = useProgress(doc, reader.location, saved);
  const library = useLibrary(doc, (id) => {
    reader.dispatch({ type: "chapter", id });
    progress.reconcile();
    bumpRevision();
  });

  const chapters = useChapters(doc, bumpRevision);
  const currentPage = computed(() => reader.current.value.page);
  const chapterIndex = computed(() =>
    doc.value.chapters.findIndex((c) => c.id === reader.location.value.chapterId),
  );

  function bumpRevision() {
    revision.value++;
    // 结构变化后阅读位置可能指向已删除的分镜，先归一化
    reader.reconcile();
    progress.reconcile();
  }

  /** 听读跨格/跨页时同步视觉位置：听读与逐格模式始终停在同一剧情点 */
  function syncPanel(pageId: string, panelId: string) {
    const at = reader.location.value;
    if (at.pageId === pageId && at.panelId === panelId) return;
    if (at.pageId !== pageId) {
      const chapter = doc.value.chapters.find((c) =>
        c.pages.some((p) => p.id === pageId),
      );
      if (chapter) reader.dispatch({ type: "chapter", id: chapter.id });
    }
    reader.dispatch({ type: "panel", id: panelId });
  }

  function locatePage(pageId: string) {
    for (const chapter of doc.value.chapters) {
      const page = chapter.pages.find((p) => p.id === pageId);
      if (page) {
        reader.dispatch({ type: "chapter", id: chapter.id });
        reader.dispatch({ type: "panel", id: page.panels[0]!.id });
        return;
      }
    }
  }

  const audio = useAudio(doc, currentPage, revision, syncPanel);

  function splitCurrent(panelId: string) {
    if (!currentPage.value) return;
    chapters.split(currentPage.value.id, panelId);
  }

  function repairCurrentPage() {
    if (!currentPage.value) return;
    chapters.repair(currentPage.value.id);
    audio.error.value = "";
  }

  function keydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.closest("input,textarea,button,select"))
      return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      reader.dispatch({ type: "move", delta: e.key === "ArrowRight" ? 1 : -1 });
    }
    if (e.key === " ") {
      e.preventDefault();
      audio.toggle();
    }
    if (e.key === "r" || e.key === "R") void audio.replay();
    if (e.key === "d" || e.key === "D") void audio.skipDescriptions();
    if (e.key === "Escape") reader.setMode("page");
  }
  onMounted(() => window.addEventListener("keydown", keydown));
  onBeforeUnmount(() => window.removeEventListener("keydown", keydown));

  return {
    doc,
    revision,
    reader,
    progress,
    library,
    chapters,
    audio,
    splitCurrent,
    repairCurrentPage,
    locatePage,
  };
}
