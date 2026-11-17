import type {
  ComicDocument,
  ComicPage,
  Panel,
} from "../../../shared/document";
import { makeId } from "../../../shared/commands";
import { geometricOrder, validatePage } from "../../audio/lib/plan";
import type { Chapter } from "../../../shared/document";

/** 结构修订报告：列出受影响页面与失效的听读顺序，供作者修订 */
export interface RevisionReport {
  kind: "split" | "reorder" | "repair" | "generic";
  summary: string;
  details: string[];
  affectedPages: { pageId: string; title: string }[];
  /** 在 cueOrder 中已找不到对应线索的失效 id */
  invalidCueIds: { pageId: string; cueId: string }[];
  createdAt: number;
}

export function findPage(
  doc: ComicDocument,
  pageId: string,
): { chapter: Chapter; page: ComicPage } | undefined {
  for (const chapter of doc.chapters) {
    const page = chapter.pages.find((p) => p.id === pageId);
    if (page) return { chapter, page };
  }
  return undefined;
}

export function findPanel(
  page: ComicPage,
  panelId: string,
): Panel | undefined {
  return page.panels.find((p) => p.id === panelId);
}

function danglingInOrder(page: ComicPage): string[] {
  const known = new Set<string>();
  if (page.transitionCue) known.add(page.transitionCue.id);
  for (const panel of page.panels)
    for (const cue of panel.cues) known.add(cue.id);
  return page.cueOrder.filter((id) => !known.has(id));
}

/**
 * 分镜拆分：把一格拆成上下两格。
 * 原格保留描述与第一条对白，其余线索移入新格；被移走的线索 id 在
 * cueOrder 中即刻失效，报告中逐条列出，等待作者修订。
 */
export function splitPanel(
  doc: ComicDocument,
  pageId: string,
  panelId: string,
): RevisionReport {
  const hit = findPage(doc, pageId);
  if (!hit)
    return {
      kind: "split",
      summary: "拆分失败：找不到目标页面",
      details: [],
      affectedPages: [],
      invalidCueIds: [],
      createdAt: Date.now(),
    };
  const { chapter, page } = hit;
  const index = page.panels.findIndex((p) => p.id === panelId);
  const panel = page.panels[index];
  if (!panel || index < 0)
    return {
      kind: "split",
      summary: "拆分失败：找不到目标分镜",
      details: [],
      affectedPages: [],
      invalidCueIds: [],
      createdAt: Date.now(),
    };

  // 画面纵向一分为二，两格各占原高度的一半（留 12px 间距语义由 UI 处理）
  const halfHeight = Math.round(panel.rect.height / 2);
  const stayCues = panel.cues.filter(
    (cue) => cue.kind === "description" || cue.kind === "dialogue",
  );
  const firstDialogue = stayCues.findIndex((cue) => cue.kind === "dialogue");
  const keep =
    firstDialogue >= 0 ? stayCues.slice(0, firstDialogue + 1) : stayCues;
  const moved = panel.cues.filter((cue) => !keep.includes(cue));

  const newPanel: Panel = {
    ...panel,
    id: makeId("panel"),
    rect: {
      x: panel.rect.x,
      y: panel.rect.y + halfHeight,
      width: panel.rect.width,
      height: panel.rect.height - halfHeight,
    },
    duration: Math.max(3, Math.round(panel.duration / 2)),
    description: {
      ...panel.description,
      characters: panel.description.characters,
      brief: `（接续上一格）${panel.description.action}`,
      full: `分镜拆分出的下半格：${panel.description.full}`,
    },
    cues: [
      { id: makeId("cue"), kind: "description", text: "" },
      ...moved.map((cue) => ({ ...cue, id: makeId("cue") })),
    ],
  };
  panel.rect = { ...panel.rect, height: halfHeight };
  panel.cues = keep;

  page.panels.splice(index + 1, 0, newPanel);

  const movedIds = moved.map((cue) => cue.id);
  const invalid = page.cueOrder
    .filter((id) => movedIds.includes(id))
    .map((cueId) => ({ pageId, cueId }));

  return {
    kind: "split",
    summary: `已把「${page.title}」的一格拆分为两格，${movedIds.length} 条线索移入新格`,
    details: [
      `原分镜保留 ${keep.length} 条线索，新分镜「${newPanel.id}」获得 ${newPanel.cues.length} 条线索。`,
      invalid.length
        ? `以下 ${invalid.length} 个旧顺序条目已失效，需要从听读顺序中修订。`
        : "听读顺序未引用被移动的线索，无失效条目。",
    ],
    affectedPages: [{ pageId, title: page.title }],
    invalidCueIds: invalid,
    createdAt: Date.now(),
  };
}

/**
 * 章节重排后复查全部听读顺序。
 * 重排本身不会删除线索，因此失效列表通常为空；一旦为空也明确给出结论。
 */
export function reorderReport(
  doc: ComicDocument,
  movedChapterId: string,
): RevisionReport {
  const chapter = doc.chapters.find((c) => c.id === movedChapterId);
  const invalid: RevisionReport["invalidCueIds"] = [];
  const affected: RevisionReport["affectedPages"] = [];
  for (const c of doc.chapters)
    for (const page of c.pages) {
      const dangling = danglingInOrder(page);
      if (dangling.length)
        invalid.push(...dangling.map((cueId) => ({ pageId: page.id, cueId })));
      if (c.id === movedChapterId)
        affected.push({ pageId: page.id, title: page.title });
    }
  return {
    kind: "reorder",
    summary: `章节「${chapter?.title ?? movedChapterId}」已移动，复查 ${
      affected.length
    } 个页面的听读顺序`,
    details: [
      invalid.length
        ? `发现 ${invalid.length} 个失效顺序条目，请修订后再开始听读。`
        : "全部线索引用仍然有效，听读顺序无需修改。",
      "章节顺序变化会改变连续播放的跨页衔接，请试听转场线索。",
    ],
    affectedPages: affected,
    invalidCueIds: invalid,
    createdAt: Date.now(),
  };
}

/** 对整本文档做一次完整复查（删除、导入等结构变化后调用） */
export function fullRevisionReport(doc: ComicDocument): RevisionReport {
  const invalid: RevisionReport["invalidCueIds"] = [];
  const affected: RevisionReport["affectedPages"] = [];
  for (const chapter of doc.chapters)
    for (const page of chapter.pages) {
      const dangling = danglingInOrder(page);
      if (dangling.length) {
        affected.push({ pageId: page.id, title: page.title });
        invalid.push(...dangling.map((cueId) => ({ pageId: page.id, cueId })));
      }
    }
  return {
    kind: "generic",
    summary: "结构复查完成",
    details: [
      invalid.length
        ? `共 ${invalid.length} 个失效顺序条目，分布在 ${affected.length} 个页面。`
        : "未发现失效的听读顺序。",
    ],
    affectedPages: affected,
    invalidCueIds: invalid,
    createdAt: Date.now(),
  };
}

/**
 * 一键修订单页顺序：剔除失效与重复条目，再把未收录线索按几何顺序补齐。
 * 返回修订掉的失效 id 列表。
 */
export function repairPageOrder(page: ComicPage): string[] {
  const known = new Set<string>();
  if (page.transitionCue) known.add(page.transitionCue.id);
  for (const panel of page.panels)
    for (const cue of panel.cues) known.add(cue.id);
  const repaired: string[] = [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of page.cueOrder) {
    if (!known.has(id)) {
      repaired.push(id);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  for (const id of geometricOrder(page))
    if (!seen.has(id)) {
      seen.add(id);
      next.push(id);
    }
  page.cueOrder = next;
  return repaired;
}

/** 当前页的全部校验问题（供侧栏展示） */
export function pageIssues(doc: ComicDocument, page: ComicPage) {
  const chapter = doc.chapters.find((c) => c.pages.includes(page));
  if (!chapter) return [];
  const index = chapter.pages.indexOf(page);
  return validatePage(chapter, page, index);
}
