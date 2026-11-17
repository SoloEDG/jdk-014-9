<script setup lang="ts">
import { Upload, BookOpen } from "lucide-vue-next";
defineProps<{ busy: boolean; message: string }>();
const emit = defineEmits<{ import: [files: File[]]; reset: [] }>();
function selected(e: Event) {
  const input = e.target as HTMLInputElement;
  emit("import", Array.from(input.files ?? []));
  input.value = "";
}
</script>
<template>
  <div class="library-tools">
    <label class="import-button"
      ><Upload :size="15" /> {{ busy ? "正在导入…" : "导入漫画"
      }}<input
        aria-label="导入漫画图片"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        :disabled="busy"
        @change="selected" /></label
    ><button class="subtle-button" @click="emit('reset')">
      <BookOpen :size="14" /> 内置漫画
    </button>
    <p v-if="message" class="notice" role="status">{{ message }}</p>
  </div>
</template>
