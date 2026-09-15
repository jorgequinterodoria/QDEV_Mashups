import {
  useEffect,
  useRef,
  useState
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  buildRgbWaveform,
  type RgbWaveformData,
  rgbCss
} from "../waveform/rgb";

interface RgbWaveformProps {
  audioUrl: string | null;
  currentTime: number;
  onSeek?: (timeSeconds: number) => void;
  height?: number;
  label?: string;
}

export function RgbWaveform({
  audioUrl,
  currentTime,
  onSeek,
  height = 180,
  label = "Forma de onda RGB"
}: RgbWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [waveform, setWaveform] = useState<RgbWaveformData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (!audioUrl) {
        setWaveform(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(`No se pudo leer el audio (${response.status}).`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const AudioContextCtor =
          window.AudioContext ??
          (window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }).webkitAudioContext;

        if (!AudioContextCtor) {
          throw new Error("El navegador de audio no está disponible.");
        }

        const context = new AudioContextCtor();
        try {
          const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
          if (!cancelled) {
            setWaveform(
              buildRgbWaveform(decoded, {
                bars: 420
              })
            );
          }
        } finally {
          await context.close();
        }
      } catch (cause) {
        if (!cancelled) {
          setWaveform(null);
          setError(
            cause instanceof Error
              ? cause.message
              : String(cause)
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) {
      return;
    }

    const draw = (): void => {
      const width = Math.max(320, host.clientWidth);
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      context.fillStyle = "rgba(5, 7, 10, 0.96)";
      context.fillRect(0, 0, width, height);

      if (!waveform) {
        context.fillStyle = "rgba(255,255,255,0.38)";
        context.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
        context.textAlign = "center";
        context.fillText(
          loading ? "Analizando espectro del audio…" : error ?? "Selecciona una pista de audio",
          width / 2,
          height / 2
        );
        return;
      }

      const center = height * 0.5;
      const amplitudeHeight = height * 0.42;
      const barWidth = Math.max(1, width / waveform.points.length);
      const duration = Math.max(0.001, waveform.durationSeconds);
      const playheadX = Math.min(width, Math.max(0, currentTime / duration * width));

      waveform.points.forEach((point, index) => {
        const x = index * barWidth;
        const magnitude = Math.max(0.04, point.amplitude);
        const barHeight = magnitude * amplitudeHeight;
        const glow = context.createLinearGradient(x, center - barHeight, x, center + barHeight);
        glow.addColorStop(0, rgbCss(point, 0.25));
        glow.addColorStop(0.5, rgbCss(point, 0.94));
        glow.addColorStop(1, rgbCss(point, 0.25));
        context.fillStyle = glow;
        context.fillRect(x, center - barHeight, Math.ceil(barWidth + 0.4), barHeight * 2);
      });

      context.fillStyle = "rgba(255,255,255,0.14)";
      context.fillRect(0, center, width, 1);

      context.fillStyle = "rgba(255,255,255,0.08)";
      for (let step = 1; step < 10; step += 1) {
        const x = (width / 10) * step;
        context.fillRect(x, 0, 1, height);
      }

      context.fillStyle = "rgba(255,255,255,0.12)";
      context.fillRect(0, 0, playheadX, 2);

      context.strokeStyle = "rgba(255,255,255,0.96)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(playheadX, 0);
      context.lineTo(playheadX, height);
      context.stroke();

      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(playheadX, 7, 3.5, 0, Math.PI * 2);
      context.fill();
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(host);
    return () => observer.disconnect();
  }, [waveform, currentTime, height, loading, error]);

  const handlePointer = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!waveform || !onSeek) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    onSeek(ratio * waveform.durationSeconds);
  };

  return (
    <section className="qdev-rgb-waveform">
      <header className="qdev-rgb-waveform__header">
        <div>
          <span className="qdev-waveform-kicker">RGB SPECTRUM</span>
          <h3>{label}</h3>
          <p>Rojo = graves · Verde = medios · Azul = agudos</p>
        </div>
      </header>
      <div
        ref={hostRef}
        className="qdev-rgb-waveform__canvas-wrap"
        onPointerDown={handlePointer}
        role="button"
        tabIndex={0}
        aria-label="Forma de onda RGB interactiva"
      >
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}
