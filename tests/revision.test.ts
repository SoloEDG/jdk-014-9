import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitPanel,
  repairPageOrder,
  reorderReport,
  fullRevisionReport,
} from "../src/features/chapters/lib/revision.ts";
import { makeCue, makePanel, makePage, makeDoc } from "./helpers/factory.ts";

test("分镜拆分后被移走的线索出现在失效顺序报告中", () => {
  const panel = makePanel();
  const movedSfx = panel.cues[2]!;
  const page = makePage([panel]);
  const doc = makeDoc([page]);
  const beforeCount = page.panels.length;

  const report = splitPanel(doc, page.id, panel.id);

  assert.equal(page.panels.length, beforeCount + 1);
  assert.equal(report.kind, "split");
  assert.deepEqual(
    report.invalidCueIds.map((x) => x.cueId),
    [movedSfx.id],
  );
  // 新格得到全新的线索 id，旧 id 在文档中已不存在
  const allIds = new Set(page.panels.flatMap((p) => p.cues.map((c) => c.id)));
  assert.equal(allIds.has(movedSfx.id), false);
});

test("修订报告中失效 id 可由 repairPageOrder 一键剔除并补齐顺序", () => {
  const panel = makePanel();
  const page = makePage([panel]);
  page.cueOrder = ["dead-1", "dead-2", panel.cues[0]!.id];
  const removed = repairPageOrder(page);
  assert.deepEqual(removed, ["dead-1", "dead-2"]);
  const known = new Set(panel.cues.map((c) => c.id));
  assert.ok(page.cueOrder.every((id) => known.has(id)));
  // 未收录线索被补齐
  assert.equal(page.cueOrder.length, panel.cues.length);
});

test("repairPageOrder 去除重复条目", () => {
  const panel = makePanel();
  const [a, b, c] = panel.cues;
  const page = makePage([panel], { cueOrder: [a!.id, a!.id, b!.id, c!.id] });
  repairPageOrder(page);
  assert.equal(page.cueOrder.filter((x) => x === a!.id).length, 1);
});

test("章节重排后生成复查报告，无失效时明确给出有效结论", () => {
  const doc = makeDoc([makePage([makePanel()]), makePage([makePanel()])]);
  const chapterId = doc.chapters[0]!.id;
  const report = reorderReport(doc, chapterId);
  assert.equal(report.kind, "reorder");
  assert.equal(report.invalidCueIds.length, 0);
  assert.ok(report.details.some((d) => d.includes("仍然有效")));
});

test("fullRevisionReport 汇总所有页面的失效条目", () => {
  const p1 = makePage([makePanel()]);
  p1.cueOrder = ["gone-a", ...p1.cueOrder];
  const p2 = makePage([makePanel()]);
  p2.cueOrder = ["gone-b", ...p2.cueOrder];
  const doc = makeDoc([p1, p2]);
  const report = fullRevisionReport(doc);
  assert.equal(report.invalidCueIds.length, 2);
  assert.equal(new Set(report.affectedPages.map((a) => a.pageId)).size, 2);
});

test("拆分后的新分镜继承人物并生成自己的描述线索", () => {
  const panel = makePanel();
  const page = makePage([panel]);
  const doc = makeDoc([page]);
  splitPanel(doc, page.id, panel.id);
  const fresh = page.panels[1]!;
  assert.ok(fresh.cues.some((c) => c.kind === "description"));
  assert.equal(fresh.description.characters, panel.description.characters);
  assert.ok(
    fresh.cues.every((c) => !panel.cues.map((x) => x.id).includes(c.id)),
  );
});

test("找不到目标分镜时返回失败报告且不修改文档", () => {
  const page = makePage([makePanel()]);
  const doc = makeDoc([page]);
  const report = splitPanel(doc, page.id, "no-such-panel");
  assert.equal(page.panels.length, 1);
  assert.ok(report.summary.includes("失败"));
});

test("转场线索不会被几何顺序重复收录", () => {
  const panel = makePanel();
  const transition = makeCue("transition");
  const page = makePage([panel], { transitionCue: transition });
  const removed = repairPageOrder(page);
  assert.deepEqual(removed, []);
  assert.equal(page.cueOrder.includes(transition.id), false);
});
