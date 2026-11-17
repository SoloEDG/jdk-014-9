import type {
  AudioCue,
  ComicDocument,
  ComicPage,
  Panel,
} from "../../src/shared/document";

let seq = 0;
const id = (prefix: string) => `${prefix}-test-${seq++}`;

export function makeCue(
  kind: AudioCue["kind"],
  extra: Partial<AudioCue> = {},
): AudioCue {
  return {
    id: id("cue"),
    kind,
    text: `${kind} 文本`,
    ...(kind === "dialogue" ? { speaker: "陈屿" } : {}),
    ...(kind === "sfx" ? { sound: "rain", durationMs: 1000 } : {}),
    ...extra,
  };
}

export function makePanel(partial: Partial<Panel> = {}): Panel {
  const descCue = makeCue("description");
  const lineCue = makeCue("dialogue");
  const sfxCue = makeCue("sfx");
  return {
    id: id("panel"),
    rect: { x: 0, y: 0, width: 100, height: 100 },
    dialogue: "旧对白",
    speaker: "陈屿",
    sound: "rain",
    duration: 5,
    description: {
      characters: "陈屿、陌生女人",
      action: "两人对话",
      setting: "雨夜车站",
      brief: "陈屿与陌生女人在雨夜车站对话。",
      full: "完整描述：冷色光影下，陈屿与陌生女人在雨夜车站对话，雨水沿玻璃滑落。",
    },
    cues: [descCue, lineCue, sfxCue],
    ...partial,
  };
}

export function makePage(panels: Panel[], extra: Partial<ComicPage> = {}): ComicPage {
  const page: ComicPage = {
    id: id("page"),
    title: "测试页",
    image: "data:,",
    width: 900,
    height: 1200,
    panels,
    cueOrder: panels.flatMap((p) => p.cues.map((cue) => cue.id)),
    ...extra,
  };
  return page;
}

export function makeDoc(pages: ComicPage[]): ComicDocument {
  return {
    version: 1,
    audioVersion: 2,
    id: id("doc"),
    title: "测试漫画",
    author: "测试作者",
    chapters: [
      {
        id: id("chapter"),
        title: "第一章",
        subtitle: "测试",
        pages,
      },
    ],
  };
}
