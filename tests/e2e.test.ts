import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ref, nextTick } from "vue";
import { demoDocument } from "../src/features/library/lib/demo.ts";
import { useListenQueue } from "../src/features/audio/model/queue.ts";
import { splitPanel, repairPageOrder } from "../src/features/chapters/lib/revision.ts";
import {
  validatePageInDoc,
  buildPagePlan,
} from "../src/features/audio/lib/plan.ts";

beforeEach(() => {
  if (!("window" in globalThis)) {
    (globalThis as { window?: unknown }).window = globalThis;
  }
});

async function waitFor(check: () => boolean, timeoutMs = 15000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("等待超时");
    await new Promise((r) => setTimeout(r, 15));
  }
}

test("端到端：听读中拆分分镜会作废旧队列，修复后可重新播放且无失效引用", async () => {
  const doc = demoDocument();
  const firstPage = doc.chapters[0]!.pages[0]!;
  const page = ref(firstPage);
  const revision = ref(0);
  const queue = useListenQueue({ page, level: ref("brief"), revision });

  // 1. 开始听读，确认队列跑起来
  void queue.start();
  await waitFor(() => queue.index.value >= 0);
  assert.equal(queue.status.value, "playing");

  // 2. 作者在听读过程中拆分第三格
  const targetPanel = firstPage.panels[2]!;
  const report = splitPanel(doc, firstPage.id, targetPanel.id);
  revision.value = 1; // 对应 workspace 的 bumpRevision
  await nextTick();

  // 3. 旧队列立即作废，不继续朗读旧内容
  assert.equal(queue.status.value, "idle");
  assert.equal(queue.index.value, -1);
  assert.ok(queue.error.value.includes("旧播放队列已作废"));
  assert.ok(report.invalidCueIds.length > 0);

  // 4. 一键修订单页顺序
  const removed = repairPageOrder(firstPage);
  assert.ok(removed.includes(report.invalidCueIds[0]!.cueId));
  revision.value = 2;
  await nextTick();

  // 5. 修复后重新播放：遇到作者打断点会暂停，继续后可正常完成
  void queue.start();
  await waitFor(
    () => queue.status.value === "waiting" || queue.status.value === "done",
  );
  if (queue.status.value === "waiting") {
    await queue.resume();
    await waitFor(() => queue.status.value === "done");
  }
  assert.equal(queue.status.value, "done");
  const issues = validatePageInDoc(doc, firstPage.id);
  assert.equal(issues.some((i) => i.code === "dangling-cue"), false);
});

test("端到端：作者非几何顺序与打断点在真实文档计划中生效", () => {
  const doc = demoDocument();
  const page = doc.chapters[0]!.pages[0]!;
  const plan = buildPagePlan(page, "brief", 0);
  // 第三格女人的插话排在陈屿回应之前
  const woman = page.panels[2]!.cues.find(
    (c) => c.kind === "dialogue" && c.speaker === "陌生女人",
  )!;
  const man = page.panels[2]!.cues.find(
    (c) => c.kind === "dialogue" && c.speaker === "陈屿",
  )!;
  const womanPos = plan.items.findIndex((i) => i.cueId === woman.id);
  const manPos = plan.items.findIndex((i) => i.cueId === man.id);
  assert.ok(womanPos >= 0 && womanPos < manPos);
  // 计划项保留打断点标记
  assert.equal(plan.items[womanPos]!.interruptAfter, true);
});
