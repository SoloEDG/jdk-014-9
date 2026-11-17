import type {
  AudioCue,
  ComicDocument,
  ComicPage,
  Panel,
  PanelDescription,
} from "./document";
import { makeId } from "./commands";

/** 旧版存档的分镜结构（仅保留迁移所需字段） */
interface LegacyPanel {
  id: string;
  dialogue?: string;
  speaker?: string;
  sound?: Panel["sound"];
  duration?: number;
  rect: Panel["rect"];
}

interface LegacyPage {
  id: string;
  title?: string;
  panels?: LegacyPanel[];
  transitionCue?: AudioCue;
  cueOrder?: string[];
}

/** 已具备听读结构的文档 */
function isModern(doc: ComicDocument): boolean {
  return (
    (doc as ComicDocument & { audioVersion?: number }).audioVersion === 2
  );
}

function describe(panel: LegacyPanel, index: number, pageTitle: string): PanelDescription {
  const speaker = panel.speaker || "旁白";
  const dialogue = panel.dialogue || "";
  return {
    characters: speaker === "旁白" ? "旁白视角" : speaker,
    action: dialogue
      ? `角色说出「${dialogue}」`
      : `镜头停留在 ${pageTitle} 的第 ${index + 1} 格`,
    setting: "雨夜城市",
    brief: `${speaker === "旁白" ? "画面" : speaker}：${dialogue || "无声的停顿"}。`,
    full:
      `第 ${index + 1} 格，${speaker}出现在雨夜城市的场景中，` +
      (dialogue ? `说出「${dialogue}」。` : "画面停留在无声的一瞬。") +
      "镜头沿用整页的冷色调光影，雨水在画面边缘划过。",
  };
}

function migratePanel(panel: LegacyPanel, index: number, pageTitle: string): Panel {
  const cues: AudioCue[] = [
    {
      id: makeId("cue"),
      kind: "description",
      text: "",
    },
  ];
  if (panel.dialogue) {
    cues.push({
      id: makeId("cue"),
      kind: "dialogue",
      speaker: panel.speaker || "旁白",
      text: panel.dialogue,
    });
  }
  cues.push({
    id: makeId("cue"),
    kind: "sfx",
    sound: panel.sound ?? "rain",
    text:
      panel.sound === "pulse"
        ? "低沉的电子脉冲声"
        : panel.sound === "wind"
          ? "远处呼啸的风声"
          : "持续不断的雨声",
    durationMs: 2600,
  });
  return {
    id: panel.id,
    rect: panel.rect,
    dialogue: panel.dialogue ?? "",
    speaker: panel.speaker ?? "旁白",
    sound: panel.sound ?? "rain",
    duration: panel.duration ?? 5,
    description: describe(panel, index, pageTitle),
    cues,
  };
}

function migratePage(page: LegacyPage): ComicPage {
  const panels = (page.panels ?? []).map((p, i) =>
    migratePanel(p, i, page.title ?? "本页"),
  );
  const modern = page as ComicPage;
  return {
    ...modern,
    title: page.title ?? "未命名页",
    panels,
    cueOrder:
      page.cueOrder ??
      panels.flatMap((p) => p.cues.map((cue) => cue.id)),
    transitionCue: page.transitionCue,
  };
}

/**
 * 把任意历史版本的文档规范化为 audioVersion 2。
 * 已迁移的文档原样返回；旧文档逐格补齐描述层次与声音线索。
 */
export function migrateDocument(input: unknown): ComicDocument | null {
  if (!input || typeof input !== "object") return null;
  const doc = input as ComicDocument;
  if (doc.version !== 1 || !Array.isArray(doc.chapters)) return null;
  if (isModern(doc)) return doc;
  return {
    ...doc,
    audioVersion: 2,
    chapters: doc.chapters.map((chapter) => ({
      ...chapter,
      pages: chapter.pages.map((page) => migratePage(page as LegacyPage)),
    })),
  };
}
