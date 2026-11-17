<script setup lang="ts">
import { computed } from "vue";
import { FileWarning, Wrench, X, ExternalLink } from "lucide-vue-next";
import type { Ref } from "vue";
import type { RevisionReport } from "../lib/revision";

const props = defineProps<{
  report: Ref<RevisionReport | null>;
  currentPageId: string;
}>();
const emit = defineEmits<{
  repair: [pageId: string];
  dismiss: [];
  locate: [pageId: string];
}>();

const visible = computed(() => props.report.value !== null);
const grouped = computed(() => {
  const map = new Map<string, string[]>();
  for (const item of props.report.value?.invalidCueIds ?? []) {
    const list = map.get(item.pageId) ?? [];
    list.push(item.cueId);
    map.set(item.pageId, list);
  }
  return [...map.entries()].map(([pageId, cueIds]) => ({ pageId, cueIds }));
});
</script>

<template>
  <section v-if="visible" class="revision-panel" role="alert" aria-label="听读顺序修订报告">
    <div class="revision-head">
      <span><FileWarning :size="15" /> 结构修订报告</span>
      <button aria-label="关闭报告" @click="emit('dismiss')"><X :size="14" /></button>
    </div>
    <p class="revision-summary">{{ report?.value?.summary }}</p>
    <ul class="revision-details">
      <li v-for="(line, i) in report?.value?.details" :key="i">{{ line }}</li>
    </ul>
    <div v-if="grouped.length" class="revision-pages">
      <p>失效顺序所在页面：</p>
      <div v-for="group in grouped" :key="group.pageId" class="revision-page">
        <div class="revision-page-head">
          <button
            class="locate-btn"
            :class="{ current: group.pageId === currentPageId }"
            @click="emit('locate', group.pageId)"
          >
            <ExternalLink :size="12" />
            {{ group.pageId }}
            <small v-if="group.pageId === currentPageId">（当前页）</small>
          </button>
          <button class="repair-btn" @click="emit('repair', group.pageId)">
            <Wrench :size="12" /> 一键修订本页
          </button>
        </div>
        <ul class="invalid-cues">
          <li v-for="cueId in group.cueIds" :key="cueId">
            <code>{{ cueId }}</code>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
