import { computed, ref, watch, type Ref } from "vue";
import type {
  ComicDocument,
  ComicPage,
  DescriptionLevel,
  Panel,
} from "../../../shared/document";
import { useListenQueue } from "./queue";
import { AmbientSynth } from "../lib/synth";
import { validatePageInDoc, type OrderIssue } from "../lib/plan";

export interface AudioController {
  level: Ref<DescriptionLevel>;
  ambientOn: Ref<boolean>;
  volume: Ref<number>;
  rate: Ref<number>;
  ttsSupported: Ref<boolean>;
  error: Ref<string>;
  items: ReturnType<typeof useListenQueue>["items"];
  index: Ref<number>;
  status: Ref<string>;
  progress: ReturnType<typeof useListenQueue>["progress"];
  current: ReturnType<typeof useListenQueue>["current"];
  autoAdvancePanel: Ref<boolean>;
  issues: Ref<OrderIssue[]>;
  toggle: () => void;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => Promise<void>;
  replay: () => Promise<void>;
  jumpTo: (cueId: string) => Promise<void>;
  step: (delta: number) => Promise<void>;
  skipDescriptions: () => Promise<void>;
  setLevel: (level: DescriptionLevel) => void;
  toggleAmbient: () => void;
}

/**
 * 听读控制中枢。
 * - 页面与文档修订号驱动队列重建与代际作废；
 * - 精简/完整层次切换只影响描述线索；
 * - 校验问题随当前页实时计算。
 */
export function useAudio(
  doc: Ref<ComicDocument>,
  page: Ref<ComicPage | undefined>,
  revision: Ref<number>,
  onSyncPanel: (pageId: string, panelId: string) => void,
): AudioController {
  const level = ref<DescriptionLevel>("brief");
  const ambientOn = ref(false);
  const volume = ref(0.35);
  const ambient = new AmbientSynth();

  const queue = useListenQueue({ page, level, revision, onSyncPanel });

  const issues = computed<OrderIssue[]>(() =>
    page.value ? validatePageInDoc(doc.value, page.value.id) : [],
  );

  function toggleAmbient() {
    ambientOn.value = !ambientOn.value;
    if (ambientOn.value) {
      const sound = page.value?.panels[0]?.sound ?? "rain";
      void ambient.start(sound, volume.value);
    } else ambient.stop();
  }

  watch(volume, (v) => ambient.volume(v));
  watch(
    () => page.value?.id,
    () => {
      if (ambientOn.value) {
        void ambient.start(page.value?.panels[0]?.sound ?? "rain", volume.value);
      }
    },
  );

  function setLevel(next: DescriptionLevel) {
    level.value = next;
  }

  return {
    level,
    ambientOn,
    volume,
    rate: queue.rate,
    ttsSupported: queue.ttsSupported,
    error: queue.error,
    items: queue.items,
    index: queue.index,
    status: queue.status,
    progress: queue.progress,
    current: queue.current,
    autoAdvancePanel: queue.autoAdvancePanel,
    issues,
    toggle: queue.toggle,
    start: queue.start,
    stop: queue.stop,
    pause: queue.pause,
    resume: queue.resume,
    replay: queue.replay,
    jumpTo: queue.jumpTo,
    step: queue.step,
    skipDescriptions: queue.skipDescriptions,
    setLevel,
    toggleAmbient,
  };
}

/** 供模板使用的线索类型标签 */
export function cueKindLabel(kind: string): string {
  switch (kind) {
    case "description":
      return "画面描述";
    case "dialogue":
      return "对白";
    case "sfx":
      return "音效";
    case "transition":
      return "转场";
    default:
      return kind;
  }
}

/** 当前分镜描述（供视觉模式侧栏展示） */
export function panelDescriptionText(
  panel: Panel | undefined,
  level: DescriptionLevel,
): string {
  if (!panel) return "";
  return level === "full" ? panel.description.full : panel.description.brief;
}
