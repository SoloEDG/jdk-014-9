import type { Chapter, ComicPage } from "../../../shared/document";
import { makeId } from "../../../shared/commands";
async function readImage(file: File): Promise<ComicPage> {
  if (
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)
  )
    throw new Error(`不支持 ${file.name}，请选择 PNG、JPG、WebP 或 GIF`);
  if (file.size > 8 * 1024 * 1024) throw new Error("单张图片不能超过 8 MB");
  const image = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("图片读取失败"));
    r.readAsDataURL(file);
  });
  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const img = new Image();
      img.onload = () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("图片无法解码"));
      img.src = image;
    },
  );
  if (dimensions.width * dimensions.height > 40000000)
    throw new Error("图片分辨率过大");
  const descId = makeId("cue"),
    lineId = makeId("cue"),
    sfxId = makeId("cue");
  return {
    id: makeId("page"),
    title: file.name,
    image,
    ...dimensions,
    cueOrder: [descId, lineId, sfxId],
    panels: [
      {
        id: makeId("panel"),
        rect: { x: 0, y: 0, ...dimensions },
        dialogue: "在这一页，留下属于你的故事。",
        speaker: "旁白",
        sound: "wind",
        duration: 5,
        description: {
          characters: "待补充",
          action: "导入的整页画面，尚未拆分分镜",
          setting: "用户导入图片",
          brief: "一整页待编辑的漫画画面，暂无分镜描述。",
          full: "用户从本地导入的整页图片，尚未进行分镜拆分与无障碍描述编写，需要作者补充人物、动作与场景信息。",
        },
        cues: [
          { id: descId, kind: "description", text: "" },
          {
            id: lineId,
            kind: "dialogue",
            speaker: "旁白",
            text: "在这一页，留下属于你的故事。",
          },
          {
            id: sfxId,
            kind: "sfx",
            sound: "wind",
            text: "远处呼啸的风声",
            durationMs: 2400,
          },
        ],
      },
    ],
  };
}
export async function importImages(files: File[]): Promise<Chapter> {
  if (files.length === 0 || files.length > 30)
    throw new Error("一次请选择 1 至 30 张图片");
  if (files.reduce((n, f) => n + f.size, 0) > 18 * 1024 * 1024)
    throw new Error("本次导入总大小不能超过 18 MB");
  const sorted = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
  const pages: ComicPage[] = [];
  for (const file of sorted) pages.push(await readImage(file));
  return {
    id: makeId("chapter"),
    title: `导入章节 · ${sorted[0]!.name.replace(/\.[^.]+$/, "")}`,
    subtitle: `本地导入 / ${pages.length} 页`,
    pages,
  };
}
