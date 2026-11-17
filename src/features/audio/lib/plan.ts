import type {
  AudioCue,
  Chapter,
  ComicDocument,
  ComicPage,
  DescriptionLevel,
  Panel,
} from "../../../shared/document";

/** 播放计划中的一条可听读单元（构建时即快照，与后续文档改动隔离） */
export interface PlanItem {
  /** 全局唯一的播放项 id：页 id + 线索 id */
  key: string;
  pageId: string;
  panelId: string | null;
  cueId: string;
  kind: AudioCue["kind"];
  speaker?: string;
  sound?: AudioCue["sound"];
  durationMs?: number;
  interruptAfter: boolean;
  /** 描述线索的两套文本，播放时按读者选择的层次取用 */
  briefText?: string;
  fullText?: string;
  /** 非描述线索的固定文本 */
  text?: string;
  /** 是否未被作者的 cueOrder 收录，由系统按几何顺序追加 */
  unlisted: boolean;
  orderIndex: number;
}

export interface ListeningPlan {
  pageId: string;
  items: PlanItem[];
  /** 构建时的文档修订号，用于检测陈旧计划 */
  revision: number;
}

export type IssueSeverity = "error" | "warning";

export interface OrderIssue {
  severity: IssueSeverity;
  code:
    | "dangling-cue"
    | "duplicate-cue"
    | "unlisted-cue"
    | "missing-transition"
    | "empty-description"
    | "missing-brief"
    | "missing-action"
    | "speaker-mismatch"
    | "dialogue-without-speaker"
    | "sfx-without-sound";
  chapterId: string;
  pageId: string;
  panelId?: string;
  cueId?: string;
  message: string;
}

export function panelCues(panel: Panel): AudioCue[] {
  return panel.cues;
}

/** 几何默认顺序：逐格 → 描述 → 对白 → 音效 */
export function geometricOrder(page: ComicPage): string[] {
  const ids: string[] = [];
  for (const panel of page.panels)
    for (const cue of panel.cues) ids.push(cue.id);
  return ids;
}

function cueById(page: ComicPage, id: string): AudioCue | undefined {
  if (page.transitionCue?.id === id) return page.transitionCue;
  for (const panel of page.panels) {
    const hit = panel.cues.find((cue) => cue.id === id);
    if (hit) return hit;
  }
  return undefined;
}

function panelOfCue(page: ComicPage, cueId: string): Panel | undefined {
  return page.panels.find((panel) =>
    panel.cues.some((cue) => cue.id === cueId),
  );
}

/**
 * 按作者指定的 cueOrder 构建单页听读计划。
 * 顺序：转场线索 → cueOrder 中的线索 → 未收录线索（几何顺序追加）。
 */
export function buildPagePlan(
  page: ComicPage,
  level: DescriptionLevel,
  revision: number,
): ListeningPlan {
  const items: PlanItem[] = [];
  const listed = new Set<string>();
  let order = 0;

  const push = (cue: AudioCue, panelId: string | null, unlisted: boolean) => {
    const base: PlanItem = {
      key: `${page.id}:${cue.id}`,
      pageId: page.id,
      panelId,
      cueId: cue.id,
      kind: cue.kind,
      speaker: cue.speaker,
      sound: cue.sound,
      durationMs: cue.durationMs,
      interruptAfter: cue.interruptAfter ?? false,
      unlisted,
      orderIndex: order++,
    };
    if (cue.kind === "description") {
      const panel = panelId ? panelOfCue(page, cue.id) : undefined;
      base.briefText = panel?.description.brief ?? cue.text;
      base.fullText = panel?.description.full ?? cue.text;
      base.text = level === "full" ? base.fullText : base.briefText;
    } else {
      base.text = cue.text;
    }
    items.push(base);
  };

  if (page.transitionCue) push(page.transitionCue, null, false);

  for (const cueId of page.cueOrder) {
    const cue = cueById(page, cueId);
    if (!cue) continue; // 失效引用交给校验器报告，不进入播放队列
    listed.add(cueId);
    push(cue, panelOfCue(page, cueId)?.id ?? null, false);
  }

  for (const cueId of geometricOrder(page)) {
    if (listed.has(cueId)) continue;
    const cue = cueById(page, cueId);
    if (cue) push(cue, panelOfCue(page, cueId)?.id ?? null, true);
  }

  return { pageId: page.id, items, revision };
}

/** 按当前描述层次取出播放项应朗读的文本 */
export function itemText(item: PlanItem, level: DescriptionLevel): string {
  if (item.kind === "description")
    return level === "full"
      ? (item.fullText ?? item.briefText ?? "")
      : (item.briefText ?? item.fullText ?? "");
  return item.text ?? "";
}

/** 校验单页：失效顺序、重复收录、未收录线索、转场与描述完整性 */
export function validatePage(
  chapter: Chapter,
  page: ComicPage,
  pageIndex: number,
): OrderIssue[] {
  const issues: OrderIssue[] = [];
  const where = { chapterId: chapter.id, pageId: page.id };
  const known = new Set<string>();
  if (page.transitionCue) known.add(page.transitionCue.id);
  for (const panel of page.panels)
    for (const cue of panel.cues) known.add(cue.id);

  const seen = new Set<string>();
  for (const cueId of page.cueOrder) {
    if (!known.has(cueId))
      issues.push({
        ...where,
        severity: "error",
        code: "dangling-cue",
        cueId,
        message: `听读顺序引用了已不存在的线索「${cueId}」，该条目不会被朗读，请删除或重新指定。`,
      });
    else if (seen.has(cueId))
      issues.push({
        ...where,
        severity: "warning",
        code: "duplicate-cue",
        cueId,
        message: `线索「${cueId}」在听读顺序中出现多次，同一句会被重复朗读。`,
      });
    seen.add(cueId);
  }

  for (const cueId of known) {
    if (page.transitionCue?.id === cueId) continue;
    if (!seen.has(cueId)) {
      const panel = panelOfCue(page, cueId);
      issues.push({
        ...where,
        severity: "warning",
        code: "unlisted-cue",
        panelId: panel?.id,
        cueId,
        message: "有声音线索未进入作者顺序，系统已按分镜几何位置追加到末尾。",
      });
    }
  }

  // 章节首页以外都需要转场描述，保证听读者能跟上场景切换
  if (pageIndex > 0 && !page.transitionCue?.text.trim())
    issues.push({
      ...where,
      severity: "warning",
      code: "missing-transition",
      message: `「${page.title}」缺少翻页转场描述，听读者可能无法感知场景切换。`,
    });

  for (const panel of page.panels) {
    const desc = panel.description;
    if (!desc.brief.trim() || !desc.full.trim())
      issues.push({
        ...where,
        severity: "error",
        code: "empty-description",
        panelId: panel.id,
        message: "分镜缺少画面描述，视障读者无法获得画面信息。",
      });
    if (!desc.brief.trim())
      issues.push({
        ...where,
        severity: "error",
        code: "missing-brief",
        panelId: panel.id,
        message: "缺少精简描述，快速听读模式下该格没有画面信息。",
      });
    if (!desc.action.trim())
      issues.push({
        ...where,
        severity: "warning",
        code: "missing-action",
        panelId: panel.id,
        message: "缺少关键动作描述，压缩描述时可能漏掉理解下一句对白必需的信息。",
      });

    const speakers = panel.cues
      .filter((cue) => cue.kind === "dialogue")
      .map((cue) => cue.speaker?.trim() ?? "");
    for (const cue of panel.cues) {
      if (cue.kind === "dialogue" && !cue.speaker?.trim())
        issues.push({
          ...where,
          severity: "error",
          code: "dialogue-without-speaker",
          panelId: panel.id,
          cueId: cue.id,
          message: "对白缺少说话人，多人对话中无法分辨是谁在讲话。",
        });
      if (cue.kind === "sfx" && !cue.sound)
        issues.push({
          ...where,
          severity: "warning",
          code: "sfx-without-sound",
          panelId: panel.id,
          cueId: cue.id,
          message: "音效线索未指定音色，将按默认雨声处理。",
        });
    }
    // 关键信息检查：对白说话人应当能在人物描述中找到，否则精简描述会漏掉谁在说话
    if (desc.characters.trim())
      for (const speaker of new Set(speakers.filter(Boolean))) {
        if (!desc.characters.includes(speaker))
          issues.push({
            ...where,
            severity: "warning",
            code: "speaker-mismatch",
            panelId: panel.id,
            message: `说话人「${speaker}」未出现在人物描述中，精简模式下读者可能不知道是谁开口。`,
          });
      }
  }
  return issues;
}

export function validateDocument(doc: ComicDocument): OrderIssue[] {
  const issues: OrderIssue[] = [];
  for (const chapter of doc.chapters)
    chapter.pages.forEach((page, i) =>
      issues.push(...validatePage(chapter, page, i)),
    );
  return issues;
}

/** 校验结果按页聚合，便于 UI 在对应分镜旁提示 */
export function issuesForPage(issues: OrderIssue[], pageId: string): OrderIssue[] {
  return issues.filter((issue) => issue.pageId === pageId);
}

/** 在整本文档中定位页面并执行单页校验 */
export function validatePageInDoc(
  doc: ComicDocument,
  pageId: string,
): OrderIssue[] {
  for (const chapter of doc.chapters) {
    const index = chapter.pages.findIndex((p) => p.id === pageId);
    if (index >= 0) return validatePage(chapter, chapter.pages[index]!, index);
  }
  return [];
}
