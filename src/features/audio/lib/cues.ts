import type { Panel } from "../../../shared/document";
export function cueFor(panel: Panel | undefined) {
  return {
    title:
      panel?.sound === "rain"
        ? "雨夜 · 城市白噪音"
        : panel?.sound === "pulse"
          ? "电波 · 低频脉冲"
          : "远处 · 海岸风声",
    kind: panel?.sound ?? "rain",
    speaker: panel?.speaker ?? "旁白",
    text: panel?.dialogue ?? "请选择一个分镜",
  };
}
export function volumeLabel(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
