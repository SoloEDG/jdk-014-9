import { computed, onBeforeUnmount, ref, watch, type Ref } from "vue";
import type {
  ComicPage,
  DescriptionLevel,
} from "../../../shared/document";
import { AmbientSynth } from "../lib/synth";
import { SpeechEngine } from "../lib/speech";
import {
  buildPagePlan,
  itemText,
  type ListeningPlan,
  type PlanItem,
} from "../lib/plan";

export type QueueStatus = "idle" | "playing" | "paused" | "waiting" | "done";

export interface QueueSnapshot {
  plan: ListeningPlan;
  index: number;
  level: DescriptionLevel;
  status: QueueStatus;
}

interface QueueOptions {
  page: Ref<ComicPage | undefined>;
  level: Ref<DescriptionLevel>;
  /** 文档修订号：任何结构变化都会 +1，旧队列据此整体作废 */
  revision: Ref<number>;
  /** 播放跨越分镜时同步视觉阅读位置，保证听读与逐格模式停在同一剧情点 */
  onSyncPanel?: (pageId: string, panelId: string) => void;
}

export function useListenQueue(options: QueueOptions) {
  const synth = new AmbientSynth();
  const speech = new SpeechEngine();

  const plan = ref<ListeningPlan | null>(null);
  const index = ref(-1);
  const status = ref<QueueStatus>("idle");
  const rate = ref(1);
  const ttsSupported = ref(speech.available);
  const error = ref("");
  const autoAdvancePanel = ref(true);

  /** 代际令牌：每次 start/stop/页面或结构变化都递增，旧令牌的异步回调一律作废 */
  let generation = 0;
  let activeSfx: ReturnType<AmbientSynth["playOnce"]> | null = null;
  /** 无 TTS 环境下正在等待的模拟停留计时器，随代际切换一并取消 */
  const activeTimers = new Map<
    ReturnType<typeof setTimeout>,
    () => void
  >();

  const items = computed<PlanItem[]>(() => plan.value?.items ?? []);
  const current = computed<PlanItem | null>(
    () => items.value[index.value] ?? null,
  );
  const progress = computed(() => {
    const total = items.value.length;
    return {
      total,
      index: index.value,
      percent: total
        ? Math.round(((Math.max(0, index.value) + 1) / total) * 100)
        : 0,
    };
  });

  function rebuildPlan(): boolean {
    const page = options.page.value;
    if (!page) {
      plan.value = null;
      index.value = -1;
      return false;
    }
    const next = buildPagePlan(page, options.level.value, options.revision.value);
    plan.value = next;
    return next.items.length > 0;
  }

  function abortPlayback(token: number) {
    activeSfx?.cancel();
    activeSfx = null;
    for (const [timer, resolve] of activeTimers) {
      clearTimeout(timer);
      resolve(); // 让 await 正常返回，runLoop 随即通过令牌复查退出
    }
    activeTimers.clear();
    speech.cancel();
    if (token === generation) status.value = "idle";
  }

  function stop() {
    const token = ++generation;
    abortPlayback(token);
    index.value = -1;
    status.value = "idle";
  }

  function pause() {
    if (status.value !== "playing" && status.value !== "waiting") return;
    const token = ++generation;
    abortPlayback(token);
    status.value = "paused";
  }

  function toggle() {
    if (status.value === "playing" || status.value === "waiting") pause();
    else if (status.value === "paused" || status.value === "done")
      void resume();
    else void start();
  }

  function speakItem(item: PlanItem, token: number): Promise<void> {
    const text = itemText(item, options.level.value);
    if (item.kind === "sfx") {
      activeSfx = synth.playOnce(
        item.sound ?? "rain",
        item.durationMs ?? 2200,
        0.4,
      );
      return activeSfx.done.then(() => {
        activeSfx = null;
      });
    }
    if (!ttsSupported.value) {
      // 无 TTS 环境：按线索长度模拟一个短停留，保证队列流程可演示与测试；
      // 计时器登记在案，代际切换时立即 resolve，旧循环靠令牌复查退出
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          activeTimers.delete(timer);
          resolve();
        }, Math.max(40, Math.min(180, text.length * 3)));
        activeTimers.set(timer, resolve);
      });
    }
    return new Promise<void>((resolve) => {
      speech.speak(text, {
        rate: rate.value,
        onEnd: () => {
          if (token === generation) resolve();
        },
      });
    });
  }

  async function runLoop(fromIndex: number, token: number) {
    if (!plan.value) return;
    status.value = "playing";
    for (let i = fromIndex; i < items.value.length; i++) {
      if (token !== generation) return; // 旧队列：立即终止，绝不串入新播放
      if (options.revision.value !== plan.value.revision) {
        // 听读过程中文档结构被修改：旧队列整体作废（提示由修订号 watcher 统一给出）
        stop();
        return;
      }
      const item = items.value[i]!;
      index.value = i;
      if (item.panelId && autoAdvancePanel.value)
        options.onSyncPanel?.(item.pageId, item.panelId);

      await speakItem(item, token);
      if (token !== generation) return;

      if (item.interruptAfter && i < items.value.length - 1) {
        status.value = "waiting";
        return; // 作者打断点：停在此处，读者确认后 resume 继续下一条
      }
    }
    if (token === generation) {
      index.value = items.value.length - 1;
      status.value = "done";
    }
  }

  async function start() {
    if (!rebuildPlan()) return;
    error.value = "";
    const token = ++generation;
    index.value = 0;
    await runLoop(0, token);
  }

  async function resume() {
    if (status.value === "waiting") {
      const token = ++generation;
      await runLoop(index.value + 1, token);
      return;
    }
    if (status.value === "paused") {
      const token = ++generation;
      const from = Math.max(0, index.value);
      await runLoop(from, token);
      return;
    }
    await start();
  }

  /** 重听当前句：重建同一令牌代际，只重播当前项后继续 */
  async function replay() {
    if (!plan.value || index.value < 0) {
      await start();
      return;
    }
    const token = ++generation;
    await runLoop(index.value, token);
  }

  /** 跳到指定线索（读者点击听读列表中的任意一句） */
  async function jumpTo(cueId: string) {
    if (!rebuildPlan()) return;
    const target = items.value.findIndex((item) => item.cueId === cueId);
    if (target < 0) return;
    const token = ++generation;
    await runLoop(target, token);
  }

  /** 跳到下一条 / 上一条线索 */
  async function step(delta: number) {
    if (!plan.value) rebuildPlan();
    const target = Math.max(
      0,
      Math.min(items.value.length - 1, index.value + delta),
    );
    const token = ++generation;
    await runLoop(target, token);
  }

  /** 跳过描述：直接移动到当前格之后的第一条非描述线索 */
  async function skipDescriptions() {
    if (!plan.value) return;
    let target = index.value + 1;
    while (
      target < items.value.length &&
      items.value[target]?.kind === "description"
    )
      target++;
    if (target >= items.value.length) {
      status.value = "done";
      return;
    }
    const token = ++generation;
    await runLoop(target, token);
  }

  // 切页：旧队列立即作废，为新页构建空队列等待播放
  watch(
    () => options.page.value?.id,
    () => {
      generation++;
      speech.cancel();
      activeSfx?.cancel();
      activeSfx = null;
      index.value = -1;
      status.value = "idle";
      rebuildPlan();
    },
  );

  // 结构修订号变化：仅当队列正在播放、且修订号领先于当前计划快照时才作废。
  // start() 会立即把计划快照同步到最新修订号，因此延迟 flush 的 watcher
  // 不会误伤紧随其后启动的新队列。
  watch(options.revision, (nextRevision) => {
    const stale = status.value === "playing" || status.value === "waiting";
    if (!stale || plan.value?.revision === nextRevision) {
      rebuildPlan();
      return;
    }
    generation++;
    speech.cancel();
    activeSfx?.cancel();
    activeSfx = null;
    for (const [timer, resolve] of activeTimers) {
      clearTimeout(timer);
      resolve();
    }
    activeTimers.clear();
    index.value = -1;
    status.value = "idle";
    error.value = "文档结构已变化，旧播放队列已作废，请重新开始听读";
    rebuildPlan();
  });

  // 描述层次变化：若正在播放描述线索，按新层次重听；否则只刷新计划快照
  watch(options.level, (level) => {
    const item = current.value;
    rebuildPlan();
    if (
      item &&
      item.kind === "description" &&
      (status.value === "playing" || status.value === "paused")
    ) {
      const target = items.value.findIndex((q) => q.cueId === item.cueId);
      if (target >= 0) {
        const token = ++generation;
        void runLoop(target, token);
      }
    }
    void level;
  });

  onBeforeUnmount(() => {
    generation++;
    speech.cancel();
    synth.dispose();
  });

  return {
    plan,
    items,
    index,
    current,
    status,
    progress,
    rate,
    error,
    ttsSupported,
    autoAdvancePanel,
    start,
    stop,
    pause,
    resume,
    toggle,
    replay,
    jumpTo,
    step,
    skipDescriptions,
    rebuildPlan,
  };
}
