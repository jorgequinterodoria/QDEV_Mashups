#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import mlx.core as mx
import numpy as np
import soundfile as sf

from mlx_demucs.utils.loader import load_model


STEM_CHANNELS = (
    "vocals",
    "drums",
    "bass",
    "other",
)

MODELS = (
    "htdemucs",
    "hdemucs_mmi",
)

TRAINING_LENGTH_SAMPLES = 343_980

SAMPLE_RATE = 44_100

TRAINING_LENGTH_SECONDS = (
    TRAINING_LENGTH_SAMPLES /
    SAMPLE_RATE
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Benchmark directo de MLX-Demucs "
            "para QDEV Mashups."
        )
    )

    parser.add_argument(
        "source",
        type=Path,
        help="Archivo de audio real.",
    )

    parser.add_argument(
        "--seconds",
        type=float,
        default=30.0,
        help=(
            "Duración del audio a procesar. "
            "Por defecto: 30 segundos."
        ),
    )

    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path(
            "/Volumes/Respaldo Mac/"
            "QDEV_Mashups/"
            "Benchmarks/"
            "Stems"
        ),
        help=(
            "Directorio externo para los "
            "resultados del benchmark."
        ),
    )

    parser.add_argument(
        "--models",
        nargs="+",
        choices=MODELS,
        default=list(MODELS),
        help=(
            "Modelos a comparar."
        ),
    )

    return parser.parse_args()


def require_source(
    path: Path,
) -> None:
    if not path.exists():
        raise FileNotFoundError(
            f"No existe el archivo: {path}"
        )

    if not path.is_file():
        raise ValueError(
            f"La ruta no es un archivo: {path}"
        )

    if path.stat().st_size <= 0:
        raise ValueError(
            f"El archivo está vacío: {path}"
        )


def load_audio(
    source: Path,
    seconds: float,
) -> tuple[np.ndarray, int]:
    info = sf.info(
        str(source)
    )

    source_rate = int(
        info.samplerate
    )

    source_channels = int(
        info.channels
    )

    if source_rate <= 0:
        raise ValueError(
            "La frecuencia de muestreo no es válida."
        )

    if source_channels <= 0:
        raise ValueError(
            "El número de canales no es válido."
        )

    requested_frames = int(
        source_rate * seconds
    )

    if requested_frames <= 0:
        raise ValueError(
            "--seconds debe ser mayor que cero."
        )

    frame_count = min(
        requested_frames,
        int(info.frames),
    )

    if frame_count <= 0:
        raise ValueError(
            "No hay audio disponible."
        )

    audio, actual_rate = sf.read(
        str(source),
        start=0,
        stop=frame_count,
        dtype="float32",
        always_2d=True,
    )

    if actual_rate != source_rate:
        raise RuntimeError(
            "La frecuencia de muestreo "
            "cambió durante la lectura."
        )

    if source_rate != SAMPLE_RATE:
        raise RuntimeError(
            (
                f"El benchmark requiere "
                f"{SAMPLE_RATE} Hz. "
                f"La fuente tiene "
                f"{source_rate} Hz."
            )
        )

    if audio.shape[1] == 1:
        audio = np.repeat(
            audio,
            2,
            axis=1,
        )
    elif audio.shape[1] > 2:
        audio = audio[:, :2]

    audio = np.asarray(
        audio,
        dtype=np.float32,
        order="C",
    )

    return (
        audio,
        source_rate,
    )


def prepare_segment(
    audio: np.ndarray,
    start: int,
) -> mx.array:
    end = (
        start +
        TRAINING_LENGTH_SAMPLES
    )

    segment = audio[
        start:end
    ]

    if (
        segment.shape[0] <
        TRAINING_LENGTH_SAMPLES
    ):
        padded = np.zeros(
            (
                TRAINING_LENGTH_SAMPLES,
                2,
            ),
            dtype=np.float32,
        )

        padded[
            :segment.shape[0],
            :
        ] = segment

        segment = padded

    channels_first = np.transpose(
        segment,
        (1, 0),
    )

    return mx.array(
        channels_first[
            None,
            :,
            :
        ]
    )


def benchmark_model(
    model_name: str,
    audio: np.ndarray,
    sample_rate: int,
    output_root: Path,
) -> dict[str, Any]:
    print()
    print("=" * 72)
    print(
        f"MODELO: {model_name}"
    )
    print("=" * 72)

    print(
        "Cargando modelo..."
    )

    load_start = time.perf_counter()

    model = load_model(
        model_name
    )

    load_seconds = (
        time.perf_counter()
        - load_start
    )

    print(
        f"Carga del modelo: "
        f"{load_seconds:.3f} s"
    )

    model_sources = list(
        getattr(
            model,
            "sources",
            [],
        )
    )

    print(
        "Stems del modelo:",
        ", ".join(
            model_sources
        ),
    )

    missing = [
        channel
        for channel
        in STEM_CHANNELS
        if channel
        not in model_sources
    ]

    if missing:
        raise RuntimeError(
            (
                "El modelo no soporta "
                "todos los stems requeridos. "
                "Faltan: "
                + ", ".join(missing)
            )
        )

    total_audio_samples = (
        audio.shape[0]
    )

    segment_count = int(
        np.ceil(
            total_audio_samples /
            TRAINING_LENGTH_SAMPLES
        )
    )

    print(
        f"Segmento MLX: "
        f"{TRAINING_LENGTH_SAMPLES} "
        f"muestras "
        f"({TRAINING_LENGTH_SECONDS:.3f} s)"
    )

    print(
        f"Segmentos a procesar: "
        f"{segment_count}"
    )

    print()
    print(
        "INFERENCIA"
    )

    inference_seconds = 0.0

    first_segment_seconds: (
        float | None
    ) = None

    total_output_samples = 0

    for segment_index in range(
        segment_count
    ):
        start = (
            segment_index *
            TRAINING_LENGTH_SAMPLES
        )

        segment = prepare_segment(
            audio,
            start,
        )

        print(
            f"  Segmento "
            f"{segment_index + 1}/"
            f"{segment_count}...",
            flush=True,
        )

        inference_start = (
            time.perf_counter()
        )

        separated = model(
            segment
        )

        mx.eval(
            separated
        )

        elapsed = (
            time.perf_counter()
            - inference_start
        )

        inference_seconds += (
            elapsed
        )

        if (
            first_segment_seconds
            is None
        ):
            first_segment_seconds = (
                elapsed
            )

        total_output_samples += min(
            TRAINING_LENGTH_SAMPLES,
            max(
                0,
                total_audio_samples -
                start,
            ),
        )

        print(
            f"    {elapsed:.3f} s"
        )

    measured_duration = (
        total_output_samples /
        sample_rate
    )

    realtime_factor = (
        measured_duration /
        inference_seconds
        if inference_seconds > 0
        else 0.0
    )

    projected_full_track_seconds = (
        (
            audio.shape[0] /
            TRAINING_LENGTH_SAMPLES
        )
        *
        (
            inference_seconds /
            segment_count
        )
    )

    print()
    print(
        f"Audio medido: "
        f"{measured_duration:.3f} s"
    )

    print(
        f"Inferencia total: "
        f"{inference_seconds:.3f} s"
    )

    print(
        f"Promedio por segmento: "
        f"{inference_seconds / segment_count:.3f} s"
    )

    if (
        first_segment_seconds
        is not None
    ):
        print(
            f"Primer segmento: "
            f"{first_segment_seconds:.3f} s"
        )

    print(
        f"Factor de tiempo real: "
        f"{realtime_factor:.3f}×"
    )

    print(
        f"Tiempo proyectado para "
        f"una canción completa: "
        f"{projected_full_track_seconds:.3f} s"
    )

    print(
        f"Tiempo proyectado: "
        f"{projected_full_track_seconds / 60:.2f} min"
    )

    output_directory = (
        output_root /
        model_name
    )

    output_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    return {
        "model": model_name,
        "audio_seconds":
            measured_duration,
        "sample_rate":
            sample_rate,
        "segment_samples":
            TRAINING_LENGTH_SAMPLES,
        "segment_seconds":
            TRAINING_LENGTH_SECONDS,
        "segment_count":
            segment_count,
        "load_seconds":
            load_seconds,
        "inference_seconds":
            inference_seconds,
        "average_segment_seconds":
            inference_seconds /
            segment_count,
        "first_segment_seconds":
            first_segment_seconds,
        "realtime_factor":
            realtime_factor,
        "projected_full_track_seconds":
            projected_full_track_seconds,
        "projected_full_track_minutes":
            projected_full_track_seconds /
            60.0,
        "device":
            str(
                mx.default_device()
            ),
        "output_directory":
            str(
                output_directory
            ),
    }


def main() -> int:
    args = parse_args()

    source = (
        args.source
        .expanduser()
        .resolve()
    )

    output_root = (
        args.output_root
        .expanduser()
        .resolve()
    )

    require_source(
        source
    )

    print(
        "QDEV Mashups — "
        "Benchmark MLX-Demucs"
    )

    print(
        f"Python: "
        f"{sys.version.split()[0]}"
    )

    print(
        f"MLX device: "
        f"{mx.default_device()}"
    )

    print(
        f"Fuente: "
        f"{source}"
    )

    print(
        f"Resultados: "
        f"{output_root}"
    )

    hf_home = os.environ.get(
        "HF_HOME"
    )

    if hf_home:
        print(
            f"HF_HOME: "
            f"{hf_home}"
        )

    audio, sample_rate = (
        load_audio(
            source,
            args.seconds,
        )
    )

    actual_seconds = (
        audio.shape[0] /
        sample_rate
    )

    print(
        f"Audio cargado: "
        f"{actual_seconds:.3f} s"
    )

    print(
        f"Frecuencia: "
        f"{sample_rate} Hz"
    )

    print(
        f"Canales: "
        f"{audio.shape[1]}"
    )

    print(
        f"Segmento requerido por "
        f"htdemucs: "
        f"{TRAINING_LENGTH_SAMPLES} "
        f"muestras / "
        f"{TRAINING_LENGTH_SECONDS:.3f} s"
    )

    results: list[
        dict[str, Any]
    ] = []

    for model_name in args.models:
        result = benchmark_model(
            model_name,
            audio,
            sample_rate,
            output_root,
        )

        results.append(
            result
        )

    output_root.mkdir(
        parents=True,
        exist_ok=True,
    )

    report_path = (
        output_root /
        "benchmark-report.json"
    )

    report = {
        "source":
            str(source),
        "audio_seconds":
            actual_seconds,
        "sample_rate":
            sample_rate,
        "segment_samples":
            TRAINING_LENGTH_SAMPLES,
        "segment_seconds":
            TRAINING_LENGTH_SECONDS,
        "device":
            str(
                mx.default_device()
            ),
        "models":
            results,
    }

    report_path.write_text(
        json.dumps(
            report,
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    print()
    print("=" * 72)
    print(
        "RESUMEN"
    )
    print("=" * 72)

    for result in results:
        print(
            f"{result['model']}: "
            f"{result['inference_seconds']:.3f} s "
            f"de inferencia para "
            f"{result['audio_seconds']:.3f} s "
            f"de audio → "
            f"{result['realtime_factor']:.3f}× "
            f"tiempo real"
        )

        print(
            f"  Proyección canción completa: "
            f"{result['projected_full_track_minutes']:.2f} min"
        )

    print()
    print(
        f"Reporte: "
        f"{report_path}"
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(
        main()
    )