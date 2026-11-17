import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ref, nextTick } from "vue";
import { useListenQueue } from "../src/features/audio/model/queue.ts";
import { makeCue, makePanel, makePage } from "./helpers/factory.ts";

// 队列在无 TTS 环境按文本长度 setTimeout 模拟停留，缩短等待
function fastPage() {
  const panel = makePanel();
  for (const cue of panel.cues) cue.text = "短";
  return makePage([panel]);
}

beforeEach(() => {
  // SpeechEngine 检测 window.speechSynthesis，Node 下走模拟分支
  if (!("window" in globalThis)) {
    (globalThis as { window?: unknown }).window = globalThis;
  }
});

/** 轮询等待某个状态，消除固定 sleep 带来的竞态 */
async function waitFor(
  check: () => boolean,
  timeoutMs = 2000,
): Promise<void> {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeoutMs)
      throw new Error("等待状态超时");
    await new Promise((r) => setTimeout(r, 20));
  }
}

test("播放按计划顺序逐条推进并最终完成", async () => {
  const page = ref(fastPage());
  const revision = ref(0);
  const queue = useListenQueue({ page, level: ref("brief"), revision });
  await queue.start();
  assert.equal(queue.status.value, "done");
  assert.equal(queue.index.value, queue.items.value.length - 1);
});

test("stop 递增代际后，旧的异步播放回调不会继续推进队列", async () => {
  const page = ref(fastPage());
  const revision = ref(0);
  const queue = useListenQueue({ page, level: ref("brief"), revision });
  const running = queue.start();
  queue.stop();
  await running;
  assert.equal(queue.status.value, "idle");
  assert.equal(queue.index.value, -1);
});

test("听读过程中文档修订号变化，旧队列整体作废且不串入新内容", async () => {
  const page = ref(fastPage());
  const revision = ref(0);
  const queue = useListenQueue({ page, level: ref("brief"), revision });
  const running = queue.start();
  await nextTick();
  revision.value = 1; // 模拟分镜拆分 / 章节重排
  await running;
  assert.equal(queue.status.value, "idle");
  assert.equal(queue.index.value, -1);
  assert.ok(queue.error.value.includes("旧播放队列已作废"));
});

test("切页会作废当前队列并为新页重建计划", async () => {
  const pageA = ref(fastPage());
  const revision = ref(0);
  const queue = useListenQueue({ page: pageA, level: ref("brief"), revision });
  const running = queue.start();
  await nextTick();
  pageA.value = fastPage();
  await running;
  await nextTick();
  assert.equal(queue.status.value, "idle");
  assert.equal(queue.plan.value?.pageId, pageA.value.id);
});

test("replay 从当前线索重新播放，jumpTo 可跳到任意一句", async () => {
  const page = ref(fastPage());
  const revision = ref(0);
  const queue = useListenQueue({ page, level: ref("brief"), revision });
  await queue.jumpTo(page.value.panels[0]!.cues[1]!.id);
  assert.equal(queue.status.value, "done");
  assert.ok(queue.index.value >= 1);
});

test("skipDescriptions 跳过后续所有描述线索", async () => {
  const panel = makePanel();
  for (const cue of panel.cues) cue.text = "短";
  const page = ref(makePage([panel]));
  const revision = ref(0);
  const queue = useListenQueue({ page, level: ref("brief"), revision });
  queue.rebuildPlan();
  queue.index.value = 0; // 停在描述上
  await queue.skipDescriptions();
  assert.notEqual(queue.items.value[queue.index.value]?.kind, "description");
});

test("打断点使队列停在 waiting，resume 后从下一条继续", async () => {
  const panel = makePanel();
  for (const cue of panel.cues) cue.text = "短";
  panel.cues[0] = makeCue("description", {
    interruptAfter: true,
    text: "短",
  });
  const page = ref(makePage([panel]));
  const revision = ref(0);
  const queue = useListenQueue({ page, level: ref("brief"), revision });
  void queue.start();
  await waitFor(() => queue.status.value === "waiting");
  assert.equal(queue.status.value, "waiting");
  const stoppedAt = queue.index.value;
  await queue.resume();
  assert.equal(queue.status.value, "done");
  assert.ok(queue.index.value > stoppedAt);
});
