import type { MashupEnginePlan } from "../stems/mashup-engine.js";
import {
  StemMixerPanelController,
  renderStemMixerPanel
} from "./stem-mixer-panel.js";
import type { StemMixerState } from "../stems/mixer.js";

export type PreviewPlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "ended"
  | "error";

export interface PreviewStudioState {
  readonly status: PreviewPlaybackStatus;
  readonly currentTimeSeconds: number;
  readonly durationSeconds: number;
  readonly outputPath: string | null;
  readonly errorMessage: string | null;
  readonly renderProgress01: number;
}

export interface PreviewStudioOptions {
  readonly className?: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly onRenderPreview?: (
    plan: MashupEnginePlan,
    mixer: StemMixerState
  ) => Promise<{ readonly outputPath: string; readonly durationSeconds: number }>;
}

export interface PreviewStudioControllerOptions extends PreviewStudioOptions {
  readonly audio?: HTMLAudioElement;
}

export const PREVIEW_STUDIO_DEFAULT_TITLE = "Estudio de previsualización";
export const PREVIEW_STUDIO_DEFAULT_SUBTITLE =
  "Escucha, ajusta y valida tu mashup antes del render final.";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function statusLabel(status: PreviewPlaybackStatus): string {
  switch (status) {
    case "loading":
      return "Cargando";
    case "playing":
      return "Reproduciendo";
    case "paused":
      return "Pausado";
    case "ended":
      return "Finalizado";
    case "error":
      return "Error";
    default:
      return "Listo";
  }
}

export function renderPreviewStudio(
  state: PreviewStudioState,
  plan: MashupEnginePlan,
  mixerState: StemMixerState,
  options: PreviewStudioOptions = {}
): string {
  const title = options.title ?? PREVIEW_STUDIO_DEFAULT_TITLE;
  const subtitle =
    options.subtitle ?? PREVIEW_STUDIO_DEFAULT_SUBTITLE;

  const progress = clamp01(
    state.durationSeconds > 0
      ? state.currentTimeSeconds / state.durationSeconds
      : 0
  );

  const renderPercent = Math.round(state.renderProgress01 * 100);

  const selectedIncludes = plan.selectedChannels.filter(
    (selection) => selection.action === "include"
  );

  const sourceTracks = [...new Set(
    selectedIncludes.map((selection) => selection.sourceTrackId)
  )];

  return `
    <section class="${escapeHtml(
      options.className ?? "qdev-preview-studio"
    )}" data-component="preview-studio">
      <header class="qdev-preview-studio__header">
        <div>
          <p class="qdev-preview-studio__kicker">QDEV MASHUPS</p>
          <h2>${escapeHtml(title)}</h2>
          <p class="qdev-preview-studio__subtitle">${escapeHtml(subtitle)}</p>
        </div>

        <div class="qdev-preview-studio__status">
          <span data-role="playback-status">${escapeHtml(
            statusLabel(state.status)
          )}</span>
          <span data-role="render-status">${
            state.renderProgress01 > 0 && state.renderProgress01 < 1
              ? `Render ${renderPercent}%`
              : state.outputPath
                ? "Preview renderizado"
                : "Sin preview renderizado"
          }</span>
        </div>
      </header>

      <section class="qdev-preview-studio__hero">
        <div class="qdev-preview-studio__transport">
          <button
            type="button"
            class="qdev-preview-studio__transport-button qdev-preview-studio__transport-button--primary"
            data-action="toggle-playback"
          >${
            state.status === "playing"
              ? "Pausar"
              : "Reproducir"
          }</button>

          <button
            type="button"
            class="qdev-preview-studio__transport-button"
            data-action="stop"
          >Detener</button>

          <div class="qdev-preview-studio__timeline">
            <input
              type="range"
              min="0"
              max="${Math.max(0.001, state.durationSeconds)}"
              step="0.01"
              value="${Math.min(
                state.currentTimeSeconds,
                Math.max(0.001, state.durationSeconds)
              )}"
              data-action="seek"
              aria-label="Posición de reproducción"
            />
            <div class="qdev-preview-studio__timecode">
              <span data-role="current-time">${formatTime(
                state.currentTimeSeconds
              )}</span>
              <span>/</span>
              <span data-role="duration">${formatTime(
                state.durationSeconds
              )}</span>
            </div>
          </div>

          <button
            type="button"
            class="qdev-preview-studio__transport-button"
            data-action="render-preview"
          >Renderizar preview</button>
        </div>

        <div class="qdev-preview-studio__progress" aria-hidden="true">
          <span style="width: ${progress * 100}%"></span>
        </div>
      </section>

      <section class="qdev-preview-studio__summary">
        <article>
          <span>Fuentes</span>
          <strong>${sourceTracks.length}</strong>
        </article>
        <article>
          <span>Stems incluidos</span>
          <strong>${selectedIncludes.length}</strong>
        </article>
        <article>
          <span>BPM ratio</span>
          <strong>${plan.bpmRatio.toFixed(4)}</strong>
        </article>
        <article>
          <span>Duración</span>
          <strong>${formatTime(plan.durationSeconds)}</strong>
        </article>
        <article>
          <span>Master</span>
          <strong>${mixerState.masterGainDb.toFixed(1)} dB</strong>
        </article>
      </section>

      ${
        state.errorMessage
          ? `<p class="qdev-preview-studio__error" role="alert">${escapeHtml(
              state.errorMessage
            )}</p>`
          : ""
      }

      ${
        state.outputPath
          ? `<p class="qdev-preview-studio__output" data-role="output-path">
              Preview: ${escapeHtml(state.outputPath)}
            </p>`
          : ""
      }
    </section>
  `;
}

export class PreviewStudioController {
  private readonly plan: MashupEnginePlan;
  private readonly mixer: StemMixerPanelController;
  private readonly options: PreviewStudioControllerOptions;
  private readonly audio: HTMLAudioElement | null;
  private state: PreviewStudioState = {
    status: "idle",
    currentTimeSeconds: 0,
    durationSeconds: 0,
    outputPath: null,
    errorMessage: null,
    renderProgress01: 0
  };
  private element: HTMLElement | null = null;
  private cleanupAudioListeners: (() => void) | null = null;

  constructor(
    plan: MashupEnginePlan,
    mixer = new StemMixerPanelController(),
    options: PreviewStudioControllerOptions = {}
  ) {
    this.plan = plan;
    this.mixer = mixer;
    this.options = options;
    this.audio = options.audio ?? null;
    this.state = {
      ...this.state,
      durationSeconds: plan.durationSeconds
    };
  }

  getState(): PreviewStudioState {
    return { ...this.state };
  }

  getMixerState(): StemMixerState {
    return this.mixer.getState().mixer;
  }

  mount(element: HTMLElement): void {
    this.element = element;
    this.bindAudio();
    this.render();
    this.bindUi();
  }

  dispose(): void {
    this.cleanupAudioListeners?.();
    this.cleanupAudioListeners = null;
    this.element = null;
  }

  setCurrentTime(seconds: number): void {
    const duration = Math.max(0, this.state.durationSeconds);
    this.state = {
      ...this.state,
      currentTimeSeconds: Math.min(duration, Math.max(0, seconds))
    };

    if (this.audio) {
      this.audio.currentTime = this.state.currentTimeSeconds;
    }

    this.renderAndBind();
  }

  async togglePlayback(): Promise<void> {
    if (!this.audio) {
      this.state = {
        ...this.state,
        status:
          this.state.status === "playing"
            ? "paused"
            : "playing"
      };
      this.renderAndBind();
      return;
    }

    try {
      if (this.audio.paused) {
        this.state = {
          ...this.state,
          status: "loading",
          errorMessage: null
        };
        this.renderAndBind();
        await this.audio.play();
      } else {
        this.audio.pause();
      }
    } catch (error) {
      this.state = {
        ...this.state,
        status: "error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "No se pudo reproducir el preview."
      };
      this.renderAndBind();
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    this.state = {
      ...this.state,
      status: "idle",
      currentTimeSeconds: 0
    };

    this.renderAndBind();
  }

  async renderPreview(): Promise<void> {
    if (!this.options.onRenderPreview) {
      this.state = {
        ...this.state,
        status: "error",
        errorMessage: "No hay un renderer de preview conectado."
      };
      this.renderAndBind();
      return;
    }

    this.state = {
      ...this.state,
      renderProgress01: 0,
      errorMessage: null
    };
    this.renderAndBind();

    try {
      const result = await this.options.onRenderPreview(
        this.plan,
        this.mixer.getState().mixer
      );

      this.state = {
        ...this.state,
        status: "paused",
        outputPath: result.outputPath,
        durationSeconds: result.durationSeconds,
        currentTimeSeconds: 0,
        renderProgress01: 1
      };

      if (this.audio) {
        this.audio.src = result.outputPath;
        this.audio.currentTime = 0;
      }
    } catch (error) {
      this.state = {
        ...this.state,
        status: "error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "No se pudo renderizar el preview."
      };
    }

    this.renderAndBind();
  }

  private render(): void {
    if (!this.element) {
      return;
    }

    this.element.innerHTML = renderPreviewStudio(
      this.state,
      this.plan,
      this.mixer.getState().mixer,
      this.options
    );
  }

  private renderAndBind(): void {
    this.render();
    this.bindUi();
  }

  private bindUi(): void {
    if (!this.element) {
      return;
    }

    this.element
      .querySelector<HTMLButtonElement>(
        '[data-action="toggle-playback"]'
      )
      ?.addEventListener("click", () => {
        void this.togglePlayback();
      });

    this.element
      .querySelector<HTMLButtonElement>(
        '[data-action="stop"]'
      )
      ?.addEventListener("click", () => {
        this.stop();
      });

    this.element
      .querySelector<HTMLInputElement>(
        '[data-action="seek"]'
      )
      ?.addEventListener("input", (event) => {
        const target = event.currentTarget;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }

        this.setCurrentTime(Number(target.value));
      });

    this.element
      .querySelector<HTMLButtonElement>(
        '[data-action="render-preview"]'
      )
      ?.addEventListener("click", () => {
        void this.renderPreview();
      });
  }

  private bindAudio(): void {
    if (!this.audio) {
      return;
    }

    const updateTime = () => {
      this.state = {
        ...this.state,
        currentTimeSeconds: this.audio?.currentTime ?? 0,
        durationSeconds:
          Number.isFinite(this.audio?.duration ?? NaN)
            ? this.audio?.duration ?? this.state.durationSeconds
            : this.state.durationSeconds
      };
      this.renderAndBind();
    };

    const onPlay = () => {
      this.state = {
        ...this.state,
        status: "playing"
      };
      this.renderAndBind();
    };

    const onPause = () => {
      if (this.state.status !== "ended") {
        this.state = {
          ...this.state,
          status: "paused"
        };
        this.renderAndBind();
      }
    };

    const onEnded = () => {
      this.state = {
        ...this.state,
        status: "ended",
        currentTimeSeconds: this.state.durationSeconds
      };
      this.renderAndBind();
    };

    const onError = () => {
      this.state = {
        ...this.state,
        status: "error",
        errorMessage: "El audio del preview produjo un error."
      };
      this.renderAndBind();
    };

    this.audio.addEventListener("timeupdate", updateTime);
    this.audio.addEventListener("durationchange", updateTime);
    this.audio.addEventListener("play", onPlay);
    this.audio.addEventListener("pause", onPause);
    this.audio.addEventListener("ended", onEnded);
    this.audio.addEventListener("error", onError);

    this.cleanupAudioListeners = () => {
      this.audio?.removeEventListener("timeupdate", updateTime);
      this.audio?.removeEventListener("durationchange", updateTime);
      this.audio?.removeEventListener("play", onPlay);
      this.audio?.removeEventListener("pause", onPause);
      this.audio?.removeEventListener("ended", onEnded);
      this.audio?.removeEventListener("error", onError);
    };
  }
}

export { renderStemMixerPanel };
