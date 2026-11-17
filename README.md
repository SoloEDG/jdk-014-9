# PANEL · 无障碍听读版

为看不清画面的读者打造的漫画阅读应用：每一格都有人物、动作、场景的分层描述，
对白与环境音按作者指定的顺序组织成可控的听读队列，并与视觉逐格模式共享同一剧情位置。

安装：`npm install`

本地启动：`npm run dev`

生产构建：`npm run typecheck && npm run build`

测试：`npm test`（Node 内置 test runner + tsx，共 32 个用例，覆盖听读计划、
校验器、修订报告、队列代际隔离与旧存档迁移）

Docker 启动：`docker compose up --build`，访问 http://localhost:3014。

## 数据模型（src/shared/document.ts）

- `Panel.description`：`characters / action / setting` 三段结构化信息 + `brief`（精简）
  与 `full`（完整）两套描述文本。
- `Panel.cues`：每格的声音线索，类型为 `description | dialogue | sfx`；
  对白带 `speaker`，音效带合成音色与时长，任意线索可设 `interruptAfter` 打断点。
- `ComicPage.transitionCue`：翻页转场描述（首页可缺，其余页缺失会被校验器标记）。
- `ComicPage.cueOrder`：**作者指定的听读顺序**，存放线索 id；多人对话不必按几何
  位置排列。未收录的线索按几何顺序追加并标记 `unlisted`，失效引用不会进入播放队列。
- `ComicDocument.audioVersion = 2`：旧版 v1 存档由 `shared/migration.ts` 自动迁移，
  单条对白/音效会被补全为分层描述 + 多线索结构。

## 听读队列（src/features/audio）

- `lib/plan.ts`：把 `cueOrder` 解析成快照式播放计划，并提供校验器
  （失效引用、重复收录、未收录线索、缺转场、缺精简描述、缺关键动作、
  对白缺说话人、说话人与人物描述不一致）。
- `model/queue.ts`：播放引擎。
  - **代际令牌（generation）**：开始/停止/切页/结构修订都会使旧代际失效，
    旧队列的异步 TTS 与音效回调立即终止，绝不会串入新队列。
  - 修订号与计划快照不一致时，听读中的旧队列整体作废并提示重新开始。
  - 支持播放/暂停、上一条/下一条、重听本句、跳到任意一句、跳过描述、
    作者打断点（自动暂停等待「继续」）。
  - 朗读跨格时可同步视觉分镜，听读与逐格模式停在同一剧情点。
- `lib/speech.ts`：浏览器 `SpeechSynthesis` 封装，自动选择中文语音；
  不支持 TTS 的环境按节奏模拟停留。
- `lib/synth.ts`：Web Audio 环境音合成，支持循环声景与限时一次性音效；
  无 Web Audio 环境降级为定时器，便于无头测试。

## 结构修订（src/features/chapters/lib/revision.ts）

- 分镜拆分：纵向一分为二，原格保留描述与首条对白，其余线索移入新格并换新 id；
  被移动线索在 `cueOrder` 中的旧条目即刻失效，**修订报告逐条列出失效 id**，
  可按页定位并「一键修订」（剔除失效/重复项并补齐未收录线索）。
- 章节重排、删除后生成复查报告，明确说明顺序是否仍然有效。

## 界面与快捷键

- 右侧「无障碍听读」面板：精简/完整层次切换、播放控制、语速/音量、
  带打断点与未收录标记的有序线索列表、本页校验问题汇总。
- 分镜导航条：每格显示分层描述摘要与问题徽标，可直接拆分分镜。
- `←/→` 翻页或逐格（逐格顺序同样遵循作者 `cueOrder`）；
  `Space` 播放/暂停；`R` 重听本句；`D` 跳过描述；`Esc` 回到整页模式。
