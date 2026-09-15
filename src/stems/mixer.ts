import type { StemChannel } from "./types.js";
import { STEM_CHANNELS } from "./types.js";

export const STEM_MIXER_MIN_GAIN_DB = -60;
export const STEM_MIXER_MAX_GAIN_DB = 12;
export const STEM_MIXER_MIN_PAN = -1;
export const STEM_MIXER_MAX_PAN = 1;
export const STEM_MIXER_DEFAULT_GAIN_DB = 0;
export const STEM_MIXER_DEFAULT_PAN = 0;
export const STEM_MIXER_DEFAULT_MASTER_GAIN_DB = 0;

export interface StemMixerChannelState {
  readonly channel: StemChannel;
  readonly gainDb: number;
  readonly pan: number;
  readonly muted: boolean;
}

export interface StemMixerState {
  readonly schemaVersion: 1;
  readonly channels: Readonly<Record<StemChannel, StemMixerChannelState>>;
  readonly masterGainDb: number;
}

export interface StemMixerChannelPatch {
  readonly gainDb?: number;
  readonly pan?: number;
  readonly muted?: boolean;
}

export interface StemMixerSnapshot {
  readonly name: string;
  readonly state: StemMixerState;
}

export interface StemMixerEffectiveChannel {
  readonly channel: StemChannel;
  readonly audible: boolean;
  readonly gainDb: number;
  readonly pan: number;
}

export class StemMixerError extends Error {
  readonly code:
    | "INVALID_CHANNEL"
    | "INVALID_GAIN"
    | "INVALID_PAN"
    | "INVALID_STATE"
    | "INVALID_SNAPSHOT";

  constructor(
    code: StemMixerError["code"],
    message: string
  ) {
    super(message);
    this.name = "StemMixerError";
    this.code = code;
  }
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new StemMixerError(
      "INVALID_STATE",
      `${label} debe ser un número finito.`
    );
  }
}

function assertGainDb(value: number): void {
  assertFinite(value, "La ganancia");
  if (
    value < STEM_MIXER_MIN_GAIN_DB ||
    value > STEM_MIXER_MAX_GAIN_DB
  ) {
    throw new StemMixerError(
      "INVALID_GAIN",
      `La ganancia debe estar entre ${STEM_MIXER_MIN_GAIN_DB} dB y ${STEM_MIXER_MAX_GAIN_DB} dB.`
    );
  }
}

function assertPan(value: number): void {
  assertFinite(value, "El panorama");
  if (value < STEM_MIXER_MIN_PAN || value > STEM_MIXER_MAX_PAN) {
    throw new StemMixerError(
      "INVALID_PAN",
      `El panorama debe estar entre ${STEM_MIXER_MIN_PAN} y ${STEM_MIXER_MAX_PAN}.`
    );
  }
}

function cloneState(state: StemMixerState): StemMixerState {
  return {
    schemaVersion: 1,
    masterGainDb: state.masterGainDb,
    channels: Object.fromEntries(
      STEM_CHANNELS.map((channel) => {
        const current = state.channels[channel];
        return [
          channel,
          {
            channel,
            gainDb: current.gainDb,
            pan: current.pan,
            muted: current.muted
          }
        ];
      })
    ) as Record<StemChannel, StemMixerChannelState>
  };
}

function createDefaultState(): StemMixerState {
  return {
    schemaVersion: 1,
    masterGainDb: STEM_MIXER_DEFAULT_MASTER_GAIN_DB,
    channels: Object.fromEntries(
      STEM_CHANNELS.map((channel) => [
        channel,
        {
          channel,
          gainDb: STEM_MIXER_DEFAULT_GAIN_DB,
          pan: STEM_MIXER_DEFAULT_PAN,
          muted: false
        }
      ])
    ) as Record<StemChannel, StemMixerChannelState>
  };
}

export class StemMixer {
  private state: StemMixerState;
  private readonly snapshots = new Map<string, StemMixerSnapshot>();

  constructor(initialState?: StemMixerState) {
    this.state = initialState
      ? StemMixer.validateState(initialState)
      : createDefaultState();
  }

  static validateState(input: StemMixerState): StemMixerState {
    if (!input || input.schemaVersion !== 1) {
      throw new StemMixerError(
        "INVALID_STATE",
        "El estado del mezclador no tiene una versión compatible."
      );
    }

    assertGainDb(input.masterGainDb);

    const keys = Object.keys(input.channels).sort();
    const expected = [...STEM_CHANNELS].sort();

    if (
      keys.length !== expected.length ||
      keys.some((key, index) => key !== expected[index])
    ) {
      throw new StemMixerError(
        "INVALID_STATE",
        `El mezclador debe contener exactamente los 4 canales: ${STEM_CHANNELS.join(", ")}.`
      );
    }

    for (const channel of STEM_CHANNELS) {
      const state = input.channels[channel];
      if (!state || state.channel !== channel) {
        throw new StemMixerError(
          "INVALID_CHANNEL",
          `El estado del canal ${channel} no es válido.`
        );
      }
      assertGainDb(state.gainDb);
      assertPan(state.pan);
      if (typeof state.muted !== "boolean") {
        throw new StemMixerError(
          "INVALID_STATE",
          `El estado mute del canal ${channel} no es válido.`
        );
      }
    }

    return cloneState(input);
  }

  getState(): StemMixerState {
    return cloneState(this.state);
  }

  getChannel(channel: StemChannel): StemMixerChannelState {
    this.assertChannel(channel);
    const state = this.state.channels[channel];
    return { ...state };
  }

  setChannel(channel: StemChannel, patch: StemMixerChannelPatch): void {
    this.assertChannel(channel);

    const current = this.state.channels[channel];
    const nextGain = patch.gainDb ?? current.gainDb;
    const nextPan = patch.pan ?? current.pan;
    const nextMuted = patch.muted ?? current.muted;

    assertGainDb(nextGain);
    assertPan(nextPan);

    if (typeof nextMuted !== "boolean") {
      throw new StemMixerError(
        "INVALID_STATE",
        `El estado mute del canal ${channel} no es válido.`
      );
    }

    this.state = {
      ...this.state,
      channels: {
        ...this.state.channels,
        [channel]: {
          channel,
          gainDb: nextGain,
          pan: nextPan,
          muted: nextMuted
        }
      }
    };
  }

  setGain(channel: StemChannel, gainDb: number): void {
    this.setChannel(channel, { gainDb });
  }

  setPan(channel: StemChannel, pan: number): void {
    this.setChannel(channel, { pan });
  }

  setMuted(channel: StemChannel, muted: boolean): void {
    this.setChannel(channel, { muted });
  }

  toggleMute(channel: StemChannel): boolean {
    this.assertChannel(channel);
    const muted = !this.state.channels[channel].muted;
    this.setMuted(channel, muted);
    return muted;
  }

  setMasterGain(gainDb: number): void {
    assertGainDb(gainDb);
    this.state = {
      ...this.state,
      masterGainDb: gainDb
    };
  }

  resetChannel(channel: StemChannel): void {
    this.setChannel(channel, {
      gainDb: STEM_MIXER_DEFAULT_GAIN_DB,
      pan: STEM_MIXER_DEFAULT_PAN,
      muted: false
    });
  }

  reset(): void {
    this.state = createDefaultState();
  }

  getSoloChannels(): StemChannel[] {
    return STEM_CHANNELS.filter(
      (channel) => this.state.channels[channel].muted === false
    ).filter(() => false);
  }

  getEffectiveChannels(
    soloChannels: readonly StemChannel[] = []
  ): readonly StemMixerEffectiveChannel[] {
    const soloSet = new Set<StemChannel>(soloChannels);

    for (const channel of soloChannels) {
      this.assertChannel(channel);
    }

    const hasSolo = soloSet.size > 0;

    return STEM_CHANNELS.map((channel) => {
      const current = this.state.channels[channel];
      const audible = !current.muted && (!hasSolo || soloSet.has(channel));

      return {
        channel,
        audible,
        gainDb: audible
          ? current.gainDb + this.state.masterGainDb
          : STEM_MIXER_MIN_GAIN_DB,
        pan: current.pan
      };
    });
  }

  saveSnapshot(name: string): void {
    const normalized = name.trim();
    if (!normalized) {
      throw new StemMixerError(
        "INVALID_SNAPSHOT",
        "El nombre del snapshot no puede estar vacío."
      );
    }

    this.snapshots.set(normalized, {
      name: normalized,
      state: this.getState()
    });
  }

  loadSnapshot(name: string): void {
    const normalized = name.trim();
    const snapshot = this.snapshots.get(normalized);

    if (!snapshot) {
      throw new StemMixerError(
        "INVALID_SNAPSHOT",
        `No existe el snapshot: ${normalized}.`
      );
    }

    this.state = cloneState(snapshot.state);
  }

  deleteSnapshot(name: string): boolean {
    return this.snapshots.delete(name.trim());
  }

  listSnapshots(): readonly string[] {
    return [...this.snapshots.keys()].sort();
  }

  private assertChannel(channel: StemChannel): void {
    if (!(STEM_CHANNELS as readonly string[]).includes(channel)) {
      throw new StemMixerError(
        "INVALID_CHANNEL",
        `Canal de stem no válido: ${String(channel)}.`
      );
    }
  }
}
