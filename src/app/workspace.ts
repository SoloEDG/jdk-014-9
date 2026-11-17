import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { demoDocument, useLibrary } from "../features/library";
import { useChapters } from "../features/chapters";
import { useReader } from "../features/reader";
import { useAudio } from "../features/audio";
import { useProgress, readSession } from "../features/progress";
export function useWorkspace() {
  const saved = readSession(),
    doc = ref(saved?.document ?? demoDocument()),
    reader = useReader(doc);
  if (saved) reader.dispatch({ type: "restore", location: saved.location });
  const progress = useProgress(doc, reader.location, saved),
    library = useLibrary(doc, (id) => {
      reader.dispatch({ type: "chapter", id });
      progress.reconcile();
    }),
    chapters = useChapters(doc, () => {
      reader.reconcile();
      progress.reconcile();
    }),
    panel = computed(() => reader.current.value.panel),
    audio = useAudio(panel);
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
    if (e.key === "Escape") reader.setMode("page");
  }
  onMounted(() => window.addEventListener("keydown", keydown));
  onBeforeUnmount(() => window.removeEventListener("keydown", keydown));
  return { doc, reader, progress, library, chapters, audio };
}
