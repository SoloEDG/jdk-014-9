import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPagePlan,
  itemText,
  validatePage,
  validateDocument,
  geometricOrder,
} from "../src/features/audio/lib/plan.ts";
import { makeCue, makePanel, makePage, makeDoc } from "./helpers/factory.ts";

test("作者指定的 cueOrder 决定听读顺序，不按几何位置朗读", () => {
  const panel = makePanel();
  const [desc, line, sfx] = panel.cues;
  const page = makePage([panel], {
    cueOrder: [sfx!.id, line!.id, desc!.id], // 音效先于对白，违反几何顺序
  });
  const plan = buildPagePlan(page, "brief", 1);
  assert.deepEqual(
    plan.items.map((i) => i.cueId),
    [sfx!.id, line!.id, desc!.id],
  );
  assert.equal(plan.revision, 1);
});

test("未被 cueOrder 收录的线索按几何顺序追加并标记 unlisted", () => {
  const panel = makePanel();
  const [desc, line, sfx] = panel.cues;
  const page = makePage([panel], { cueOrder: [line!.id] });
  const plan = buildPagePlan(page, "brief", 0);
  assert.deepEqual(
    plan.items.map((i) => i.cueId),
    [line!.id, desc!.id, sfx!.id],
  );
  assert.equal(plan.items[1]!.unlisted, true);
  assert.equal(plan.items[0]!.unlisted, false);
});

test("失效的 cueOrder 引用不会进入播放队列", () => {
  const panel = makePanel();
  const page = makePage([panel], {
    cueOrder: ["missing-cue", ...panel.cues.map((c) => c.id)],
  });
  const plan = buildPagePlan(page, "brief", 0);
  assert.equal(plan.items.some((i) => i.cueId === "missing-cue"), false);
  assert.equal(plan.items.length, panel.cues.length);
});

test("转场线索始终排在页首", () => {
  const panel = makePanel();
  const transition = makeCue("transition", { text: "镜头切换" });
  const page = makePage([panel], { transitionCue: transition });
  const plan = buildPagePlan(page, "brief", 0);
  assert.equal(plan.items[0]!.cueId, transition.id);
  assert.equal(plan.items[0]!.panelId, null);
});

test("描述线索按层次返回不同文本", () => {
  const panel = makePanel();
  const page = makePage([panel]);
  const briefPlan = buildPagePlan(page, "brief", 0);
  const fullPlan = buildPagePlan(page, "full", 0);
  const descItem = briefPlan.items.find((i) => i.kind === "description")!;
  assert.equal(itemText(descItem, "brief"), panel.description.brief);
  assert.equal(itemText(descItem, "full"), panel.description.full);
  assert.equal(fullPlan.items[0]!.text, panel.description.full);
});

test("校验器报告 dangling-cue、unlisted-cue 与 missing-transition", () => {
  const panel = makePanel();
  const page = makePage([panel], {
    cueOrder: ["ghost-cue", panel.cues[1]!.id], // 失效引用 + 两条未收录
  });
  const doc = makeDoc([makePage([makePanel()]), page]);
  const chapter = doc.chapters[0]!;
  const issues = validatePage(chapter, chapter.pages[1]!, 1);
  assert.ok(issues.some((i) => i.code === "dangling-cue" && i.severity === "error"));
  assert.ok(issues.some((i) => i.code === "unlisted-cue"));
  assert.ok(issues.some((i) => i.code === "missing-transition"));
});

test("首页不要求转场，第二页缺少转场才告警", () => {
  const first = makePage([makePanel()]);
  const second = makePage([makePanel()]);
  const doc = makeDoc([first, second]);
  const chapter = doc.chapters[0]!;
  const firstIssues = validatePage(chapter, first, 0);
  assert.equal(firstIssues.some((i) => i.code === "missing-transition"), false);
  const secondIssues = validatePage(chapter, second, 1);
  assert.ok(secondIssues.some((i) => i.code === "missing-transition"));
});

test("缺少精简描述与关键动作会被标记", () => {
  const panel = makePanel({
    description: {
      characters: "陈屿",
      action: "",
      setting: "车站",
      brief: "",
      full: "完整文本",
    },
  });
  const doc = makeDoc([makePage([panel])]);
  const issues = validateDocument(doc);
  assert.ok(issues.some((i) => i.code === "missing-brief"));
  assert.ok(issues.some((i) => i.code === "missing-action"));
});

test("对白缺少说话人是错误；说话人不在人物描述中是提醒", () => {
  const panel = makePanel();
  panel.cues = [
    makeCue("description"),
    makeCue("dialogue", { speaker: "", text: "无名台词" }),
    makeCue("sfx"),
  ];
  const doc = makeDoc([makePage([panel])]);
  const issues = validateDocument(doc);
  assert.ok(issues.some((i) => i.code === "dialogue-without-speaker"));

  const panel2 = makePanel({
    description: {
      characters: "只有陈屿",
      action: "开门",
      setting: "门口",
      brief: "陈屿开门。",
      full: "完整",
    },
  });
  panel2.cues[1] = makeCue("dialogue", { speaker: "陌生女人" });
  const doc2 = makeDoc([makePage([panel2])]);
  assert.ok(
    validateDocument(doc2).some((i) => i.code === "speaker-mismatch"),
  );
});

test("geometricOrder 按分镜与线索声明顺序产出 id", () => {
  const p1 = makePanel();
  const p2 = makePanel();
  const page = makePage([p1, p2]);
  assert.deepEqual(
    geometricOrder(page),
    [...p1.cues, ...p2.cues].map((c) => c.id),
  );
});
