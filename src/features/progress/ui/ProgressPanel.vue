<script setup lang="ts">
import { Bookmark, Plus, X, Check } from "lucide-vue-next";
import type {
  Bookmark as Mark,
  ReadingLocation,
} from "../../../shared/document";
defineProps<{ bookmarks: Mark[]; percent: number; status: string }>();
const emit = defineEmits<{
  add: [];
  restore: [location: ReadingLocation];
  remove: [id: string];
}>();
</script>
<template>
  <section class="progress-panel">
    <div class="section-heading">
      <span><Bookmark :size="14" /> 我的书签</span
      ><button title="添加当前书签" @click="emit('add')">
        <Plus :size="16" />
      </button>
    </div>
    <div v-if="!bookmarks.length" class="empty-bookmarks">
      <Bookmark :size="23" />
      <p>把喜欢的瞬间留在这里</p>
      <button @click="emit('add')">添加当前分镜</button>
    </div>
    <div v-for="mark in bookmarks" :key="mark.id" class="bookmark-row">
      <button @click="emit('restore', mark.location)">{{ mark.label }}</button
      ><button title="删除书签" @click="emit('remove', mark.id)">
        <X :size="12" />
      </button>
    </div>
    <div class="reading-progress">
      <div>
        <span>全书阅读进度</span><b>{{ percent }}%</b>
      </div>
      <div class="progress-track">
        <i :style="{ width: `${percent}%` }"></i>
      </div>
      <p><Check :size="12" /> {{ status }}</p>
    </div>
  </section>
</template>
