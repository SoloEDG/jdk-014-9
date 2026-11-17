import type { AmbientSound } from "../../../shared/document";

export class AmbientSynth {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private oneShotTimer: ReturnType<typeof setTimeout> | null = null;

  private ensureContext(): AudioContext {
    this.context ??= new AudioContext();
    return this.context;
  }

  private audioAvailable(): boolean {
    return typeof AudioContext !== "undefined";
  }

  private buildBuffer(ctx: AudioContext, sound: string): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate),
      data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] =
        sound === "pulse"
          ? Math.sin((i / ctx.sampleRate) * 110 * Math.PI * 2) *
            0.15 *
            (0.5 + 0.5 * Math.sin((i / ctx.sampleRate) * Math.PI))
          : sound === "wind"
            ? last * 4
            : white * 0.35;
    }
    return buffer;
  }

  async start(sound: string, volume: number) {
    this.stop();
    if (!this.audioAvailable()) return;
    const ctx = this.ensureContext();
    await ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = this.buildBuffer(ctx, sound);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = sound === "rain" ? 1600 : 500;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    this.source = source;
    this.gain = gain;
  }

  /**
   * 播放一次限时音效，返回控制器。
   * 队列代际过期或手动跳过的时候调用 cancel()，保证旧队列不再发声。
   */
  playOnce(
    sound: AmbientSound,
    durationMs: number,
    volume: number,
  ): { done: Promise<void>; cancel: () => void } {
    // 无 Web Audio 环境（如无头测试）：用定时器模拟一次音效的生命周期
    if (!this.audioAvailable()) {
      let finished = false;
      let resolve: () => void = () => {};
      const done = new Promise<void>((r) => {
        resolve = r;
      });
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          resolve();
        }
      }, Math.max(80, Math.min(400, durationMs)));
      return {
        done,
        cancel: () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          resolve();
        },
      };
    }
    const ctx = this.ensureContext();
    void ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = this.buildBuffer(ctx, sound);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = sound === "rain" ? 1600 : 500;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, volume),
      ctx.currentTime + 0.08,
    );
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    let finished = false;
    let resolveDone: () => void = () => {};
    return {
      done: new Promise<void>((resolve) => {
        resolveDone = resolve;
        this.oneShotTimer = setTimeout(() => {
          if (finished) return;
          finished = true;
          try {
            gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
            source.stop(ctx.currentTime + 0.2);
          } catch {
            /* 已停止 */
          }
          resolveDone();
        }, Math.max(300, durationMs));
      }),
      cancel: () => {
        if (finished) return;
        finished = true;
        if (this.oneShotTimer) clearTimeout(this.oneShotTimer);
        try {
          source.stop();
        } catch {
          /* 已停止 */
        }
        source.disconnect();
        gain.disconnect();
        resolveDone();
      },
    };
  }

  volume(value: number) {
    if (this.gain && this.context)
      this.gain.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
  }

  stop() {
    if (this.oneShotTimer) clearTimeout(this.oneShotTimer);
    this.oneShotTimer = null;
    try {
      this.source?.stop();
    } catch {
      /* 已停止 */
    }
    this.source?.disconnect();
    this.source = null;
    this.gain?.disconnect();
    this.gain = null;
  }

  dispose() {
    this.stop();
    if (this.audioAvailable()) void this.context?.close();
    this.context = null;
  }
}
