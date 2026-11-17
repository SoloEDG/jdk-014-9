import { ref, type Ref } from "vue";
import type { ComicDocument } from "../../../shared/document";
import { importImages } from "../lib/importImages";
import { demoDocument } from "../lib/demo";
export function useLibrary(
  doc: Ref<ComicDocument>,
  onImport: (id: string) => void,
) {
  const busy = ref(false),
    message = ref("");
  async function importFiles(files: File[]) {
    if (busy.value) return;
    busy.value = true;
    message.value = "";
    try {
      const chapter = await importImages(files);
      doc.value.chapters.push(chapter);
      onImport(chapter.id);
      message.value = `已导入 ${chapter.pages.length} 页`;
    } catch (error) {
      message.value = error instanceof Error ? error.message : "导入失败";
    } finally {
      busy.value = false;
    }
  }
  function reset() {
    doc.value = demoDocument();
    onImport(doc.value.chapters[0]!.id);
    message.value = "已打开内置漫画";
  }
  return { busy, message, importFiles, reset };
}
