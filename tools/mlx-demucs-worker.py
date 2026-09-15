#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import time
from pathlib import Path

import mlx.core as mx
import numpy as np
import soundfile as sf

from mlx_demucs.utils.loader import load_model

STEMS = ("drums", "bass", "other", "vocals")
SOURCE_INDEX = {"drums": 0, "bass": 1, "other": 2, "vocals": 3}

_CANCELLED = False


def emit(event: str, **payload: object) -> None:
    message = {"event": event, **payload}
    sys.stdout.write(json.dumps(message, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def on_signal(signum: int, _frame: object) -> None:
    global _CANCELLED
    _CANCELLED = True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="QDEV MLX-Demucs direct worker")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", choices=("htdemucs", "htdemucs_ft"), required=True)
    return parser.parse_args()


def ensure_stereo(audio: np.ndarray) -> np.ndarray:
    if audio.ndim == 1:
        return np.stack([audio, audio], axis=0)
    if audio.ndim != 2:
        raise ValueError(f"Formato de audio no compatible: {audio.shape}")
    if audio.shape[1] == 1:
        return np.repeat(audio, 2, axis=1)
    if audio.shape[1] > 2:
        return audio[:, :2]
    return audio.T


def separate(args: argparse.Namespace) -> None:
    global _CANCELLED

    input_path = Path(args.input).expanduser().resolve()
    output_dir = Path(args.output).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    for stem in STEMS:
        path = output_dir / f"{stem}.wav"
        if path.exists():
            path.unlink()

    emit("status", progress=0.02, message="Cargando modelo MLX…")
    started = time.perf_counter()
    model = load_model(args.model)
    emit(
        "status",
        progress=0.08,
        message="Modelo MLX cargado.",
        model_load_seconds=time.perf_counter() - started,
    )

    audio, sample_rate = sf.read(str(input_path), dtype="float32", always_2d=False)
    audio = ensure_stereo(np.asarray(audio, dtype=np.float32))

    model_rate = int(model.samplerate)
    if sample_rate != model_rate:
        raise ValueError(
            f"Frecuencia de muestreo no compatible: {sample_rate} Hz; "
            f"el modelo requiere {model_rate} Hz."
        )

    total_samples = int(audio.shape[-1])
    segment_samples = int(model.segment * model.samplerate)
    overlap = segment_samples // 4
    stride = segment_samples - overlap

    if total_samples <= 0:
        raise ValueError("La fuente de audio está vacía.")

    offsets = list(range(0, total_samples, stride))
    output = np.zeros(
        (len(STEMS), audio.shape[0], total_samples),
        dtype=np.float32,
    )
    weight_sum = np.zeros(total_samples, dtype=np.float32)

    weight = np.concatenate(
        [
            np.arange(1, segment_samples // 2 + 1, dtype=np.float32),
            np.arange(segment_samples - segment_samples // 2, 0, -1, dtype=np.float32),
        ]
    )
    weight /= np.max(weight)

    emit(
        "status",
        progress=0.10,
        message=f"Procesando {len(offsets)} segmentos de audio…",
        segments=len(offsets),
        duration_seconds=total_samples / sample_rate,
    )

    for segment_index, offset in enumerate(offsets, start=1):
        if _CANCELLED:
            raise KeyboardInterrupt("Separación cancelada.")

        end = min(offset + segment_samples, total_samples)
        chunk_length = end - offset
        chunk = audio[:, offset:end]

        if chunk_length < segment_samples:
            padded = np.pad(
                chunk,
                ((0, 0), (0, segment_samples - chunk_length)),
                mode="constant",
            )
        else:
            padded = chunk

        x = mx.array(padded[None, :, :].astype(np.float32))
        mx.eval(x)

        y = model(x)
        mx.eval(y)

        predicted = np.asarray(y[0], dtype=np.float32)
        predicted = predicted[..., :chunk_length]

        local_weight = weight[:chunk_length]
        output[:, :, offset:end] += predicted * local_weight[None, None, :]
        weight_sum[offset:end] += local_weight

        progress = 0.10 + (segment_index / len(offsets)) * 0.80
        emit(
            "progress",
            progress=float(min(0.90, progress)),
            message=f"Procesando segmento {segment_index}/{len(offsets)}…",
            segment=segment_index,
            segments=len(offsets),
        )

    output /= np.maximum(weight_sum[None, None, :], 1e-8)

    emit("status", progress=0.92, message="Escribiendo los cuatro stems…")

    for stem in STEMS:
        if _CANCELLED:
            raise KeyboardInterrupt("Separación cancelada.")
        path = output_dir / f"{stem}.wav"
        sf.write(
            str(path),
            output[SOURCE_INDEX[stem]].T,
            sample_rate,
            subtype="PCM_16",
            format="WAV",
        )

    elapsed = time.perf_counter() - started
    emit(
        "complete",
        progress=1.0,
        message="Separación completada.",
        elapsed_seconds=elapsed,
        sample_rate=sample_rate,
        channels=audio.shape[0],
        duration_seconds=total_samples / sample_rate,
    )


def main() -> int:
    signal.signal(signal.SIGTERM, on_signal)
    signal.signal(signal.SIGINT, on_signal)

    try:
        separate(parse_args())
        return 0
    except KeyboardInterrupt:
        emit("cancelled", progress=0.0, message="Separación cancelada.")
        return 130
    except Exception as exc:
        emit("error", message=str(exc))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
