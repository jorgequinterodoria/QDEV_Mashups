import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  getDesktopApi,
  isDesktopRuntime
} from "./desktop";

import type {
  DesktopRuntimeInfo,
  LibraryScanResult,
  PreviewResult
} from "./desktop";

import { applySpanishDocumentLocale } from "./ui/locale";

type View =
  | "overview"
  | "library"
  | "discovery"
  | "builder"
  | "preview"
  | "dj";

interface Candidate {
  baseTrackPath: string;
  secondaryTrackPath: string;
  title: string;
  artist: string;
  secondaryTitle: string;
  secondaryArtist: string;
  score: number;
  bpm: string;
  secondaryBpm: string;
  key: string;
  secondaryKey: string;
  targetBpm: number | null;
  targetKey: string | null;
  grade: string;
  confidence: string;
  type:
    | "vocal"
    | "instrumental"
    | "hybrid";
}

interface DiscoveryLibraryScanResult
  extends LibraryScanResult {
  discoveryCandidates: Candidate[];
  discoveryPairsEvaluated: number;
  discoveryTracksAnalyzed: number;
}

const waveform =
  Array.from(
    {
      length: 84
    },
    (_, index) =>
      24 +
      Math.round(
        Math.abs(
          Math.sin(
            index * 0.72
          )
        ) * 54
      )
  );

function App() {
  useEffect(() => {
    applySpanishDocumentLocale();
  }, []);
  const [view, setView] =
    useState<View>(
      "overview"
    );

  const [candidates, setCandidates] =
    useState<Candidate[]>([]);

  const [selected, setSelected] =
    useState<Candidate | null>(
      null
    );

  const [
    libraryRoot,
    setLibraryRoot
  ] = useState<string | null>(
    null
  );

  const [
    library,
    setLibrary
  ] = useState<
    DiscoveryLibraryScanResult | null
  >(null);

  const [
    runtime,
    setRuntime
  ] = useState<
    DesktopRuntimeInfo | null
  >(null);

  const [
    busy,
    setBusy
  ] = useState(false);

  const [
    status,
    setStatus
  ] = useState(
    isDesktopRuntime()
      ? "Motor de escritorio listo"
      : "Previsualización del navegador"
  );

  const [
    error,
    setError
  ] = useState<
    string | null
  >(null);

  const [
    preview,
    setPreview
  ] = useState<
    PreviewResult | null
  >(null);

  const [fullMashup, setFullMashup] =
    useState<PreviewResult | null>(null);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  const desktop =
    getDesktopApi();

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    []
  );

  useEffect(
    () => {
      if (
        desktop === null
      ) {
        return;
      }

      void desktop
        .getRuntimeInfo()
        .then(
          setRuntime
        )
        .catch(
          () => {
            setStatus(
              "Motor de ejecución no disponible"
            );
          }
        );
    },
    [desktop]
  );

  const selectCandidate = (
    candidate: Candidate
  ) => {
    setSelected(
      candidate
    );

    setView(
      "builder"
    );

    setError(
      null
    );
  };

  const chooseAndScanLibrary =
    async () => {
      if (
        desktop === null
      ) {
        setError(
          "Ejecuta la aplicación de escritorio con `pnpm desktop` para acceder a tu biblioteca local."
        );

        return;
      }

      setBusy(true);
      setError(null);
      setStatus(
        "Selecciona tu biblioteca musical…"
      );

      try {
        const chosen =
          await desktop.chooseLibrary();

        if (
          chosen === null
        ) {
          setStatus(
            "Selección de biblioteca cancelada"
          );
          return;
        }

        setLibraryRoot(
          chosen
        );

        setStatus(
          "Escaneando la biblioteca musical…"
        );

        const result =
          await desktop.scanLibrary(
            chosen
          );

        const discoveryResult =
          result as DiscoveryLibraryScanResult;

        setLibrary(
          discoveryResult
        );

        setCandidates(
          discoveryResult.discoveryCandidates
        );

        setSelected(
          discoveryResult.discoveryCandidates[0] ??
          null
        );

        setStatus(
          discoveryResult.discoveryCandidates.length > 0
            ? `Library ready · ${formatNumber(
                discoveryResult.tracks
              )} tracks · ${formatNumber(
                discoveryResult.discoveryCandidates.length
              )} strong matches`
            : `Library ready · ${formatNumber(
                discoveryResult.tracks
              )} tracks · no strong matches in sample`
        );

        setView(
          "library"
        );
      } catch (
        cause
      ) {
        const message =
          cause instanceof Error
            ? cause.message
            : String(
                cause
              );

        setError(
          message
        );

        setStatus(
          "El escaneo de la biblioteca falló"
        );
      } finally {
        setBusy(false);
      }
    };

  const createRealPreview =
    async () => {
      if (
        desktop === null
      ) {
        setError(
          "La generación de previsualizaciones está disponible en la aplicación de escritorio."
        );

        return;
      }

      setBusy(true);
      setError(null);
      setPreview(null);
      setFullMashup(null);

      try {
        let files:
          [string, string];

        if (
          selected !== null &&
          selected.baseTrackPath &&
          selected.secondaryTrackPath
        ) {
          files = [
            selected.baseTrackPath,
            selected.secondaryTrackPath
          ];

          setStatus(
            "Analizando la combinación seleccionada…"
          );
        } else {
          setStatus(
            "Selecciona dos pistas de audio…"
          );

          const chosen =
            await desktop.chooseAudioFiles();

          if (
            chosen.length !== 2
          ) {
            setStatus(
              "Previsualización cancelada"
            );

            return;
          }

          files = [
            chosen[0],
            chosen[1]
          ];
        }

        audioRef.current?.pause();
        audioRef.current = null;
        setIsPlaying(false);

        const result =
          await desktop.createPreview(
            files[0],
            files[1]
          );

        setPreview(
          result
        );

        setStatus(
          "Previsualización generada correctamente"
        );

        setView(
          "preview"
        );
      } catch (
        cause
      ) {
        const message =
          cause instanceof Error
            ? cause.message
            : String(
                cause
              );

        setError(
          message
        );

        setStatus(
          "La previsualización falló"
        );
      } finally {
        setBusy(false);
      }
    };

  const togglePlayback =
    async (
      output: PreviewResult,
      outputLabel: string
    ) => {
      if (
        audioRef.current !== null
      ) {
        if (!audioRef.current.paused) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
          return;
        }

        try {
          await audioRef.current.play();
          setIsPlaying(true);
          setStatus(
            `Playing ${outputLabel} · system audio output`
          );
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : String(cause);
          setError(
            `No se pudo reproducir ${outputLabel}: ${message}`
          );
          setStatus(
            "La reproducción falló"
          );
        }

        return;
      }

      if (desktop === null) {
        setError(
          "La reproducción local está disponible en la aplicación de escritorio."
        );
        return;
      }

      try {
        const audioUrl =
          await desktop.getAudioUrl(
            output.outputPath
          );

        const audio =
          new Audio(audioUrl);
        audio.preload = "auto";

        audio.addEventListener(
          "ended",
          () => {
            setIsPlaying(false);
            audioRef.current = null;
          }
        );

        audio.addEventListener(
          "error",
          () => {
            setIsPlaying(false);
            setError(
              `No se pudo decodificar o reproducir el ${outputLabel}.`
            );
            setStatus(
              "La reproducción falló"
            );
            audioRef.current = null;
          }
        );

        audioRef.current = audio;
        await audio.play();
        setIsPlaying(true);
        setStatus(
          `Playing ${outputLabel} · system audio output`
        );
      } catch (cause) {
        audioRef.current = null;
        setIsPlaying(false);
        const message =
          cause instanceof Error
            ? cause.message
            : String(cause);
        setError(
          `No se pudo reproducir ${outputLabel}: ${message}`
        );
        setStatus(
          "La reproducción falló"
        );
      }
    };

  const renderFullMashup =
    async () => {
      if (
        desktop === null
      ) {
        setError(
          "La generación del mashup completo está disponible en la aplicación de escritorio."
        );
        return;
      }

      if (
        preview === null
      ) {
        setError(
          "Genera primero la previsualización para preparar el plan final."
        );
        return;
      }

      setBusy(true);
      setError(null);
      audioRef.current?.pause();
      audioRef.current = null;
      setIsPlaying(false);
      setStatus(
        "Generando el mashup completo…"
      );

      try {
        const result =
          await desktop.createFullMashup(
            preview.planId
          );

        setFullMashup(
          result
        );
        setStatus(
          "Mashup completo generado correctamente"
        );
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : String(cause);

        setError(
          message
        );
        setStatus(
          "La generación del mashup completo falló"
        );
      } finally {
        setBusy(false);
      }
    };


  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            Q
          </div>

          <div>
            <div className="brand-name">
              QDEV
            </div>

            <div className="brand-subtitle">
              MASHUPS
            </div>
          </div>
        </div>

        <div className="workspace-card">
          <span className="workspace-dot" />

          <div>
            <strong>
              {isDesktopRuntime()
                ? "Motor de escritorio"
                : "Previsualización del navegador"}
            </strong>

            <span>
              {runtime === null
                ? status
                : `Electron ${runtime.electronVersion}`}
            </span>
          </div>
        </div>

        <nav className="nav">
          {[
            [
              "overview",
              "Inicio",
              "⌂"
            ],
            [
              "library",
              "Biblioteca",
              "♫"
            ],
            [
              "discovery",
              "Descubrimiento",
              "✦"
            ],
            [
              "builder",
              "Constructor",
              "◈"
            ],
            [
              "preview",
              "Estudio de previsualización",
              "▶"
            ],
            [
              "dj",
              "Preparación DJ",
              "◎"
            ]
          ].map(
            ([
              key,
              label,
              icon
            ]) => (
              <button
                key={key}
                className={
                  view === key
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() => {
                  const nextView =
                    key as View;

                  if (
                    selected === null &&
                    (
                      nextView === "builder" ||
                      nextView === "preview" ||
                      nextView === "dj"
                    )
                  ) {
                    setSelected(
                      candidates[0] ??
                      null
                    );
                  }

                  setView(
                    nextView
                  );
                }}
              >
                <span className="nav-icon">
                  {icon}
                </span>

                <span>
                  {label}
                </span>
              </button>
            )
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="engine-status">
            <span className="status-pulse" />

            <span>
              {status}
            </span>

            <strong>
              {busy
                ? "Procesando"
                : "Listo"}
            </strong>
          </div>

          <div className="version">
            QDEV Mashups ·
            v0.1.0
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              QDEV Mashups
              <span>/</span>
              {labelForView(
                view
              )}
            </div>

            <h1>
              {titleForView(
                view
              )}
            </h1>
          </div>

          <div className="topbar-actions">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={
                chooseAndScanLibrary
              }
            >
              <span>
                ↻
              </span>

              {library === null
                ? "Escanear biblioteca"
                : "Volver a escanear"}
            </button>

            <div className="profile">
              <div className="profile-avatar">
                Q
              </div>

              <div>
                <strong>
                  Local Workspace
                </strong>

                <span>
                  {runtime === null
                    ? "Motor de escritorio"
                    : `${runtime.platform} · ${runtime.arch}`}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          {error !== null && (
            <div className="error-banner">
              <strong>
                Operation failed
              </strong>

              <span>
                {error}
              </span>

              <button
                onClick={() =>
                  setError(
                    null
                  )
                }
              >
                ×
              </button>
            </div>
          )}

          {view ===
            "overview" && (
            <Overview
              library={
                library
              }
              setView={
                setView
              }
              candidates={
                candidates
              }
              onSelect={
                selectCandidate
              }
              onScan={
                chooseAndScanLibrary
              }
              onPreview={
                createRealPreview
              }
              busy={
                busy
              }
            />
          )}

          {view ===
            "library" && (
            <LibraryView
              library={
                library
              }
              libraryRoot={
                libraryRoot
              }
              onScan={
                chooseAndScanLibrary
              }
              busy={
                busy
              }
            />
          )}

          {view ===
            "discovery" && (
            <DiscoveryView
              candidates={
                candidates
              }
              onSelect={
                selectCandidate
              }
            />
          )}

          {view ===
            "builder" && (
            selected === null
              ? (
                <SelectionRequiredView
                  title="Selecciona primero una combinación compatible."
                  setView={
                    setView
                  }
                />
              )
              : (
                <BuilderView
                  candidate={
                    selected
                  }
                  setView={
                    setView
                  }
                  onPreview={
                    createRealPreview
                  }
                  busy={
                    busy
                  }
                />
              )
          )}

          {view ===
            "preview" && (
            selected === null
              ? (
                <SelectionRequiredView
                  title="Selecciona una combinación antes de abrir el estudio de previsualización."
                  setView={
                    setView
                  }
                />
              )
              : (
                <PreviewView
                  candidate={
                    selected
                  }
                  preview={
                    preview
                  }
                  fullMashup={
                    fullMashup
                  }
                  isPlaying={
                    isPlaying
                  }
                  onPlay={(output) =>
                    togglePlayback(
                      output,
                      output.kind === "full"
                        ? "mashup completo"
                        : "preview"
                    )
                  }
                  onRender={
                    createRealPreview
                  }
                  onRenderFull={
                    renderFullMashup
                  }
                  onReveal={
                    async (output) => {
                      if (
                        desktop !==
                          null
                      ) {
                        await desktop.revealOutput(
                          output.outputPath
                        );
                      }
                    }
                  }
                  busy={
                    busy
                  }
                />
              )
          )}

          {view === "dj" && (
            selected === null
              ? (
                <SelectionRequiredView
                  title="Selecciona una combinación antes de abrir la preparación DJ."
                  setView={
                    setView
                  }
                />
              )
              : (
                <DJView
                  candidate={
                    selected
                  }
                  setView={
                    setView
                  }
                />
              )
          )}
        </div>
      </main>
    </div>
  );
}

function Overview({
  library,
  setView,
  candidates,
  onSelect,
  onScan,
  onPreview,
  busy
}: {
  library:
    LibraryScanResult | null;
  setView: (
    value: View
  ) => void;
  candidates: Candidate[];
  onSelect: (
    candidate: Candidate
  ) => void;
  onScan: () => void;
  onPreview: () => void;
  busy: boolean;
}) {
  return (
    <>
      <section className="hero-grid">
        <div className="hero-card">
          <div className="eyebrow">
            MASHUP INTELLIGENCE
          </div>

          <h2>
            Discover the
            <br />
            perfect combination.
          </h2>

          <p>
            QDEV analyzes your
            local music library,
            calculates compatibility
            and prepares real mashup
            previews.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              disabled={busy}
              onClick={() =>
                setView(
                  "discovery"
                )
              }
            >
              Find Mashups
              <span>
                →
              </span>
            </button>

            <button
              className="ghost-button"
              onClick={
                onPreview
              }
            >
              Create Real Preview
            </button>
          </div>

          <div className="hero-foot">
            <span className="signal">
              <i />
              Local processing
            </span>

            <span>
              No cloud upload
            </span>
          </div>
        </div>

        <div className="hero-side">
          <div className="mini-card">
            <span>
              Library
            </span>

            <strong>
              {library === null
                ? "Listo"
                : formatNumber(
                    library.tracks
                  )}
            </strong>

            <small>
              {library === null
                ? "Selecciona una carpeta"
                : "pistas de audio encontradas"}
            </small>
          </div>

          <div className="mini-card accent">
            <span>
              Candidates
            </span>

            <strong>
              {formatNumber(
                candidates.length
              )}
            </strong>

            <small>
              strong matches
            </small>
          </div>

          <div className="mini-card">
            <span>
              Engine
            </span>

            <strong>
              Local
            </strong>

            <small>
              Node + Electron
            </small>
          </div>
        </div>
      </section>

      <section className="section-header">
        <div>
          <span className="eyebrow">
            WORKFLOW
          </span>

          <h3>
            Start with your library
          </h3>
        </div>

        <button
          className="text-button"
          onClick={
            onScan
          }
        >
          Scan Library →
        </button>
      </section>

      {candidates.length === 0 ? (
        <div className="library-panel">
          <div>
            <span className="eyebrow">
              READY
            </span>

            <h3>
              Scan your library to generate real mashup candidates.
            </h3>

            <p>
              Candidate scores are not hardcoded. They are produced
              from the local audio intelligence and compatibility
              engine after the library scan.
            </p>
          </div>
        </div>
      ) : (
        <div className="candidate-grid">
          {candidates.map(
            (
              candidate
            ) => (
              <CandidateCard
                key={
                  `${candidate.baseTrackPath}:${candidate.secondaryTrackPath}`
                }
                candidate={
                  candidate
                }
                onClick={() =>
                  onSelect(
                    candidate
                  )
                }
              />
            )
          )}
        </div>
      )}

      <section className="architecture-strip">
        {[
          [
            "01",
            "Analizar",
            "BPM · Tonalidad"
          ],
          [
            "02",
            "Descubrir",
            "Compatibilidad"
          ],
          [
            "03",
            "Construir",
            "Tempo · Roles"
          ],
          [
            "04",
            "Generar",
            "Previsualización · WAV"
          ],
          [
            "05",
            "Preparación DJ",
            "Beatgrid · Cues"
          ]
        ].map(
          (
            item,
            index
          ) => (
            <div
              key={
                item[0]
              }
            >
              <span className="strip-number">
                {item[0]}
              </span>

              <strong>
                {item[1]}
              </strong>

              <small>
                {item[2]}
              </small>

              {index <
                4 && (
                <span className="strip-arrow">
                  →
                </span>
              )}
            </div>
          )
        )}
      </section>
    </>
  );
}

function CandidateCard({
  candidate,
  onClick
}: {
  candidate: Candidate;
  onClick: () => void;
}) {
  return (
    <button
      className="candidate-card"
      onClick={
        onClick
      }
    >
      <div className="candidate-cover">
        <span>
          {candidate.artist[0]}
        </span>
      </div>

      <div className="candidate-body">
        <div className="candidate-topline">
          <span className="score">
            {candidate.score}
          </span>

          <span
            className={`role ${candidate.type}`}
          >
            {candidate.type}
          </span>
        </div>

        <strong>
          {candidate.title}
        </strong>

        <span>
          {candidate.artist}
          {" × "}
          {candidate.secondaryTitle}
        </span>

        <div className="candidate-meta">
          <span>
            {candidate.bpm}
          </span>

          <span>
            {candidate.key}
          </span>

          <span>
            {candidate.grade}
          </span>
        </div>
      </div>

      <span className="candidate-arrow">
        →
      </span>
    </button>
  );
}

function LibraryView({
  library,
  libraryRoot,
  onScan,
  busy
}: {
  library:
    LibraryScanResult | null;
  libraryRoot:
    string | null;
  onScan: () => void;
  busy: boolean;
}) {
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">
            LOCAL LIBRARY
          </span>

          <h2>
            Your music,
            <br />
            understood.
          </h2>

          <p>
            The desktop runtime scans
            your actual music directory
            without copying the source
            files.
          </p>
        </div>

        <button
          className="primary-button"
          disabled={busy}
          onClick={
            onScan
          }
        >
          Scan Library
          <span>
            →
          </span>
        </button>
      </div>

      <div className="metric-grid">
        <Metric
          label="Pistas"
          value={
            library === null
              ? "—"
              : formatNumber(
                  library.tracks
                )
          }
        />

        <Metric
          label="Tamaño de biblioteca"
          value={
            library === null
              ? "—"
              : formatBytes(
                  library.totalBytes
                )
          }
        />

        <Metric
          label="Motor"
          value="Local"
        />

        <Metric
          label="Estado"
          value={
            library === null
              ? "Listo"
              : "Escaneada"
          }
        />
      </div>

      <div className="library-panel">
        <div>
          <span className="eyebrow">
            SOURCE
          </span>

          <h3>
            Music Library
          </h3>

          <p>
            {libraryRoot ??
              "No hay carpeta seleccionada"}
          </p>

          {library !== null && (
            <small>
              {formatNumber(
                library.discoveryTracksAnalyzed
              )} tracks analyzed ·{" "}
              {formatNumber(
                library.discoveryPairsEvaluated
              )} pairs evaluated
            </small>
          )}
        </div>

        <div className="library-status">
          <span className="status-badge ready">
            {library === null
              ? "LISTO"
              : "ESCANEADA"}
          </span>
        </div>
      </div>
    </div>
  );
}

function DiscoveryView({
  candidates,
  onSelect
}: {
  candidates: Candidate[];
  onSelect: (
    candidate: Candidate
  ) => void;
}) {
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">
            DISCOVERY
          </span>

          <h2>
            Best matches
          </h2>

          <p>
            Ranked combinations from
            tempo, harmonic, energy,
            vocal and structure
            compatibility.
          </p>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="library-panel">
          <div>
            <span className="eyebrow">
              DISCOVERY
            </span>

            <h3>
              No strong matches yet.
            </h3>

            <p>
              Scan the library again to analyze
              a real sample of tracks. QDEV only
              shows compatibility scores produced
              by the local intelligence engine.
            </p>
          </div>
        </div>
      ) : (
        <div className="discovery-list">
          {candidates.map(
            (
              candidate,
              index
            ) => (
              <button
                key={
                  `${candidate.baseTrackPath}:${candidate.secondaryTrackPath}`
                }
                className="discovery-row"
                onClick={() =>
                  onSelect(
                    candidate
                  )
                }
              >
                <span className="rank">
                  {String(
                    index + 1
                  ).padStart(
                    2,
                    "0"
                  )}
                </span>

                <div className="discovery-art">
                  {candidate.artist[0] ?? "Q"}
                </div>

                <div className="discovery-info">
                  <strong>
                    {candidate.title}
                  </strong>

                  <span>
                    {candidate.artist}
                    {" × "}
                    {candidate.secondaryTitle}
                    {" · "}
                    {candidate.secondaryArtist}
                  </span>
                </div>

                <span className="discovery-bpm">
                  {candidate.bpm}
                </span>

                <span className="discovery-key">
                  {candidate.key}
                </span>

                <strong className="discovery-score">
                  {candidate.score}
                </strong>

                <span>
                  →
                </span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function SelectionRequiredView({
  title,
  setView
}: {
  title: string;
  setView: (
    value: View
  ) => void;
}) {
  return (
    <div className="workspace">
      <div className="library-panel">
        <div>
          <span className="eyebrow">
            MASHUP WORKFLOW
          </span>

          <h3>
            {title}
          </h3>

          <p>
            Open Mashup Discovery and select a
            real compatible pair generated from
            the current library.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() =>
            setView(
              "discovery"
            )
          }
        >
          Open Discovery
          <span>
            →
          </span>
        </button>
      </div>
    </div>
  );
}

function BuilderView({
  candidate,
  setView,
  onPreview,
  busy
}: {
  candidate: Candidate;
  setView: (
    value: View
  ) => void;
  onPreview: () => void;
  busy: boolean;
}) {
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">
            MASHUP BUILDER
          </span>

          <h2>
            Build a compatible
            <br />
            mashup.
          </h2>
        </div>

        <span className="large-score">
          {candidate.score}
          <small>
            /100
          </small>
        </span>
      </div>

      <div className="builder-grid">
        <TrackPanel
          label="BASE"
          title={
            candidate.title
          }
          artist={
            candidate.artist
          }
          bpm={
            candidate.bpm
          }
          keyLabel={
            candidate.key
          }
          role="BASE"
        />

        <div className="plus">
          +
        </div>

        <TrackPanel
          label="SECUNDARIA"
          title={
            candidate.secondaryTitle
          }
          artist={
            candidate.secondaryArtist
          }
          bpm={
            candidate.secondaryBpm
          }
          keyLabel={
            candidate.secondaryKey
          }
          role="VOCAL"
        />
      </div>

      <div className="build-result">
        <div>
          <span>
            TARGET BPM
          </span>

          <strong>
            {candidate.targetBpm !== null
              ? candidate.targetBpm
              : candidate.bpm}
          </strong>
        </div>

        <div>
          <span>
            TARGET KEY
          </span>

          <strong>
            {candidate.key}
          </strong>
        </div>

        <div>
          <span>
            TEMPO
          </span>

          <strong>
            Automatic
          </strong>
        </div>

        <div>
          <span>
            SOURCE
          </span>

          <strong>
            Local
          </strong>
        </div>
      </div>

      <div className="builder-actions">
        <span>
          Build plan ready
        </span>

        <div
          style={{
            display:
              "flex",
            gap:
              "9px"
          }}
        >
          <button
            className="secondary-button"
            onClick={() =>
              setView(
                "preview"
              )
            }
          >
            Preview Studio
          </button>

          <button
            className="primary-button"
            disabled={
              busy
            }
            onClick={
              onPreview
            }
          >
            Render Real Preview
            <span>
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TrackPanel({
  label,
  title,
  artist,
  bpm,
  keyLabel,
  role
}: {
  label: string;
  title: string;
  artist: string;
  bpm: string;
  keyLabel: string;
  role: string;
}) {
  return (
    <div className="track-panel">
      <span className="panel-label">
        {label}
      </span>

      <h3>
        {title}
      </h3>

      <p>
        {artist}
      </p>

      <div className="parameter-grid">
        <Parameter
          label="BPM"
          value={bpm}
        />

        <Parameter
          label="KEY"
          value={keyLabel}
        />

        <Parameter
          label="ROLE"
          value={role}
        />
      </div>
    </div>
  );
}

function PreviewView({
  candidate,
  preview,
  fullMashup,
  isPlaying,
  onPlay,
  onRender,
  onRenderFull,
  onReveal,
  busy
}: {
  candidate: Candidate;
  preview:
    PreviewResult | null;
  fullMashup:
    PreviewResult | null;
  isPlaying: boolean;
  onPlay: (
    output: PreviewResult
  ) => void | Promise<void>;
  onRender: () => void;
  onRenderFull: () => void;
  onReveal: (
    output: PreviewResult
  ) => void | Promise<void>;
  busy: boolean;
}) {
  const activeOutput =
    fullMashup ??
    preview;

  const activeKind =
    fullMashup !== null
      ? "MASHUP COMPLETO"
      : "PREVISUALIZACIÓN QDEV";

  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">
            PREVIEW STUDIO
          </span>

          <h2>
            Hear the idea
            <br />
            before you render it.
          </h2>

          <p>
            {activeOutput ===
              null
              ? `${candidate.title} × ${candidate.secondaryTitle}`
              : `${activeOutput.durationSeconds.toFixed(
                  1
                )} second ${activeOutput.kind === "full" ? "mashup completo" : "Previsualización WAV"}`}
          </p>
        </div>

        <div
          style={{
            display:
              "flex",
            gap:
              "9px",
            flexWrap:
              "wrap",
            justifyContent:
              "flex-end"
          }}
        >
          <button
            className={
              isPlaying
                ? "playing-button"
                : "secondary-button"
            }
            disabled={
              activeOutput === null
            }
            onClick={() => {
              if (
                activeOutput !== null
              ) {
                void onPlay(
                  activeOutput
                );
              }
            }}
          >
            {isPlaying
              ? "Detener"
              : "Reproducir"}
            <span>
              {isPlaying
                ? "■"
                : "▶"}
            </span>
          </button>

          <button
            className="secondary-button"
            disabled={
              busy ||
              preview === null
            }
            onClick={
              onRenderFull
            }
          >
            Render Full Mashup
            <span>
              ⇩
            </span>
          </button>

          <button
            className="primary-button"
            disabled={
              busy
            }
            onClick={
              onRender
            }
          >
            Render Preview
            <span>
              →
            </span>
          </button>
        </div>
      </div>

      <div className="wave-panel">
        <div className="wave-header">
          <span>
            {activeKind}
          </span>

          <span>
            {activeOutput ===
              null
              ? "Aún no hay render"
              : `${activeOutput.score}/100`}
          </span>
        </div>

        <div className="waveform">
          {waveform.map(
            (
              height,
              index
            ) => (
              <i
                key={index}
                className={
                  isPlaying
                    ? "wave-active"
                    : ""
                }
                style={{
                  height:
                    `${height}%`
                }}
              />
            )
          )}
        </div>

        <div className="timeline">
          <span>
            00:00
          </span>

          <span>
            00:05
          </span>

          <span>
            00:10
          </span>

          <span>
            00:20
          </span>

          <span>
            {fullMashup !== null
              ? formatDuration(
                  fullMashup.durationSeconds
                )
              : "00:30"}
          </span>
        </div>
      </div>

      <div className="preview-info">
        <PreviewMetric
          label="COMPATIBILIDAD"
          value={
            activeOutput === null
              ? `${candidate.score}/100`
              : `${activeOutput.score}/100`
          }
          detail={
            activeOutput?.grade ??
            candidate.grade
          }
        />

        <PreviewMetric
          label="BPM OBJETIVO"
          value={
            activeOutput?.targetBpm ===
              null ||
            activeOutput?.targetBpm ===
              undefined
              ? candidate.targetBpm !== null
                ? `${candidate.targetBpm} BPM`
                : candidate.bpm
              : `${activeOutput.targetBpm} BPM`
          }
          detail="Sincronizado"
        />

        <PreviewMetric
          label="TONALIDAD OBJETIVO"
          value={
            activeOutput?.targetKey ??
            candidate.targetKey ??
            candidate.key
          }
          detail="Plan armónico"
        />

        <PreviewMetric
          label="SALIDA"
          value="WAV"
          detail="Sin pérdida · 44.1 kHz estéreo"
        />
      </div>

      <div className="library-panel">
        <div>
          <span className="eyebrow">
            AUDIO OUTPUT
          </span>
          <h3>
            System audio output
          </h3>
          <p>
            Play uses macOS system audio output, including USB headphones selected as the active output device.
          </p>
        </div>
      </div>

      {preview !== null && (
        <div className="library-panel">
          <div>
            <span className="eyebrow">
              PREVIEW OUTPUT
            </span>

            <h3>
              Preview ready
            </h3>

            <p>
              {preview.outputPath}
            </p>

            <small>
              Plan {preview.planId}
            </small>
          </div>

          <div
            style={{
              display:
                "flex",
              gap:
                "9px",
              flexWrap:
                "wrap",
              justifyContent:
                "flex-end"
            }}
          >
            <button
              className="secondary-button"
              onClick={() =>
                void onPlay(
                  preview
                )
              }
            >
              Play Preview
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                void onReveal(
                  preview
                )
              }
            >
              Reveal Preview
            </button>
          </div>
        </div>
      )}

      {fullMashup !== null && (
        <div className="library-panel">
          <div>
            <span className="eyebrow">
              FULL MASHUP
            </span>

            <h3>
              Full mashup saved
            </h3>

            <p>
              {fullMashup.outputPath}
            </p>

            <small>
              {formatDuration(
                fullMashup.durationSeconds
              )} · Plan {fullMashup.planId}
            </small>
          </div>

          <div
            style={{
              display:
                "flex",
              gap:
                "9px",
              flexWrap:
                "wrap",
              justifyContent:
                "flex-end"
            }}
          >
            <button
              className="secondary-button"
              onClick={() =>
                void onPlay(
                  fullMashup
                )
              }
            >
              Play Full Mashup
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                void onReveal(
                  fullMashup
                )
              }
            >
              Reveal in Finder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="preview-card">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {detail}
      </small>
    </div>
  );
}

function DJView({
  candidate,
  setView
}: {
  candidate: Candidate;
  setView: (
    value: View
  ) => void;
}) {
  return (
    <div className="workspace">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">
            DJ PREPARATION
          </span>

          <h2>
            Ready for the deck.
          </h2>

          <p>
            Beatgrid, cue points,
            loops and transition
            guidance.
          </p>
        </div>

        <span className="ready-pill">
          SESSION READY
        </span>
      </div>

      <div className="dj-grid">
        <DJTrack
          label="BASE"
          title={
            candidate.title
          }
          artist={
            candidate.artist
          }
          color="base"
        />

        <DJTrack
          label="VOCAL"
          title={
            candidate.secondaryTitle
          }
          artist={
            candidate.secondaryArtist
          }
          color="vocal"
        />
      </div>

      <div className="dj-summary">
        <div>
          <span>
            TARGET
          </span>

          <strong>
            {candidate.targetBpm !== null
              ? `${candidate.targetBpm} BPM`
              : candidate.bpm}
          </strong>
        </div>

        <div>
          <span>
            KEY
          </span>

          <strong>
            {candidate.key}
          </strong>
        </div>

        <div>
          <span>
            SCORE
          </span>

          <strong>
            {candidate.score}
            /100
          </strong>
        </div>

        <button
          className="secondary-button"
          onClick={() =>
            setView(
              "preview"
            )
          }
        >
          Back to Preview
        </button>
      </div>
    </div>
  );
}

function DJTrack({
  label,
  title,
  artist,
  color
}: {
  label: string;
  title: string;
  artist: string;
  color:
    | "base"
    | "vocal";
}) {
  return (
    <div className="dj-track">
      <div className="dj-track-head">
        <div
          className={
            color ===
            "base"
              ? "dj-disc"
              : "dj-disc secondary-disc"
          }
        >
          {label[0]}
        </div>

        <div>
          <span>
            {label}
          </span>

          <strong>
            {title}
          </strong>

          <small>
            {artist}
          </small>
        </div>
      </div>

      <div
        className={
          color ===
          "base"
            ? "dj-wave"
            : "dj-wave second"
        }
      >
        {Array.from(
          {
            length: 46
          },
          (_, index) => (
            <i
              key={index}
              style={{
                height:
                  `${25 + (
                    index *
                    (
                      color ===
                      "base"
                        ? 19
                        : 31
                    )
                  ) %
                    70}%`
              }}
            />
          )
        )}
      </div>

      <div className="cue-row">
        <span>
          01 Start
        </span>

        <span>
          02 Mix In
        </span>

        <span>
          03 Phrase
        </span>

        <span>
          04 Mix Out
        </span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function Parameter({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function labelForView(
  view: View
): string {
  const labels: Record<
    View,
    string
  > = {
    overview:
      "Inicio",
    library:
      "Biblioteca",
    discovery:
      "Descubrimiento",
    builder:
      "Constructor",
    preview:
      "Estudio de previsualización",
    dj:
      "Preparación DJ"
  };

  return labels[
    view
  ];
}

function titleForView(
  view: View
): string {
  const titles: Record<
    View,
    string
  > = {
    overview:
      "Centro de control de mashups",
    library:
      "Biblioteca musical",
    discovery:
      "Encuentra tu próxima combinación",
    builder:
      "Construye una combinación compatible",
    preview:
      "Estudio de previsualización",
    dj:
      "Preparación DJ"
  };

  return titles[
    view
  ];
}

function formatNumber(
  value: number
): string {
  return new Intl.NumberFormat(
    "es-CO"
  ).format(
    value
  );
}

function formatDuration(
  seconds: number
): string {
  const totalSeconds =
    Math.max(
      0,
      Math.round(seconds)
    );
  const hours =
    Math.floor(
      totalSeconds / 3600
    );
  const minutes =
    Math.floor(
      (totalSeconds % 3600) /
      60
    );
  const remainder =
    totalSeconds % 60;

  if (hours > 0) {
    return `${String(
      hours
    ).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(
      remainder
    ).padStart(2, "0")}`;
  }

  return `${String(
    minutes
  ).padStart(2, "0")}:${String(
    remainder
  ).padStart(2, "0")}`;
}

function formatBytes(
  bytes: number
): string {
  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
    "PB"
  ];

  let value =
    bytes;

  let index = 0;

  while (
    value >= 1024 &&
    index <
      units.length - 1
  ) {
    value /=
      1024;
    index += 1;
  }

  return `${value.toFixed(
    index === 0
      ? 0
      : 1
  )} ${units[index]}`;
}

export default App;