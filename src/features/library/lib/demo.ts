import type { ComicDocument } from "../../../shared/document";
import { artwork } from "./artwork";
export function demoDocument(): ComicDocument {
  const lines = [
    [
      "整座城市都在等待一场不会停的雨。",
      "末班车已经走了，你还在等谁？",
      "一封没有署名的消息，在凌晨两点亮起。",
      "沿着光走。我们在旧车站见。",
    ],
    [
      "街灯把影子拉得很长。",
      "我记得这里，曾经有一间唱片店。",
      "有人比我更早抵达。",
      "雨声里，传来一首熟悉的歌。",
    ],
    [
      "城市的边缘，终于亮起一线微光。",
      "原来你一直都在。",
      "那封信，是写给昨天的自己。",
      "天亮了。我们出发吧。",
    ],
  ];
  return {
    version: 1,
    id: "before-rain",
    title: "雨停之前",
    author: "林间工作室",
    chapters: lines.map((text, c) => ({
      id: `chapter-${c}`,
      title: ["第一章 · 夜的来信", "第二章 · 失落的频率", "第三章 · 天光将至"][
        c
      ]!,
      subtitle: [
        "凌晨 02:17 / 城市边缘",
        "凌晨 03:42 / 旧车站",
        "清晨 05:06 / 海岸",
      ][c]!,
      pages: Array.from({ length: c === 0 ? 4 : 3 }, (_, p) => ({
        id: `page-${c}-${p}`,
        title: `第 ${p + 1} 页`,
        width: 900,
        height: 1200,
        image: artwork(c + p),
        panels: text.map((dialogue, i) => ({
          id: `panel-${c}-${p}-${i}`,
          dialogue,
          speaker: i % 2 ? "陈屿" : "旁白",
          sound: i === 2 ? "pulse" : "rain",
          duration: 4 + i,
          rect: [
            { x: 12, y: 12, width: 876, height: 532 },
            { x: 12, y: 558, width: 430, height: 390 },
            { x: 456, y: 558, width: 432, height: 390 },
            { x: 12, y: 962, width: 876, height: 226 },
          ][i]!,
        })),
      })),
    })),
  };
}
