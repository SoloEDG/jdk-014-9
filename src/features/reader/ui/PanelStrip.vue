<script setup lang="ts">
import { computed } from "vue";
import { Scissors, AlertTriangle } from "lucide-vue-next";
import type { ComicPage, DescriptionLevel } from "../../../shared/document";
import type { OrderIssue } from "../../audio/lib/plan";
import { frameStyle } from "../lib/viewport";

const props = defineProps<{
  page: ComicPage;
  active: string;
  level: DescriptionLevel;
  issues: OrderIssue[];
}>();
const emit = defineEmits<{
  select: [id: string];
  split: [id: string];
}>();

const issueByPanel = computed(() => {
  const map = new Map<string, { error: number; warning: number }>();
  for (const issue of props.issues) {
    if (!issue.panelId) continue;
    const entry = map.get(issue.panelId) ?? { error: 0, warning: 0 };
    if (issue.severity === "error") entry.error++;
    else entry.warning++;
    map.set(issue.panelId, entry);
  }
  return map;
});
</script>
<template>
  <section class="panel-strip">
    <div class="section-heading">
      <span>分镜导航 <small>STORYBOARD</small></span
      ><span class="muted">{{ page.panels.length }} 个镜头</span>
    </div>
    <div class="panel-thumbs">
      <div
        v-for="(panel, i) in page.panels"
        :key="panel.id"
        class="panel-thumb"
        :class="{ selected: active === panel.id }"
      >
        <button class="panel-thumb-main" @click="emit('select', panel.id)">
          <div :style="frameStyle(page, panel, 'panel')"></div>
          <span class="panel-thumb-meta">
            <b>{{ String(i + 1).padStart(2, "0") }}</b>
            {{ panel.description.characters }}
            <small>{{ panel.duration }}s</small>
          </span>
          <p class="panel-thumb-desc">
            {{ level === "full" ? panel.description.full : panel.description.brief }}
          </p>
          <span
            v-if="issueByPanel.get(panel.id)"
            class="issue-badge"
            :class="{
              error: issueByPanel.get(panel.id)?.error,
              warning: !issueByPanel.get(panel.id)?.error,
            }"
            :title="`${issueByPanel.get(panel.id)?.error ?? 0} 个错误，${issueByPanel.get(panel.id)?.warning ?? 0} 个提醒`"
          >
            <AlertTriangle :size="11" />
            {{ (issueByPanel.get(panel.id)?.error ?? 0) + (issueByPanel.get(panel.id)?.warning ?? 0) }}
          </span>
        </button>
        <button
          class="split-btn"
          title="把这一格拆分为两格（会生成听读顺序修订报告）"
          @click="emit('split', panel.id)"
        >
          <Scissors :size="12" /> 拆分分镜
        </button>
      </div>
    </div>
  </section>
</template>
