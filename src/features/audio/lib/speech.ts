/**
 * 语音合成封装。所有朗读都带上 token 回调，
 * 队列代际过期时由调用方决定是否忽略本次播报结果。
 */
export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  voiceURI?: string;
  onEnd?: () => void;
  onBoundary?: (charIndex: number) => void;
}

export class SpeechEngine {
  private supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  private current: SpeechSynthesisUtterance | null = null;

  get available(): boolean {
    return this.supported;
  }

  voices(): SpeechSynthesisVoice[] {
    if (!this.supported) return [];
    return window.speechSynthesis.getVoices();
  }

  /** 优先挑选中文语音，保证中文内容可读 */
  pickChineseVoice(): SpeechSynthesisVoice | undefined {
    const voices = this.voices();
    return (
      voices.find((v) => /zh(-|_)?(CN|Hans)/i.test(v.lang)) ??
      voices.find((v) => v.lang.toLowerCase().startsWith("zh")) ??
      voices[0]
    );
  }

  speak(text: string, options: SpeakOptions = {}): void {
    if (!this.supported || !text.trim()) {
      options.onEnd?.();
      return;
    }
    this.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = options.rate ?? 1;
    utter.pitch = options.pitch ?? 1;
    const voice =
      this.voices().find((v) => v.voiceURI === options.voiceURI) ??
      this.pickChineseVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = "zh-CN";
    }
    utter.onend = () => options.onEnd?.();
    utter.onerror = () => options.onEnd?.();
    if (options.onBoundary)
      utter.onboundary = (e) => options.onBoundary?.(e.charIndex);
    this.current = utter;
    window.speechSynthesis.speak(utter);
  }

  cancel(): void {
    if (!this.supported) return;
    this.current = null;
    window.speechSynthesis.cancel();
  }
}
