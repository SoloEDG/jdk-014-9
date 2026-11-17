import type {
  ComicDocument,
  Bookmark,
  ReadingLocation,
} from "../../../shared/document";
import { migrateDocument } from "../../../shared/migration";

const KEY = "panel-jdk014-v1";

export interface SavedSession {
  document: ComicDocument;
  location: ReadingLocation;
  bookmarks: Bookmark[];
}

export function readSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as SavedSession;
    // 旧版存档在这里一次性迁移到分层描述 + 多线索结构
    const document = migrateDocument(value.document);
    if (
      !document ||
      !Array.isArray(document.chapters) ||
      !document.chapters.length ||
      !value.location ||
      !Array.isArray(value.bookmarks)
    )
      return null;
    for (const c of document.chapters) {
      if (!c.pages?.length) return null;
      for (const p of c.pages)
        if (!p.panels?.length || typeof p.image !== "string") return null;
    }
    return { ...value, document };
  } catch {
    return null;
  }
}

export function writeSession(value: SavedSession): string {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
    return "已保存到此浏览器";
  } catch {
    return "存储空间不足，本次修改仅保留在当前页面；请减少导入图片";
  }
}
