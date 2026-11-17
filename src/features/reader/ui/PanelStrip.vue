<script setup lang="ts">
import type { ComicPage } from "../../../shared/document";
import { frameStyle } from "../lib/viewport";
defineProps<{ page: ComicPage; active: string }>();
const emit = defineEmits<{ select: [id: string] }>();
</script>
<template>
  <section class="panel-strip">
    <div class="section-heading">
      <span>分镜导航 <small>STORYBOARD</small></span
      ><span class="muted">{{ page.panels.length }} 个镜头</span>
    </div>
    <div class="panel-thumbs">
      <button
        v-for="(panel, i) in page.panels"
        :key="panel.id"
        :class="{ selected: active === panel.id }"
        @click="emit('select', panel.id)"
      >
        <div :style="frameStyle(page, panel, 'panel')"></div>
        <span
          ><b>{{ String(i + 1).padStart(2, "0") }}</b> {{ panel.speaker }}
          <small>{{ panel.duration }}s</small></span
        >
      </button>
    </div>
  </section>
</template>
