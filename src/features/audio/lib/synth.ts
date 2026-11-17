export class AmbientSynth {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  async start(sound: string, volume: number) {
    this.stop();
    const ctx = this.context ?? new AudioContext();
    this.context = ctx;
    await ctx.resume();
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
    const source = ctx.createBufferSource();
    source.buffer = buffer;
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
  volume(value: number) {
    if (this.gain && this.context)
      this.gain.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
  }
  stop() {
    this.source?.stop();
    this.source?.disconnect();
    this.source = null;
    this.gain?.disconnect();
    this.gain = null;
  }
  dispose() {
    this.stop();
    void this.context?.close();
    this.context = null;
  }
}
