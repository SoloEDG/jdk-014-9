import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateDocument } from "../src/shared/migration.ts";
import { demoDocument } from "../src/features/library/lib/demo.ts";
import { validateDocument } from "../src/features/audio/lib/plan.ts";

test("演示文档自身通过全部校验（除刻意安排的提醒外无错误）", () => {
  const doc = demoDocument();
  const issues = validateDocument(doc);
  const errors = issues.filter((i) => i.severity === "error");
  assert.deepEqual(errors, []);
  // 第一章第一页存在作者指定的非几何顺序
  const firstPage = doc.chapters[0]!.pages[0]!;
  const panel3LineWoman = firstPage.panels[2]!.cues.find(
    (c) => c.kind === "dialogue" && c.speaker === "陌生女人",
  )!;
  const womanPos = firstPage.cueOrder.indexOf(panel3LineWoman.id);
  const manLine = firstPage.panels[2]!.cues.find(
    (c) => c.kind === "dialogue" && c.speaker === "陈屿",
  )!;
  assert.ok(womanPos >= 0 && womanPos < firstPage.cueOrder.indexOf(manLine.id));
  // 打断点存在
  assert.ok(panel3LineWoman.interruptAfter);
});

test("演示文档每页都有分层描述与转场（首页除外）", () => {
  const doc = demoDocument();
  for (const chapter of doc.chapters)
    chapter.pages.forEach((page, i) => {
      if (i > 0) assert.ok(page.transitionCue?.text);
      for (const panel of page.panels) {
        assert.ok(panel.description.brief.length > 0);
        assert.ok(panel.description.full.length > panel.description.brief.length);
        assert.ok(panel.cues.some((c) => c.kind === "description"));
        assert.ok(panel.cues.some((c) => c.kind === "dialogue"));
        assert.ok(panel.cues.some((c) => c.kind === "sfx"));
      }
    });
});

test("旧版 v1 存档被迁移为 audioVersion 2 的分层多线索结构", () => {
  const legacy = {
    version: 1,
    id: "old",
    title: "旧漫画",
    author: "某人",
    chapters: [
      {
        id: "c1",
        title: "第一章",
        subtitle: "",
        pages: [
          {
            id: "p1",
            title: "第 1 页",
            image: "data:,",
            width: 100,
            height: 100,
            panels: [
              {
                id: "old-panel-1",
                rect: { x: 0, y: 0, width: 100, height: 100 },
                dialogue: "旧对白内容",
                speaker: "陈屿",
                sound: "pulse",
                duration: 6,
              },
            ],
          },
        ],
      },
    ],
  };
  const migrated = migrateDocument(legacy)!;
  assert.equal(migrated.audioVersion, 2);
  const panel = migrated.chapters[0]!.pages[0]!.panels[0]!;
  assert.ok(panel.description.brief.includes("旧对白内容"));
  const kinds = panel.cues.map((c) => c.kind);
  assert.deepEqual([...new Set(kinds)].sort(), ["description", "dialogue", "sfx"]);
  // cueOrder 覆盖全部新线索
  const cueIds = new Set(panel.cues.map((c) => c.id));
  assert.ok(migrated.chapters[0]!.pages[0]!.cueOrder.every((id) => cueIds.has(id)));
  // 旧字段保留兼容
  assert.equal(panel.dialogue, "旧对白内容");
});

test("迁移对已是 v2 的文档幂等", () => {
  const doc = demoDocument();
  assert.equal(migrateDocument(doc), doc);
});

test("非法文档迁移返回 null", () => {
  assert.equal(migrateDocument(null), null);
  assert.equal(migrateDocument({ version: 2 }), null);
  assert.equal(migrateDocument({ version: 1, chapters: "x" }), null);
});

test("迁移后的旧存档没有错误级校验问题，缺转场仅为提醒", () => {
  const legacy = {
    version: 1,
    id: "old2",
    title: "旧漫画",
    author: "某人",
    chapters: [
      {
        id: "c1",
        title: "第一章",
        subtitle: "",
        pages: Array.from({ length: 2 }, (_, i) => ({
          id: `p${i}`,
          title: `第 ${i + 1} 页`,
          image: "data:,",
          width: 100,
          height: 100,
          panels: [
            {
              id: `panel-${i}`,
              rect: { x: 0, y: 0, width: 100, height: 100 },
              dialogue: "台词",
              speaker: "旁白",
              sound: "rain",
              duration: 5,
            },
          ],
        })),
      },
    ],
  };
  const migrated = migrateDocument(legacy)!;
  const issues = validateDocument(migrated);
  assert.deepEqual(issues.filter((i) => i.severity === "error"), []);
  assert.ok(issues.some((i) => i.code === "missing-transition"));
});
