#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import platform
import sys
import time
from pathlib import Path

import mlx.core as mx
import mlx_demucs
import numpy as np
import soundfile as sf
from mlx_demucs import demucs


STEMS = ("vocals", "drums", "bass", "other")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Benchmark de separación full-track mediante la API Python de MLX-Demucs."
    )
    parser.add_argument(
        "input",
        type=Path,
        help="Archivo de audio de entrada.",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        required=True,
        help="Directorio de salida.",
    )
    parser.add_argument(
        "-m",
        "--model",
        choices=("htdemucs", "htdemucs_ft", "hdemucs_mmi"),
        default="htdemucs",
        help="Modelo MLX-Demucs.",
    )
    return parser.parse_args()


def print_header(args: argparse.Namespace) -> None:
    print("=" * 72)
    print("QDEV MASHUPS — BENCHMARK FULL-TRACK MLX-DEMUCS")
    print("=" * 72)
    print(f"Input:      {args.input}")
    print(f"Output:     {args.output}")
    print(f"Model:      {args.model}")
    print(f"Python:     {sys.version.replace(chr(10), ' ')}")
    print(f"Platform:   {platform.platform()}")
    print(f"Machine:    {platform.machine()}")
    print(f"MLX device: {mx.default_device()}")
    print(f"MLX-Demucs: {getattr(mlx_demucs, '__version__', 'unknown')}")
    print("=" * 72)


def load_audio(path: Path) -> tuple[np.ndarray, int]:
    import librosa

    audio, sample_rate = librosa.load(
        str(path),
        sr=44100,
        mono=False,
    )

    if audio.ndim == 1:
        audio = np.stack([audio, audio], axis=0)

    if audio.shape[0] == 1:
        audio = np.concatenate([audio, audio], axis=0)

    if audio.shape[0] > 2:
        audio = audio[:2]

    audio = np.asarray(audio, dtype=np.float32)

    return audio, sample_rate


def write_stem(
    output_dir: Path,
    stem_name: str,
    audio: np.ndarray,
    sample_rate: int,
) -> Path:
    output_path = output_dir / f"{stem_name}.wav"

    data = np.asarray(audio)

    if data.ndim == 1:
        data = data[:, None]
    elif data.ndim == 2 and data.shape[0] <= 2 and data.shape[1] > data.shape[0]:
        data = data.T

    data = np.asarray(data, dtype=np.float32)

    sf.write(
        str(output_path),
        data,
        sample_rate,
        subtype="PCM_16",
    )

    return output_path


def normalize_sources(
    separated: object,
) -> dict[str, np.ndarray]:
    if isinstance(separated, dict):
        result: dict[str, np.ndarray] = {}

        for stem in STEMS:
            value = separated.get(stem)

            if value is None:
                raise RuntimeError(
                    f"El modelo no devolvió el stem requerido: {stem}"
                )

            result[stem] = np.asarray(value)

        return result

    if isinstance(separated, (list, tuple)):
        if len(separated) != 4:
            raise RuntimeError(
                f"Se esperaban exactamente 4 stems; se recibieron {len(separated)}."
            )

        return {
            stem: np.asarray(value)
            for stem, value in zip(STEMS, separated)
        }

    array = np.asarray(separated)

    if array.ndim < 2:
        raise RuntimeError(
            "La salida del modelo no contiene una dimensión de stems válida."
        )

    if array.shape[0] == 4:
        stem_axis = 0
    elif array.shape[1] == 4:
        stem_axis = 1
    else:
        raise RuntimeError(
            f"No se pudo identificar la dimensión de 4 stems: {array.shape}."
        )

    return {
        stem: np.asarray(np.take(array, index, axis=stem_axis))
        for index, stem in enumerate(STEMS)
    }


def main() -> int:
    args = parse_args()

    if not args.input.is_file():
        raise FileNotFoundError(
            f"No existe el archivo de entrada: {args.input}"
        )

    args.output.mkdir(parents=True, exist_ok=True)

    print_header(args)

    started = time.perf_counter()

    print()
    print("[1/4] Cargando audio...")
    audio_started = time.perf_counter()

    audio, sample_rate = load_audio(args.input)

    audio_seconds = audio.shape[-1] / sample_rate
    audio_elapsed = time.perf_counter() - audio_started

    print(f"      sample rate: {sample_rate} Hz")
    print(f"      channels:    {audio.shape[0]}")
    print(f"      samples:     {audio.shape[-1]}")
    print(f"      duration:    {audio_seconds:.3f} s")
    print(f"      load time:   {audio_elapsed:.3f} s")

    print()
    print("[2/4] Cargando modelo...")
    model_started = time.perf_counter()

    model = demucs.load_model(args.model)

    model_elapsed = time.perf_counter() - model_started

    print(f"      model time:  {model_elapsed:.3f} s")

    print()
    print("[3/4] Ejecutando separación full-track...")
    inference_started = time.perf_counter()

    waveform = mx.array(audio)

    separated = demucs.apply_model(
        model,
        waveform,
    )

    mx.eval(separated)

    inference_elapsed = time.perf_counter() - inference_started

    print(f"      inference:   {inference_elapsed:.3f} s")
    print(
        f"      realtime:    "
        f"{audio_seconds / inference_elapsed:.3f}x"
    )

    print()
    print("[4/4] Escribiendo cuatro stems...")

    stems = normalize_sources(separated)

    stem_paths: dict[str, str] = {}

    write_started = time.perf_counter()

    for stem in STEMS:
        path = write_stem(
            args.output,
            stem,
            stems[stem],
            sample_rate,
        )

        stem_paths[stem] = str(path)

        print(f"      {stem}: {path}")

    write_elapsed = time.perf_counter() - write_started

    total_elapsed = time.perf_counter() - started

    print()
    print("=" * 72)
    print("RESULTADO")
    print("=" * 72)
    print(f"Audio duration:     {audio_seconds:.3f} s")
    print(f"Model load:         {model_elapsed:.3f} s")
    print(f"Audio load:         {audio_elapsed:.3f} s")
    print(f"Inference:          {inference_elapsed:.3f} s")
    print(f"WAV writing:        {write_elapsed:.3f} s")
    print(f"TOTAL:              {total_elapsed:.3f} s")
    print(
        f"TOTAL realtime:     "
        f"{audio_seconds / total_elapsed:.3f}x"
    )
    print("=" * 72)

    manifest = {
        "input": str(args.input),
        "output": str(args.output),
        "model": args.model,
        "stems": list(STEMS),
        "platform": platform.platform(),
        "machine": platform.machine(),
        "python": sys.version,
        "mlx_device": str(mx.default_device()),
        "sample_rate": sample_rate,
        "channels": int(audio.shape[0]),
        "duration_seconds": audio_seconds,
        "timings_seconds": {
            "audio_load": audio_elapsed,
            "model_load": model_elapsed,
            "inference": inference_elapsed,
            "wav_writing": write_elapsed,
            "total": total_elapsed,
        },
        "realtime_ratio": audio_seconds / total_elapsed,
        "stem_paths": stem_paths,
    }

    manifest_path = args.output / "benchmark.json"

    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Manifest:           {manifest_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())