import {
  STEM_MIXER_MAX_GAIN_DB,
  STEM_MIXER_MIN_GAIN_DB,
  StemMixer,
  type StemMixerChannelState,
  type StemMixerEffectiveChannel,
  type StemMixerState
} from "../stems/mixer.js";
import { STEM_CHANNELS, type StemChannel } from "../stems/types.js";

export interface StemMixerUiLabels {
  readonly title: string;
  readonly master: string;
  readonly channels: Record<StemChannel, string>;
  readonly volume: string;
  readonly panorama: string;
  readonly mute: string;
  readonly solo: string;
  readonly reset: string;
  readonly snapshotName: string;
  readonly saveSnapshot: string;
  readonly loadSnapshot: string;
  readonly noSnapshot: string;
}

export const STEM_MIXER_UI_LABELS: StemMixerUiLabels = {
  title: "Mezclador de stems",
  master: "Master",
  channels: {
    vocals: "Voces",
    drums: "Batería",
    bass: "Bajo",
    other: "Otros"
  },
  volume: "Volumen",
  panorama: "Panorama",
  mute: "Silenciar",
  solo: "Solo",
  reset: "Restablecer",
  snapshotName: "Nombre del snapshot",
  saveSnapshot: "Guardar snapshot",
  loadSnapshot: "Cargar snapshot",
  noSnapshot: "Selecciona un snapshot"
};

export interface StemMixerPanelOptions {
  readonly labels?: Partial<StemMixerUiLabels>;
  readonly className?: string;
}

export interface StemMixerPanelState {
  readonly mixer: StemMixerState;
  readonly soloChannels: readonly StemChannel[];
  readonly selectedSnapshot: string | null;
}

function mergeLabels(
  labels: Partial<StemMixerUiLabels> | undefined
): StemMixerUiLabels {
  return {
    ...STEM_MIXER_UI_LABELS,
    ...labels,
    channels: {
      ...STEM_MIXER_UI_LABELS.channels,
      ...(labels?.channels ?? {})
    }
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDb(value: number): string {
  if (Object.is(value, -0)) {
    return "0.0 dB";
  }

  return `${value.toFixed(1)} dB`;
}

function formatPan(value: number): string {
  if (Math.abs(value) < 0.001) {
    return "Centro";
  }

  return value < 0
    ? `L${Math.round(Math.abs(value) * 100)}`
    : `R${Math.round(value * 100)}`;
}

function channelCard(
  state: StemMixerChannelState,
  labels: StemMixerUiLabels,
  effective: StemMixerEffectiveChannel,
  solo: boolean
): string {
  const label = labels.channels[state.channel];

  return `
    <article class="qdev-stem-channel" data-stem-channel="${state.channel}">
      <header class="qdev-stem-channel__header">
        <div>
          <h3>${escapeHtml(label)}</h3>
          <p data-role="stem-status">${effective.audible ? "Activo" : "Silenciado"}</p>
        </div>
        <div class="qdev-stem-channel__actions">
          <button
            type="button"
            class="qdev-stem-button"
            data-action="mute"
            data-stem-channel="${state.channel}"
            aria-pressed="${state.muted ? "true" : "false"}"
          >${escapeHtml(labels.mute)}</button>
          <button
            type="button"
            class="qdev-stem-button"
            data-action="solo"
            data-stem-channel="${state.channel}"
            aria-pressed="${solo ? "true" : "false"}"
          >${escapeHtml(labels.solo)}</button>
          <button
            type="button"
            class="qdev-stem-button"
            data-action="reset-channel"
            data-stem-channel="${state.channel}"
          >${escapeHtml(labels.reset)}</button>
        </div>
      </header>

      <div class="qdev-stem-meter" aria-hidden="true">
        <span
          class="qdev-stem-meter__fill"
          data-role="stem-meter"
          style="width: ${effective.audible ? "72%" : "0%"}"
        ></span>
      </div>

      <label class="qdev-stem-control">
        <span>${escapeHtml(labels.volume)}</span>
        <output data-role="gain-output">${escapeHtml(formatDb(state.gainDb))}</output>
        <input
          type="range"
          min="${STEM_MIXER_MIN_GAIN_DB}"
          max="${STEM_MIXER_MAX_GAIN_DB}"
          step="0.1"
          value="${state.gainDb}"
          data-action="gain"
          data-stem-channel="${state.channel}"
          aria-label="${escapeHtml(`${labels.volume}: ${label}`)}"
        />
      </label>

      <label class="qdev-stem-control">
        <span>${escapeHtml(labels.panorama)}</span>
        <output data-role="pan-output">${escapeHtml(formatPan(state.pan))}</output>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value="${state.pan}"
          data-action="pan"
          data-stem-channel="${state.channel}"
          aria-label="${escapeHtml(`${labels.panorama}: ${label}`)}"
        />
      </label>
    </article>
  `;
}

export function renderStemMixerPanel(
  state: StemMixerPanelState,
  options: StemMixerPanelOptions = {}
): string {
  const labels = mergeLabels(options.labels);
  const className = options.className ?? "qdev-stem-mixer-panel";
  const effective = state.mixer
    ? new StemMixer(state.mixer).getEffectiveChannels(state.soloChannels)
    : [];

  const effectiveByChannel = new Map(
    effective.map((item) => [item.channel, item])
  );

  const channels = STEM_CHANNELS.map((channel) => {
    const channelState = state.mixer.channels[channel];
    const channelEffective = effectiveByChannel.get(channel);

    if (!channelEffective) {
      throw new Error(`No existe estado efectivo para ${channel}.`);
    }

    return channelCard(
      channelState,
      labels,
      channelEffective,
      state.soloChannels.includes(channel)
    );
  }).join("");

  const snapshots =
    state.selectedSnapshot === null
      ? `<option value="" selected>${escapeHtml(labels.noSnapshot)}</option>`
      : `<option value="">${escapeHtml(labels.noSnapshot)}</option>`;

  return `
    <section class="${escapeHtml(className)}" data-component="stem-mixer-panel">
      <header class="qdev-stem-mixer-panel__header">
        <div>
          <p class="qdev-stem-kicker">QDEV MASHUPS</p>
          <h2>${escapeHtml(labels.title)}</h2>
          <p class="qdev-stem-subtitle">Voces · Batería · Bajo · Otros</p>
        </div>

        <label class="qdev-stem-master">
          <span>${escapeHtml(labels.master)}</span>
          <output data-role="master-output">${escapeHtml(formatDb(state.mixer.masterGainDb))}</output>
          <input
            type="range"
            min="${STEM_MIXER_MIN_GAIN_DB}"
            max="${STEM_MIXER_MAX_GAIN_DB}"
            step="0.1"
            value="${state.mixer.masterGainDb}"
            data-action="master"
            aria-label="${escapeHtml(labels.master)}"
          />
        </label>
      </header>

      <div class="qdev-stem-channel-grid">
        ${channels}
      </div>

      <footer class="qdev-stem-mixer-panel__footer">
        <label class="qdev-stem-snapshot">
          <span>${escapeHtml(labels.snapshotName)}</span>
          <input
            type="text"
            data-role="snapshot-name"
            autocomplete="off"
            placeholder="Ej. Estribillo limpio"
          />
        </label>
        <button type="button" class="qdev-stem-button" data-action="save-snapshot">
          ${escapeHtml(labels.saveSnapshot)}
        </button>
        <select data-role="snapshot-select" aria-label="${escapeHtml(labels.loadSnapshot)}">
          ${snapshots}
        </select>
        <button type="button" class="qdev-stem-button" data-action="load-snapshot">
          ${escapeHtml(labels.loadSnapshot)}
        </button>
        <button type="button" class="qdev-stem-button qdev-stem-button--danger" data-action="reset-all">
          ${escapeHtml(labels.reset)}
        </button>
      </footer>
    </section>
  `;
}

export class StemMixerPanelController {
  private readonly mixer: StemMixer;
  private readonly labels: StemMixerUiLabels;
  private readonly className: string;
  private soloChannels: StemChannel[] = [];
  private selectedSnapshot: string | null = null;
  private element: HTMLElement | null = null;

  constructor(
    mixer = new StemMixer(),
    options: StemMixerPanelOptions = {}
  ) {
    this.mixer = mixer;
    this.labels = mergeLabels(options.labels);
    this.className = options.className ?? "qdev-stem-mixer-panel";
  }

  getState(): StemMixerPanelState {
    return {
      mixer: this.mixer.getState(),
      soloChannels: [...this.soloChannels],
      selectedSnapshot: this.selectedSnapshot
    };
  }

  mount(element: HTMLElement): void {
    this.element = element;
    this.render();
    this.bind();
  }

  setSolo(channel: StemChannel, enabled: boolean): void {
    const next = new Set(this.soloChannels);

    if (enabled) {
      next.add(channel);
    } else {
      next.delete(channel);
    }

    this.soloChannels = STEM_CHANNELS.filter((item) => next.has(item));
    this.renderAndRebind();
  }

  toggleSolo(channel: StemChannel): void {
    this.setSolo(channel, !this.soloChannels.includes(channel));
  }

  setGain(channel: StemChannel, gainDb: number): void {
    this.mixer.setGain(channel, gainDb);
    this.renderAndRebind();
  }

  setPan(channel: StemChannel, pan: number): void {
    this.mixer.setPan(channel, pan);
    this.renderAndRebind();
  }

  setMuted(channel: StemChannel, muted: boolean): void {
    this.mixer.setMuted(channel, muted);
    this.renderAndRebind();
  }

  setMasterGain(gainDb: number): void {
    this.mixer.setMasterGain(gainDb);
    this.renderAndRebind();
  }

  saveSnapshot(name: string): void {
    this.mixer.saveSnapshot(name);
    this.selectedSnapshot = name.trim();
    this.renderAndRebind();
  }

  loadSnapshot(name: string): void {
    this.mixer.loadSnapshot(name);
    this.selectedSnapshot = name.trim();
    this.renderAndRebind();
  }

  reset(): void {
    this.mixer.reset();
    this.soloChannels = [];
    this.selectedSnapshot = null;
    this.renderAndRebind();
  }

  private render(): void {
    if (!this.element) {
      return;
    }

    this.element.innerHTML = renderStemMixerPanel(
      {
        mixer: this.mixer.getState(),
        soloChannels: this.soloChannels,
        selectedSnapshot: this.selectedSnapshot
      },
      {
        labels: this.labels,
        className: this.className
      }
    );
  }

  private renderAndRebind(): void {
    this.render();
    this.bind();
  }

  private bind(): void {
    if (!this.element) {
      return;
    }

    const actionElements =
      this.element.querySelectorAll<HTMLElement>("[data-action]");

    for (const element of actionElements) {
      if (element.dataset.bound === "true") {
        continue;
      }

      element.dataset.bound = "true";

      element.addEventListener("click", () => {
        const action = element.dataset.action;
        const channel = element.dataset.stemChannel as StemChannel | undefined;

        if (action === "mute" && channel) {
          this.setMuted(channel, !this.mixer.getChannel(channel).muted);
          return;
        }

        if (action === "solo" && channel) {
          this.toggleSolo(channel);
          return;
        }

        if (action === "reset-channel" && channel) {
          this.mixer.resetChannel(channel);
          this.renderAndRebind();
          return;
        }

        if (action === "save-snapshot") {
          const input =
            this.element?.querySelector<HTMLInputElement>(
              '[data-role="snapshot-name"]'
            );
          const name = input?.value.trim() ?? "";
          if (name) {
            this.saveSnapshot(name);
          }
          return;
        }

        if (action === "load-snapshot") {
          const select =
            this.element?.querySelector<HTMLSelectElement>(
              '[data-role="snapshot-select"]'
            );
          const name = select?.value ?? "";
          if (name) {
            this.loadSnapshot(name);
          }
          return;
        }

        if (action === "reset-all") {
          this.reset();
        }
      });

      element.addEventListener("input", () => {
        const action = element.dataset.action;
        const channel = element.dataset.stemChannel as StemChannel | undefined;
        const input = element as HTMLInputElement;
        const value = Number(input.value);

        if (action === "gain" && channel) {
          this.mixer.setGain(channel, value);
          this.renderAndRebind();
          return;
        }

        if (action === "pan" && channel) {
          this.mixer.setPan(channel, value);
          this.renderAndRebind();
          return;
        }

        if (action === "master") {
          this.mixer.setMasterGain(value);
          this.renderAndRebind();
        }
      });
    }
  }
}

export function getStemMixerUiSummary(
  state: StemMixerPanelState
): {
  readonly channels: readonly StemChannel[];
  readonly audibleChannels: readonly StemChannel[];
  readonly mutedChannels: readonly StemChannel[];
} {
  const effective = new StemMixer(state.mixer).getEffectiveChannels(
    state.soloChannels
  );

  return {
    channels: [...STEM_CHANNELS],
    audibleChannels: effective
      .filter((item) => item.audible)
      .map((item) => item.channel),
    mutedChannels: effective
      .filter((item) => !item.audible)
      .map((item) => item.channel)
  };
}
