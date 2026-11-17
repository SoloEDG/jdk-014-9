import type { Panel } from "../../../shared/document";

export function volumeLabel(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

/** 旧版单格声景信息（整页循环声景开关仍在使用） */
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

export function statusLabel(status: string): string {
  switch (status) {
    case "playing":
      return "正在朗读";
    case "paused":
      return "已暂停";
    case "waiting":
      return "已在打断点暂停 · 点击继续";
    case "done":
      return "本页听读完成";
    default:
      return "等待播放";
  }
}
