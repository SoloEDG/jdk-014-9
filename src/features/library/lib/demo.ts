import type {
  AudioCue,
  Chapter,
  ComicDocument,
  ComicPage,
  Panel,
  PanelDescription,
} from "../../../shared/document";
import { artwork } from "./artwork";

interface LineSpec {
  speaker: string;
  text: string;
  interruptAfter?: boolean;
}

interface PanelSpec {
  characters: string;
  action: string;
  setting: string;
  lines: LineSpec[];
  sfx: { sound: AudioCue["sound"]; label: string };
}

const RECTS = [
  { x: 12, y: 12, width: 876, height: 532 },
  { x: 12, y: 558, width: 430, height: 390 },
  { x: 456, y: 558, width: 432, height: 390 },
  { x: 12, y: 962, width: 876, height: 226 },
];

function buildDescription(
  spec: PanelSpec,
  index: number,
  chapterTitle: string,
): PanelDescription {
  const spoken = spec.lines.map((l) => `「${l.text}」`).join("");
  return {
    characters: spec.characters,
    action: spec.action,
    setting: spec.setting,
    brief: `${spec.characters}，${spec.action}。地点：${spec.setting}。`,
    full:
      `《${chapterTitle}》第 ${index + 1} 格：场景位于${spec.setting}。` +
      `画面中${spec.characters}，${spec.action}。` +
      `冷蓝色雨夜光勾勒出人物轮廓，玻璃与地面有明显反光，镜头延续整页的压抑节奏。` +
      (spoken ? `本格台词为${spoken}。` : "本格没有对白，以环境音留白。"),
  };
}

function buildPanel(
  c: number,
  p: number,
  i: number,
  spec: PanelSpec,
  chapterTitle: string,
): Panel {
  const cues: AudioCue[] = [
    { id: `cue-${c}-${p}-${i}-desc`, kind: "description", text: "" },
    ...spec.lines.map((line, k) => ({
      id: `cue-${c}-${p}-${i}-line-${k}`,
      kind: "dialogue" as const,
      speaker: line.speaker,
      text: line.text,
      interruptAfter: line.interruptAfter,
    })),
    {
      id: `cue-${c}-${p}-${i}-sfx`,
      kind: "sfx",
      sound: spec.sfx.sound,
      text: spec.sfx.label,
      durationMs: 2400,
    },
  ];
  return {
    id: `panel-${c}-${p}-${i}`,
    rect: RECTS[i]!,
    dialogue: spec.lines[0]?.text ?? "",
    speaker: spec.lines[0]?.speaker ?? "旁白",
    sound: spec.sfx.sound ?? "rain",
    duration: 4 + i,
    description: buildDescription(spec, i, chapterTitle),
    cues,
  };
}

function buildPage(
  c: number,
  p: number,
  title: string,
  image: string,
  specs: PanelSpec[],
  chapterTitle: string,
  transition?: string,
  customOrder?: string[],
): ComicPage {
  const panels = specs.map((spec, i) =>
    buildPanel(c, p, i, spec, chapterTitle),
  );
  const geometric = panels.flatMap((panel) => panel.cues.map((cue) => cue.id));
  return {
    id: `page-${c}-${p}`,
    title,
    width: 900,
    height: 1200,
    image,
    panels,
    cueOrder: customOrder ?? geometric,
    transitionCue:
      p > 0
        ? {
            id: `cue-${c}-${p}-transition`,
            kind: "transition",
            text:
              transition ??
              "雨声把两个镜头连在一起，画面切换到下一个场景。",
          }
        : undefined,
  };
}

const CHAPTER_1: PanelSpec[][] = [
  [
    {
      characters: "城市远景（无人物特写）",
      action: "雨幕笼罩高楼，车灯在湿路上拖出光带",
      setting: "凌晨的城市高架",
      lines: [{ speaker: "旁白", text: "整座城市都在等待一场不会停的雨。" }],
      sfx: { sound: "rain", label: "密集的雨声与远处车流" },
    },
    {
      characters: "陈屿独自站在站牌下",
      action: "收起湿透的伞，望向空荡的街道",
      setting: "末班车站台",
      lines: [{ speaker: "陈屿", text: "末班车已经走了，你还在等谁？" }],
      sfx: { sound: "rain", label: "雨打棚顶的敲击声" },
    },
    {
      characters: "陈屿与陌生女人",
      action: "女人先开口，陈屿转头看向她，两人隔着一盏闪烁的街灯",
      setting: "站台长椅旁",
      // 作者指定顺序：女人打断式插话先于陈屿，并在插话后设打断点
      lines: [
        {
          speaker: "陈屿",
          text: "一封没有署名的消息，在凌晨两点亮起。",
        },
        {
          speaker: "陌生女人",
          text: "沿着光走。我们在旧车站见。",
          interruptAfter: true,
        },
      ],
      sfx: { sound: "pulse", label: "手机电波的低频脉冲" },
    },
    {
      characters: "陈屿的背影",
      action: "他迈步走进雨里，站台灯光在身后熄灭",
      setting: "站台出口",
      lines: [{ speaker: "旁白", text: "他决定赴约。" }],
      sfx: { sound: "pulse", label: "脉冲声渐弱，雨声重新占满画面" },
    },
  ],
  [
    {
      characters: "陈屿",
      action: "沿街灯拉长的影子快步前行",
      setting: "旧城商业街",
      lines: [{ speaker: "旁白", text: "街灯把影子拉得很长。" }],
      sfx: { sound: "rain", label: "雨声中混着脚步回音" },
    },
    {
      characters: "陈屿停在紧闭的卷帘门前",
      action: "伸手触摸褪色的唱片店招牌",
      setting: "已结业的唱片店外",
      lines: [{ speaker: "陈屿", text: "我记得这里，曾经有一间唱片店。" }],
      sfx: { sound: "wind", label: "穿巷而过的风声" },
    },
    {
      characters: "陌生女人的侧影",
      action: "她已经等在车站拱门下方，手电光一闪一灭",
      setting: "旧车站拱门",
      lines: [{ speaker: "旁白", text: "有人比我更早抵达。" }],
      sfx: { sound: "pulse", label: "手电电流的轻微嗡鸣" },
    },
    {
      characters: "两人并肩，画面外的唱片店",
      action: "一段熟悉的旋律从巷口飘来，陈屿怔住",
      setting: "车站入口",
      lines: [{ speaker: "陈屿", text: "雨声里，传来一首熟悉的歌。" }],
      sfx: { sound: "wind", label: "旋律被风撕得断断续续" },
    },
  ],
  [
    {
      characters: "陈屿",
      action: "推开锈蚀的车站铁门",
      setting: "旧车站大厅",
      lines: [{ speaker: "旁白", text: "门后没有灯，只有回声。" }],
      sfx: { sound: "pulse", label: "铁门回响与电流脉冲" },
    },
    {
      characters: "陌生女人背对镜头",
      action: "她把一封信放在售票窗口",
      setting: "废弃售票厅",
      lines: [{ speaker: "陌生女人", text: "答案不在我这里，在信里。" }],
      sfx: { sound: "rain", label: "雨敲玻璃天窗" },
    },
    {
      characters: "陈屿的手与信封特写",
      action: "指尖抚过没有署名的信封，停顿两秒",
      setting: "售票窗口",
      lines: [{ speaker: "陈屿", text: "寄信的人，知道我一定会来。" }],
      sfx: { sound: "pulse", label: "心跳般的低频脉冲" },
    },
    {
      characters: "两人对望",
      action: "女人微微点头，转身走向站台深处",
      setting: "候车长廊",
      lines: [{ speaker: "旁白", text: "他拆开信，第一行字让他屏住了呼吸。" }],
      sfx: { sound: "wind", label: "长廊里回旋的风声" },
    },
  ],
  [
    {
      characters: "信纸上的手写字特写",
      action: "镜头推近信纸，雨珠在纸边晕开墨迹",
      setting: "车站长椅",
      lines: [{ speaker: "旁白", text: "「别相信天亮以后的自己。」" }],
      sfx: { sound: "rain", label: "雨声被压得很低" },
    },
    {
      characters: "陈屿",
      action: "攥紧信纸抬头，眼神从迟疑变得坚定",
      setting: "长椅旁",
      lines: [{ speaker: "陈屿", text: "那我就在天亮之前，把事情做完。" }],
      sfx: { sound: "pulse", label: "脉冲声重新加快" },
    },
    {
      characters: "陈屿与陌生女人",
      action: "女人把一把旧钥匙放进他掌心",
      setting: "站台尽头",
      lines: [
        { speaker: "陌生女人", text: "这把钥匙，能打开你丢掉的那段频率。" },
      ],
      sfx: { sound: "wind", label: "钥匙碰撞的清脆声" },
    },
    {
      characters: "两人走向隧道口",
      action: "脚步声与雨声叠在一起，画面渐暗",
      setting: "隧道入口",
      lines: [{ speaker: "旁白", text: "夜还长，他们走进了更深的地方。" }],
      sfx: { sound: "pulse", label: "脉冲与雨声一同淡出" },
    },
  ],
];

const CHAPTER_2: PanelSpec[][] = [
  [
    {
      characters: "陈屿独自面对一台老式收音机",
      action: "把钥匙插进收音机底座的锁孔",
      setting: "旧车站信号室",
      lines: [{ speaker: "陈屿", text: "频率没有丢，只是被人藏起来了。" }],
      sfx: { sound: "pulse", label: "收音机调频的沙沙声" },
    },
    {
      characters: "收音机刻度盘特写",
      action: "指针缓缓停在一个没有标注的频率",
      setting: "信号室桌面",
      lines: [{ speaker: "旁白", text: "指针停在 88.7，一个不存在于任何电台表的位置。" }],
      sfx: { sound: "pulse", label: "规律的电子脉冲" },
    },
    {
      characters: "陈屿屏住呼吸",
      action: "把耳朵贴近喇叭，手指按住录音键",
      setting: "信号室",
      lines: [{ speaker: "陌生女人（录音）", text: "如果你听到这段话，说明雨还没有停。" }],
      sfx: { sound: "wind", label: "录音底噪" },
    },
    {
      characters: "陈屿的侧脸",
      action: "他认出录音里的声音，瞳孔收紧",
      setting: "信号室",
      lines: [{ speaker: "陈屿", text: "这个声音……是十年后的她。" }],
      sfx: { sound: "rain", label: "窗外雨声忽然变大" },
    },
  ],
  [
    {
      characters: "信号室整间屋子",
      action: "灯光随脉冲节奏明灭",
      setting: "信号室",
      lines: [{ speaker: "旁白", text: "录音里藏着一张城市地图的坐标。" }],
      sfx: { sound: "pulse", label: "脉冲节拍" },
    },
    {
      characters: "陈屿在纸上记下坐标",
      action: "笔尖飞快移动，连画三个圈",
      setting: "书桌前",
      lines: [{ speaker: "陈屿", text: "海岸、灯塔、还有那间唱片店。" }],
      sfx: { sound: "rain", label: "纸笔摩擦声与雨声" },
    },
    {
      characters: "陌生女人出现在门口",
      action: "她没有进门，只抬手指向海岸方向",
      setting: "信号室门口",
      lines: [{ speaker: "陌生女人", text: "天亮前，我们只剩一个小时。", interruptAfter: true }],
      sfx: { sound: "wind", label: "门缝灌入的风" },
    },
    {
      characters: "陈屿抓起外套",
      action: "吹熄蜡烛，推门冲入雨里",
      setting: "信号室门口",
      lines: [{ speaker: "陈屿", text: "走。" }],
      sfx: { sound: "rain", label: "暴雨砸在伞面上" },
    },
  ],
  [
    {
      characters: "两人沿海岸奔跑",
      action: "手电光在礁石间跳跃",
      setting: "凌晨的海岸",
      lines: [{ speaker: "旁白", text: "城市的边缘，海和雨混成同一种声音。" }],
      sfx: { sound: "wind", label: "海浪与风声" },
    },
    {
      characters: "灯塔下的铁门",
      action: "陈屿用钥匙打开灯塔底座的门",
      setting: "废弃灯塔",
      lines: [{ speaker: "陈屿", text: "门没生锈——有人一直在维护它。" }],
      sfx: { sound: "pulse", label: "灯塔电机的低鸣" },
    },
    {
      characters: "灯塔内的旧发射机",
      action: "女人按下发射键，把录音接上天线",
      setting: "灯塔机房",
      lines: [{ speaker: "陌生女人", text: "让整座城市，都听到这段频率。" }],
      sfx: { sound: "pulse", label: "发射机上电的轰鸣" },
    },
    {
      characters: "两人望向窗外海面",
      action: "雨幕里，远处楼群的灯一盏接一盏亮起",
      setting: "灯塔瞭望台",
      lines: [{ speaker: "陈屿", text: "他们听见了。" }],
      sfx: { sound: "wind", label: "风声里混入千家万户的广播声" },
    },
  ],
];

const CHAPTER_3: PanelSpec[][] = [
  [
    {
      characters: "海岸线全景",
      action: "东方天色由墨蓝转为灰白",
      setting: "破晓前的海岸",
      lines: [{ speaker: "旁白", text: "城市的边缘，终于亮起一线微光。" }],
      sfx: { sound: "wind", label: "潮水退去的声音" },
    },
    {
      characters: "陈屿与陌生女人并肩",
      action: "女人摘下兜帽，露出和陈屿旧照片里相同的项链",
      setting: "灯塔脚下",
      lines: [{ speaker: "陈屿", text: "原来你一直都在。" }],
      sfx: { sound: "rain", label: "雨声变得稀疏" },
    },
    {
      characters: "女人把那封信折好放回他口袋",
      action: "她微笑，没有回答他的问题",
      setting: "灯塔脚下",
      lines: [{ speaker: "陌生女人", text: "那封信，是写给昨天的自己。" }],
      sfx: { sound: "wind", label: "清晨的海风" },
    },
    {
      characters: "两人的背影走向灯塔下的小路",
      action: "第一缕阳光落在积水的路面上",
      setting: "海岸小路",
      lines: [{ speaker: "旁白", text: "天亮了。我们出发吧。" }],
      sfx: { sound: "wind", label: "鸟鸣与风声" },
    },
  ],
  [
    {
      characters: "回城的早班列车",
      action: "陈屿靠窗坐下，把收音机抱在膝上",
      setting: "列车车厢",
      lines: [{ speaker: "陈屿", text: "雨停以后，频率还会在吗？" }],
      sfx: { sound: "pulse", label: "列车行进的节奏声" },
    },
    {
      characters: "陌生女人坐在对面",
      action: "她把耳机分给他一只",
      setting: "车厢座位",
      lines: [{ speaker: "陌生女人", text: "只要还有人记得，它就不会消失。" }],
      sfx: { sound: "wind", label: "耳机里的音乐" },
    },
    {
      characters: "车窗外掠过的城市",
      action: "湿漉漉的街道重新有人撑开伞",
      setting: "行进的车窗",
      lines: [{ speaker: "旁白", text: "城市醒来，并不知道夜里发生过什么。" }],
      sfx: { sound: "rain", label: "残余的雨滴声" },
    },
    {
      characters: "陈屿望向窗外微笑",
      action: "他按下收音机的录音键，留下新的一段话",
      setting: "车厢",
      lines: [{ speaker: "陈屿", text: "给下一个在雨里等待的人：沿着光走。" }],
      sfx: { sound: "pulse", label: "录音键咔哒声" },
    },
  ],
  [
    {
      characters: "唱片店重新拉起卷帘门",
      action: "陈屿把新的频率表贴在店内墙上",
      setting: "重生的唱片店",
      lines: [{ speaker: "旁白", text: "那间唱片店，在雨停后的第一个清晨重新开门。" }],
      sfx: { sound: "wind", label: "门铃轻响" },
    },
    {
      characters: "熟客们陆续进店",
      action: "人们戴上耳机，听到那段夜里的录音",
      setting: "唱片店内",
      lines: [{ speaker: "陌生女人", text: "故事不会结束，它只是换了个人继续讲。" }],
      sfx: { sound: "pulse", label: "店内广播的温暖底噪" },
    },
    {
      characters: "陈屿站在柜台后",
      action: "把那封没有署名的信装进相框，挂上墙",
      setting: "柜台",
      lines: [{ speaker: "陈屿", text: "而我，终于学会了在雨里向前走。" }],
      sfx: { sound: "rain", label: "屋檐最后几滴雨" },
    },
    {
      characters: "整条街的晨光",
      action: "镜头拉远，唱片店的灯牌重新亮起",
      setting: "商业街全景",
      lines: [{ speaker: "旁白", text: "所有故事，都有回声。" }],
      sfx: { sound: "wind", label: "城市晨间的环境音" },
    },
  ],
];

const CHAPTER_META = [
  {
    title: "第一章 · 夜的来信",
    subtitle: "凌晨 02:17 / 城市边缘",
    specs: CHAPTER_1,
    transition: "镜头从站台拉远，切进旧城商业街的雨巷。",
  },
  {
    title: "第二章 · 失落的频率",
    subtitle: "凌晨 03:42 / 旧车站",
    specs: CHAPTER_2,
    transition: "雨声被电流噪音取代，画面转入信号室。",
  },
  {
    title: "第三章 · 天光将至",
    subtitle: "清晨 05:06 / 海岸",
    specs: CHAPTER_3,
    transition: "灯塔的光暗下去，天色转亮，场景来到海岸。",
  },
];

export function demoDocument(): ComicDocument {
  return {
    version: 1,
    audioVersion: 2,
    id: "before-rain",
    title: "雨停之前",
    author: "林间工作室",
    chapters: CHAPTER_META.map((meta, c) => {
      const pages: ComicPage[] = meta.specs.map((specs, p) => {
        const page = buildPage(
          c,
          p,
          `第 ${p + 1} 页`,
          artwork(c + p),
          specs,
          meta.title,
          meta.transition,
        );
        // 第一章第一页第三格：演示作者指定的非几何听读顺序与打断点
        // 顺序：格1-2 → 格3描述 → 女人插话（打断点）→ 脉冲音效 → 陈屿回应 → 格4
        if (c === 0 && p === 0) {
          page.cueOrder = [
            "cue-0-0-0-desc",
            "cue-0-0-0-line-0",
            "cue-0-0-0-sfx",
            "cue-0-0-1-desc",
            "cue-0-0-1-line-0",
            "cue-0-0-1-sfx",
            "cue-0-0-2-desc",
            "cue-0-0-2-line-1", // 陌生女人先插话
            "cue-0-0-2-sfx", // 打断点后先听到电波
            "cue-0-0-2-line-0", // 再回到陈屿的台词
            "cue-0-0-3-desc",
            "cue-0-0-3-line-0",
            "cue-0-0-3-sfx",
          ];
        }
        return page;
      });
      return {
        id: `chapter-${c}`,
        title: meta.title,
        subtitle: meta.subtitle,
        pages,
      } satisfies Chapter;
    }),
  };
}
