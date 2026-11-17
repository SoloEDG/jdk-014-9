<script setup lang="ts">
import { ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-vue-next";
import type { Chapter } from "../../../shared/document";
defineProps<{ chapter: Chapter; active: boolean; number: number }>();
const emit = defineEmits<{
  select: [];
  rename: [];
  move: [delta: number];
  remove: [];
}>();
</script>
<template>
  <article class="chapter-item" :class="{ active }">
    <button class="chapter-select" @click="emit('select')">
      <span class="chapter-number">{{ String(number).padStart(2, "0") }}</span
      ><span
        ><strong>{{ chapter.title }}</strong
        ><small
          >{{ chapter.pages.length }} 页 ·
          {{
            chapter.pages.reduce((n, p) => n + p.panels.length, 0)
          }}
          分镜</small
        ></span
      ><span v-if="active" class="active-dot"></span>
    </button>
    <div class="chapter-actions">
      <button title="向上移动章节" @click="emit('move', -1)">
        <ChevronUp :size="13" /></button
      ><button title="向下移动章节" @click="emit('move', 1)">
        <ChevronDown :size="13" /></button
      ><button title="重命名章节" @click="emit('rename')">
        <Pencil :size="12" /></button
      ><button title="删除章节" @click="emit('remove')">
        <Trash2 :size="12" />
      </button>
    </div>
  </article>
</template>
