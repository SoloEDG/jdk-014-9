import { test } from "node:test";
import assert from "node:assert/strict";
import { advance } from "../src/features/reader/lib/navigation.ts";
import { makePanel, makePage, makeDoc } from "./helpers/factory.ts";
import type { ReadingLocation } from "../src/shared/document.ts";

test("逐格推进遵循作者 cueOrder 决定的分镜先后，而非几何位置", () => {
  const p1 = makePanel();
  const p2 = makePanel();
  const page = makePage([p1, p2]);
  // 作者把第二格的全部线索排在第一格之前
  page.cueOrder = [
    ...p2.cues.map((c) => c.id),
    ...p1.cues.map((c) => c.id),
  ];
  const doc = makeDoc([page]);
  const start: ReadingLocation = {
    chapterId: doc.chapters[0]!.id,
    pageId: page.id,
    panelId: p2.id, // 作者顺序中的第一格（几何上的第二格）
    zoom: 1,
    x: 0,
    y: 0,
  };
  // 作者顺序首位：向前越界时停在原地
  const backward = advance(doc, start, -1, "panel");
  assert.equal(backward.panelId, p2.id);
  // 向后应按作者顺序跳到几何第一格 p1
  const forward = advance(doc, start, 1, "panel");
  assert.equal(forward.panelId, p1.id);
});

test("整页模式按页推进且跨章节连续", () => {
  const page1 = makePage([makePanel()]);
  const page2 = makePage([makePanel()]);
  const doc = makeDoc([page1, page2]);
  const start: ReadingLocation = {
    chapterId: doc.chapters[0]!.id,
    pageId: page1.id,
    panelId: page1.panels[0]!.id,
    zoom: 1,
    x: 0,
    y: 0,
  };
  const next = advance(doc, start, 1, "page");
  assert.equal(next.pageId, page2.id);
});
