<script setup lang="ts">
import { ref } from "vue";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-vue-next";
import type {
  ComicPage,
  Panel,
  ReadingLocation,
  ReadingMode,
} from "../../../shared/document";
import { frameStyle } from "../lib/viewport";
const props = defineProps<{
  page: ComicPage;
  panel: Panel;
  location: ReadingLocation;
  mode: ReadingMode;
}>();
const emit = defineEmits<{
  move: [delta: number];
  pan: [x: number, y: number];
  panel: [id: string];
}>();
const stage = ref<HTMLElement>();
let drag: { x: number; y: number; px: number; py: number } | null = null;
function down(e: PointerEvent) {
  if (props.location.zoom <= 1) return;
  drag = {
    x: e.clientX,
    y: e.clientY,
    px: props.location.x,
    py: props.location.y,
  };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function move(e: PointerEvent) {
  if (drag)
    emit("pan", drag.px + e.clientX - drag.x, drag.py + e.clientY - drag.y);
}
function fullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void stage.value?.requestFullscreen();
}
</script>
<template>
  <section ref="stage" class="reader-stage">
    <div class="stage-grain"></div>
    <div class="stage-topline">
      <span><i></i> IMMERSIVE READING</span
      ><button title="全屏阅读" @click="fullscreen">
        <Maximize2 :size="16" />
      </button>
    </div>
    <button
      class="nav-arrow previous"
      aria-label="上一页或分镜"
      @click="emit('move', -1)"
    >
      <ChevronLeft :size="23" />
    </button>
    <div
      class="comic-frame"
      :class="{ focused: mode === 'panel' }"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="drag = null"
      @pointercancel="drag = null"
    >
      <div
        class="comic-image"
        :style="{
          ...frameStyle(page, panel, mode),
          transform: `translate(${location.x}px, ${location.y}px) scale(${location.zoom})`,
        }"
      >
        <template v-if="mode === 'page'"
          ><button
            v-for="(p, i) in page.panels"
            :key="p.id"
            class="panel-hotspot"
            :style="{
              left: `${(p.rect.x / page.width) * 100}%`,
              top: `${(p.rect.y / page.height) * 100}%`,
              width: `${(p.rect.width / page.width) * 100}%`,
              height: `${(p.rect.height / page.height) * 100}%`,
            }"
            :aria-label="`阅读分镜 ${i + 1}`"
            @dblclick="emit('panel', p.id)"
          >
            <span>{{ String(i + 1).padStart(2, "0") }}</span>
          </button></template
        >
      </div>
    </div>
    <button
      class="nav-arrow next"
      aria-label="下一页或分镜"
      @click="emit('move', 1)"
    >
      <ChevronRight :size="23" />
    </button>
    <div class="stage-caption">
      <span
        >{{ mode === "page" ? "整页浏览" : "逐格沉浸" }} <b>·</b>
        {{ page.title }}</span
      ><span>← → 翻阅 <b>·</b> 双击分镜进入</span>
    </div>
  </section>
</template>
