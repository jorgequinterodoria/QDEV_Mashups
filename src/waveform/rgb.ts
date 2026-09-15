export interface RgbWaveformPoint {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly amplitude: number;
}

export interface RgbWaveformData {
  readonly durationSeconds: number;
  readonly points: readonly RgbWaveformPoint[];
}

export interface RgbWaveformOptions {
  readonly bars?: number;
  readonly lowHz?: number;
  readonly highHz?: number;
}

const DEFAULT_BARS = 320;
const DEFAULT_LOW_HZ = 180;
const DEFAULT_HIGH_HZ = 4200;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function rms(samples: Float32Array, start: number, end: number): number {
  let sum = 0;
  let count = 0;

  for (let index = start; index < end; index += 1) {
    const sample = samples[index] ?? 0;
    sum += sample * sample;
    count += 1;
  }

  return count > 0 ? Math.sqrt(sum / count) : 0;
}

function normalized(value: number, reference: number): number {
  if (reference <= 0) {
    return 0;
  }
  return clamp01(value / reference);
}

function mixChannels(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const mixed = new Float32Array(length);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      mixed[index] += data[index] ?? 0;
    }
  }

  const divisor = Math.max(1, buffer.numberOfChannels);
  for (let index = 0; index < length; index += 1) {
    mixed[index] /= divisor;
  }

  return mixed;
}

/**
 * Construye una representación RGB útil para DJ a partir del audio real.
 * Rojo = contenido grave, verde = contenido medio, azul = contenido agudo.
 * El análisis usa dos diferencias temporales de energía como aproximación
 * espectral estable y de bajo coste para el renderer.
 */
export function buildRgbWaveform(
  buffer: AudioBuffer,
  options: RgbWaveformOptions = {}
): RgbWaveformData {
  const bars = Math.max(32, Math.min(2000, Math.floor(options.bars ?? DEFAULT_BARS)));
  const samples = mixChannels(buffer);
  const samplesPerBar = Math.max(1, Math.floor(samples.length / bars));

  const lowReference = options.lowHz ?? DEFAULT_LOW_HZ;
  const highReference = options.highHz ?? DEFAULT_HIGH_HZ;
  const sampleRate = buffer.sampleRate;
  const alphaLow = Math.exp(-2 * Math.PI * lowReference / sampleRate);
  const alphaHigh = Math.exp(-2 * Math.PI * highReference / sampleRate);

  const lowPass = new Float32Array(samples.length);
  const highPass = new Float32Array(samples.length);
  let lowState = 0;
  let highState = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0;
    lowState = alphaLow * lowState + (1 - alphaLow) * sample;
    highState = alphaHigh * highState + (1 - alphaHigh) * sample;
    lowPass[index] = lowState;
    highPass[index] = sample - highState;
  }

  const raw: RgbWaveformPoint[] = [];
  let maxEnergy = 0;

  for (let bar = 0; bar < bars; bar += 1) {
    const start = Math.min(samples.length, bar * samplesPerBar);
    const end = Math.min(samples.length, start + samplesPerBar);
    const overall = rms(samples, start, end);
    const low = rms(lowPass, start, end);
    const high = rms(highPass, start, end);
    const mid = Math.max(0, overall - low * 0.72 - high * 0.72);
    const amplitude = Math.max(overall, low, mid, high);

    maxEnergy = Math.max(maxEnergy, amplitude);
    raw.push({
      red: low,
      green: mid,
      blue: high,
      amplitude
    });
  }

  return {
    durationSeconds: buffer.duration,
    points: raw.map((point) => ({
      red: normalized(point.red, maxEnergy),
      green: normalized(point.green, maxEnergy),
      blue: normalized(point.blue, maxEnergy),
      amplitude: normalized(point.amplitude, maxEnergy)
    }))
  };
}

export function rgbCss(point: RgbWaveformPoint, alpha = 1): string {
  const scale = 255;
  return `rgba(${Math.round(point.red * scale)}, ${Math.round(point.green * scale)}, ${Math.round(point.blue * scale)}, ${clamp01(alpha)})`;
}
