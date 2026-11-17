import { ref, computed, watch, onBeforeUnmount, type ComputedRef } from "vue";
import type { Panel } from "../../../shared/document";
import { AmbientSynth } from "../lib/synth";
import { cueFor } from "../lib/cues";
export function useAudio(panel: ComputedRef<Panel | undefined>) {
  const enabled = ref(false),
    volume = ref(0.35),
    dialogue = ref(true),
    error = ref(""),
    cue = computed(() => cueFor(panel.value));
  const synth = new AmbientSynth();
  let generation = 0;
  async function play() {
    const own = ++generation;
    try {
      await synth.start(cue.value.kind, volume.value);
      if (own !== generation && !enabled.value) synth.stop();
    } catch {
      enabled.value = false;
      error.value = "浏览器未能启动声音，请再次点击播放";
    }
  }
  function toggle() {
    enabled.value = !enabled.value;
    if (enabled.value) void play();
    else {
      generation++;
      synth.stop();
    }
  }
  watch(
    () => panel.value?.id,
    () => {
      if (enabled.value) void play();
    },
  );
  watch(volume, (v) => synth.volume(v));
  onBeforeUnmount(() => synth.dispose());
  return { enabled, volume, dialogue, error, cue, toggle };
}
