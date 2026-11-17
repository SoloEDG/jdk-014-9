<script setup lang="ts">
import { computed } from "vue";
import {
  Headphones,
  Play,
  Pause,
  Square,
  RotateCcw,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Eye,
  ListOrdered,
  AlertTriangle,
  OctagonPause,
  Gauge,
} from "lucide-vue-next";
import type { AudioController } from "../model/audio";
import { cueKindLabel } from "../model/audio";
import { itemText } from "../lib/plan";
import { volumeLabel, statusLabel } from "../lib/cues";

const props = defineProps<{
  audio: AudioController;
  pageTitle: string;
}>();
const emit = defineEmits<{ "switch-visual": [] }>();

const a = props.audio;
const activeId = computed(() => a.current.value?.cueId ?? "");
const errorCount = computed(
  () => a.issues.value.filter((i) => i.severity === "error").length,
);
const warningCount = computed(
  () => a.issues.value.filter((i) => i.severity === "warning").length,
);

function kindClass(kind: string) {
  return `cue-kind kind-${kind}`;
}
</script>

<template>
  <section class="listen-panel" aria-label="听读控制台">
    <div class="section-heading">
      <span><Headphones :size="15" /> 无障碍听读</span>
      <span class="listen-status" :data-status="a.status.value">{{
        statusLabel(a.status.value)
      }}</span>
    </div>

    <div v-if="!a.ttsSupported.value" class="listen-warning" role="alert">
      <AlertTriangle :size="14" />
      当前浏览器不支持语音合成，队列将按节奏模拟停留，建议使用
      Chrome / Edge 获得完整朗读体验。
    </div>

    <!-- 描述层次 -->
    <div class="level-block" role="group" aria-label="描述详细层次">
      <span class="block-title"><Eye :size="13" /> 描述层次</span>
      <div class="level-switch">
        <button
          :class="{ active: a.level.value === 'brief' }"
          :aria-pressed="a.level.value === 'brief'"
          @click="a.setLevel('brief')"
        >
          精简<small>只保留必需信息</small>
        </button>
        <button
          :class="{ active: a.level.value === 'full' }"
          :aria-pressed="a.level.value === 'full'"
          @click="a.setLevel('full')"
        >
          完整<small>人物 · 动作 · 场景全量</small>
        </button>
      </div>
    </div>

    <!-- 播放控制 -->
    <div class="transport">
      <button
        class="transport-btn"
        aria-label="上一条线索"
        :disabled="a.index.value <= 0"
        @click="a.step(-1)"
      >
        <ChevronLeft :size="18" />
      </button>
      <button class="transport-btn primary" aria-label="播放或暂停" @click="a.toggle()">
        <Pause v-if="a.status.value === 'playing' || a.status.value === 'waiting'" :size="19" />
        <Play v-else :size="19" />
      </button>
      <button
        class="transport-btn"
        aria-label="停止并回到本页开头"
        @click="a.stop()"
      >
        <Square :size="15" />
      </button>
      <button
        class="transport-btn"
        aria-label="下一条线索"
        :disabled="a.index.value >= a.progress.value.total - 1"
        @click="a.step(1)"
      >
        <ChevronRight :size="18" />
      </button>
    </div>

    <div class="transport-actions">
      <button @click="a.replay()">
        <RotateCcw :size="13" /> 重听本句
      </button>
      <button @click="a.skipDescriptions()">
        <SkipForward :size="13" /> 跳过描述
      </button>
      <button @click="emit('switch-visual')">
        <ListOrdered :size="13" /> 切回逐格
      </button>
    </div>

    <div class="listen-progress" aria-label="听读进度">
      <div class="listen-progress-track">
        <i :style="{ width: `${a.progress.value.percent}%` }"></i>
      </div>
      <small
        >第 {{ Math.max(0, a.index.value) + 1 }} /
        {{ a.progress.value.total }} 条 · {{ pageTitle }}</small
      >
    </div>

    <div v-if="a.status.value === 'waiting'" class="interrupt-banner">
      <OctagonPause :size="15" />
      <span>作者打断点：先停在这里</span>
      <button @click="a.resume()">继续播放</button>
    </div>

    <!-- 语速与环境声景 -->
    <div class="listen-options">
      <label class="option-row">
        <Gauge :size="14" />
        <span>语速 {{ a.rate.value.toFixed(1) }}x</span>
        <input
          type="range"
          min="0.6"
          max="1.8"
          step="0.1"
          :value="a.rate.value"
          aria-label="朗读语速"
          @input="a.rate.value = Number(($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="option-row">
        <Volume2 :size="14" />
        <span>声景 {{ volumeLabel(a.volume.value) }}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="a.volume.value"
          aria-label="环境声景音量"
          @input="a.volume.value = Number(($event.target as HTMLInputElement).value)"
        />
      </label>
      <button
        class="ambient-toggle"
        :class="{ on: a.ambientOn.value }"
        :aria-pressed="a.ambientOn.value"
        @click="a.toggleAmbient()"
      >
        {{ a.ambientOn.value ? "循环声景：开" : "循环声景：关" }}
      </button>
      <label class="option-row checkbox-row">
        <input type="checkbox" v-model="a.autoAdvancePanel.value" />
        <span>朗读跨格时同步视觉分镜位置</span>
      </label>
    </div>

    <p v-if="a.error.value" class="listen-error" role="alert">{{ a.error.value }}</p>

    <!-- 作者指定顺序的线索列表 -->
    <div class="cue-list-heading">
      <span><ListOrdered :size="13" /> 听读顺序</span>
      <small>点击任意一句可直接跳转重听</small>
    </div>
    <ol class="cue-list">
      <li
        v-for="(item, i) in a.items.value"
        :key="item.key"
        :class="{
          active: item.cueId === activeId,
          unlisted: item.unlisted,
        }"
      >
        <button class="cue-row" @click="a.jumpTo(item.cueId)">
          <span class="cue-index">{{ i + 1 }}</span>
          <span :class="kindClass(item.kind)">{{ cueKindLabel(item.kind) }}</span>
          <span class="cue-text">
            <template v-if="item.kind === 'dialogue'">
              <b>{{ item.speaker }}：</b>{{ item.text }}
            </template>
            <template v-else-if="item.kind === 'description'">
              {{ itemText(item, a.level.value) }}
            </template>
            <template v-else>{{ item.text }}</template>
            <em v-if="item.unlisted" class="unlisted-tag">未编入顺序 · 几何追加</em>
            <em v-if="item.interruptAfter" class="interrupt-tag">打断点</em>
          </span>
        </button>
      </li>
    </ol>

    <!-- 校验问题 -->
    <div v-if="a.issues.value.length" class="issue-block">
      <div class="issue-summary">
        <AlertTriangle :size="14" />
        <span>本页检查到 {{ errorCount }} 个错误、{{ warningCount }} 个提醒</span>
      </div>
      <ul>
        <li
          v-for="(issue, i) in a.issues.value"
          :key="`${issue.cueId ?? issue.panelId ?? 'p'}-${i}`"
          :class="issue.severity"
        >
          {{ issue.message }}
        </li>
      </ul>
    </div>
  </section>
</template>
