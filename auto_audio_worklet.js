class AutoAudioFeatures extends AudioWorkletProcessor {
  constructor() {
    super();
    this.low = 0;
    this.midLow = 0;
    this.sum = [0, 0, 0, 0];
    this.count = 0;
    this.lowRate = 1 - Math.exp(-2 * Math.PI * 180 / sampleRate);
    this.midRate = 1 - Math.exp(-2 * Math.PI * 2200 / sampleRate);
  }
  process(inputs, outputs) {
    const input = inputs[0];
    const channel = input && input[0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        const value = channel[i];
        this.low += (value - this.low) * this.lowRate;
        this.midLow += (value - this.midLow) * this.midRate;
        const mid = this.midLow - this.low;
        const high = value - this.midLow;
        this.sum[0] += value * value;
        this.sum[1] += this.low * this.low;
        this.sum[2] += mid * mid;
        this.sum[3] += high * high;
        this.count++;
      }
      if (this.count >= 1024) {
        const feature = this.sum.map(value => Math.min(1.5, Math.sqrt(value / this.count) * 4));
        this.port.postMessage({ rms: feature[0], bass: feature[1], mid: feature[2], high: feature[3] });
        this.sum.fill(0);
        this.count = 0;
      }
    }
    for (const output of outputs) for (const channel of output) channel.fill(0);
    return true;
  }
}
registerProcessor('auto-audio-features', AutoAudioFeatures);
