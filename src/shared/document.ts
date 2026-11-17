export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 描述层次：精简层只保留理解剧情必需的信息，完整层给出全部画面细节 */
export type DescriptionLevel = "brief" | "full";

export type CueKind = "description" | "dialogue" | "sfx" | "transition";

export type AmbientSound = "rain" | "pulse" | "wind";

/**
 * 一条可听读的声音线索。
 * - description：画面描述（文本随描述层次切换 brief/full）
 * - dialogue：人物对白（speaker 为说话人）
 * - sfx：环境音 / 音效（sound 决定合成音色，durationMs 为播放时长）
 * - transition：翻页转场描述，挂在页面上
 */
export interface AudioCue {
  id: string;
  kind: CueKind;
  text: string;
  speaker?: string;
  sound?: AmbientSound;
  durationMs?: number;
  /** 作者指定的打断点：播放到此线索后暂停，等待读者确认继续 */
  interruptAfter?: boolean;
}

/** 一格分镜的画面描述，按精简 / 完整两个层次组织 */
export interface PanelDescription {
  /** 出场人物，如「陈屿、陌生女人」 */
  characters: string;
  /** 关键动作——理解下一句对白所必需的信息，精简层也不会省略 */
  action: string;
  /** 场景，如「雨夜的旧车站候车厅」 */
  setting: string;
  /** 精简描述：一句话交代人物 + 动作 + 场景 */
  brief: string;
  /** 完整描述：构图、表情、光影、道具等全部画面信息 */
  full: string;
}

export interface Panel {
  id: string;
  rect: Rect;
  /** @deprecated 旧版单条对白，迁移后由 cues 中的 dialogue 线索承载 */
  dialogue: string;
  /** @deprecated 旧版说话人 */
  speaker: string;
  /** @deprecated 旧版环境音，迁移后由 sfx 线索承载 */
  sound: AmbientSound;
  duration: number;
  description: PanelDescription;
  /** 本格内的全部声音线索，几何顺序仅作为默认顺序，作者可在页面级 cueOrder 重排 */
  cues: AudioCue[];
}

export interface ComicPage {
  id: string;
  title: string;
  image: string;
  width: number;
  height: number;
  panels: Panel[];
  /** 进入本页的转场描述线索；首页以外缺失会被校验器标记 */
  transitionCue?: AudioCue;
  /**
   * 作者指定的听读顺序，存放 cue id。
   * 多人对话可不按几何位置排列；未被列入的线索会在播放时追加并在校验中告警。
   */
  cueOrder: string[];
}

export interface Chapter {
  id: string;
  title: string;
  subtitle: string;
  pages: ComicPage[];
}

export interface ComicDocument {
  version: 1;
  /** 听读结构版本号，用于区分旧存档 */
  audioVersion: 2;
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
}

export interface ReadingLocation {
  chapterId: string;
  pageId: string;
  panelId: string;
  zoom: number;
  x: number;
  y: number;
}

export interface Bookmark {
  id: string;
  label: string;
  location: ReadingLocation;
  created: number;
}

export type ReadingMode = "page" | "panel";
