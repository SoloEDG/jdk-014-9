<script setup lang="ts">
import type { Chapter } from "../../../shared/document";
import ChapterItem from "./ChapterItem.vue";
defineProps<{
  chapters: Chapter[];
  active: string;
  editing: string;
  draft: string;
  error: string;
}>();
const emit = defineEmits<{
  select: [id: string];
  rename: [id: string];
  move: [id: string, delta: number];
  remove: [id: string];
  draft: [value: string];
  save: [];
}>();
</script>
<template>
  <section class="chapters">
    <div class="section-heading">
      <span>章节目录</span><span class="muted">{{ chapters.length }} 章</span>
    </div>
    <ChapterItem
      v-for="(c, i) in chapters"
      :key="c.id"
      :chapter="c"
      :active="c.id === active"
      :number="i + 1"
      @select="emit('select', c.id)"
      @rename="emit('rename', c.id)"
      @move="emit('move', c.id, $event)"
      @remove="emit('remove', c.id)"
    />
    <form v-if="editing" class="rename-form" @submit.prevent="emit('save')">
      <input
        aria-label="章节名称"
        :value="draft"
        @input="emit('draft', ($event.target as HTMLInputElement).value)"
      /><button>保存</button>
    </form>
    <p v-if="error" role="alert" class="notice">{{ error }}</p>
    <div class="chapter-note">
      故事的每一格，都值得停留。<br />戴上耳机，进入雨夜。
    </div>
  </section>
</template>
