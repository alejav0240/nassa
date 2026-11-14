"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  BarChart3,
  CloudRain,
  Earth,
  FlaskConical,
  Leaf,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  LoaderCircle,
  Droplets,
  Layers3,
  ExternalLink,
  Info,
} from "lucide-react";
import { ClimateChart } from "@/components/ClimateChart";
import { api, type Analysis, type Crop, type FieldInput } from "@/lib/api";
const FarmMap = dynamic(
  () => import("@/components/FarmMap").then((m) => m.FarmMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 bg-green-50 animate-pulse rounded-2xl" />
    ),
  },
);
const cropOptions: [Crop, string][] = [
  ["papa", "Papa"],
  ["quinua", "Quinua"],
  ["haba", "Haba"],
  ["cebada", "Cebada"],
  ["avena", "Avena"],
  ["tarwi", "Tarwi"],
];
const initial: FieldInput = {
  name: "Parcela piloto — Viacha",
  latitude: -16.65,
  longitude: -68.3,
  hectares: 2.5,
  soil_texture: "desconocida",
  irrigation: false,
  current_crop: "papa",
  soil_ph: null,
};
export default function Home() {
  const [field, setField] = useState<FieldInput>(initial);
  const [priorities, setPriorities] = useState({
    water: 45,
    soil: 40,
    income: 15,
  });
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"analysis" | "method">("analysis");
  const update = <K extends keyof FieldInput>(k: K, value: FieldInput[K]) =>
    setField((prev) => ({ ...prev, [k]: value }));
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const created = await api<{ id: number }>("/fields", {
        method: "POST",
        body: JSON.stringify(field),
      });
      const result = await api<Analysis>("/analyze", {
        method: "POST",
        body: JSON.stringify({ field_id: created.id, priorities }),
      });
      setAnalysis(result);
      setTab("analysis");
      document
        .getElementById("results")
        ?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="bg-[#102e25] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 py-4 sm:h-[76px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-[#267d59] shrink-0">
              <Leaf size={25} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xl tracking-tight display leading-none">
                AgroShift <span className="text-[#91e3b4]">AI</span>
              </div>
              <div className="hidden sm:block text-[10px] tracking-[.18em] uppercase text-green-200 mt-1 truncate">
                Earth data for resilient farming
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm text-green-100 shrink-0">
            <Earth size={16} /> NASA Space Apps 2026{" "}
            <span className="ml-3 bg-white/10 px-3 py-1 rounded-full">
              Altiplano boliviano
            </span>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-7 space-y-5 sm:space-y-6">
        <div className="rounded-[22px] sm:rounded-[24px] p-5 sm:p-7 md:p-10 text-white bg-gradient-to-r from-[#176044] to-[#298663] relative overflow-hidden">
          <div className="absolute -right-20 -top-24 w-64 h-64 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 uppercase tracking-[.16em] text-[10px] sm:text-xs font-bold text-[#a8edc7]">
              <span className="h-2 w-2 bg-[#c4f49c] rounded-full shrink-0" />{" "}
              Inteligencia agrícola explicable
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-[42px] font-bold leading-tight max-w-2xl mt-3">
              Cada parcela tiene una historia.
              <br className="hidden sm:block" /> Los datos ayudan a decidir su
              futuro.
            </h1>
            <p className="text-green-50/90 max-w-2xl mt-3 text-sm md:text-base leading-6">
              Explora observaciones climáticas de NASA y compara tres
              estrategias de rotación agrícola con riesgos e incertidumbres
              visibles.
            </p>
            <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6 flex-wrap">
              <span className="bg-white/15 border border-white/10 rounded-full px-3 py-1.5 text-xs">
                NASA POWER
              </span>
              <span className="bg-white/15 border border-white/10 rounded-full px-3 py-1.5 text-xs">
                3 escenarios
              </span>
              <span className="bg-white/15 border border-white/10 rounded-full px-3 py-1.5 text-xs">
                Análisis trazable
              </span>
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-[1.25fr_.75fr] gap-5 items-start">
          <section className="panel p-4 sm:p-5 md:p-6">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div>
                <p className="small-label">Paso 01 / Ubicación</p>
                <h2 className="text-xl font-bold mt-1">
                  Selecciona tu parcela
                </h2>
              </div>
              <div className="rounded-xl p-2.5 bg-green-50 text-[#228358] shrink-0">
                <MapPin size={23} />
              </div>
            </div>
            <FarmMap
              latitude={field.latitude}
              longitude={field.longitude}
              onPick={(lat, lng) =>
                setField((f) => ({ ...f, latitude: lat, longitude: lng }))
              }
            />
            <p className="text-xs text-slate-500 mt-3 flex items-start gap-2 leading-5">
              <Info size={14} className="mt-0.5 shrink-0" /> Haz clic en el mapa
              o edita las coordenadas. El punto representa la ubicación de
              referencia, no el perímetro real.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <label className="text-xs font-semibold text-slate-600">
                Latitud
                <input
                  className="field mt-1"
                  type="number"
                  step="0.00001"
                  min="-90"
                  max="90"
                  value={field.latitude}
                  onChange={(e) => update("latitude", Number(e.target.value))}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Longitud
                <input
                  className="field mt-1"
                  type="number"
                  step="0.00001"
                  min="-180"
                  max="180"
                  value={field.longitude}
                  onChange={(e) => update("longitude", Number(e.target.value))}
                />
              </label>
            </div>
          </section>
          <section className="panel p-4 sm:p-5 md:p-6">
            <div className="flex justify-between items-start mb-4 gap-3">
              <div>
                <p className="small-label">Paso 02 / Contexto</p>
                <h2 className="text-xl font-bold mt-1">Conoce tu terreno</h2>
              </div>
              <div className="p-2.5 bg-green-50 text-[#228358] rounded-xl shrink-0">
                <Layers3 size={23} />
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">
                Nombre de la parcela
                <input
                  className="field mt-1"
                  value={field.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-600">
                  Superficie (ha)
                  <input
                    className="field mt-1"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={field.hectares}
                    onChange={(e) => update("hectares", Number(e.target.value))}
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Cultivo actual
                  <select
                    className="field mt-1"
                    value={field.current_crop}
                    onChange={(e) =>
                      update("current_crop", e.target.value as Crop)
                    }
                  >
                    {cropOptions.map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-600">
                  Textura del suelo
                  <select
                    className="field mt-1"
                    value={field.soil_texture}
                    onChange={(e) => update("soil_texture", e.target.value)}
                  >
                    <option value="desconocida">Desconocida</option>
                    <option value="arenosa">Arenosa</option>
                    <option value="franca">Franca</option>
                    <option value="arcillosa">Arcillosa</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  pH del suelo (opcional)
                  <input
                    className="field mt-1"
                    type="number"
                    min="3"
                    max="10"
                    step="0.1"
                    placeholder="Sin análisis"
                    value={field.soil_ph ?? ""}
                    onChange={(e) =>
                      update(
                        "soil_ph",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </label>
              </div>
              <label className="flex items-center gap-3 text-sm p-3 bg-[#f5f8f4] rounded-xl min-h-11">
                <input
                  type="checkbox"
                  checked={field.irrigation}
                  onChange={(e) => update("irrigation", e.target.checked)}
                  className="accent-green-700 h-4 w-4"
                />{" "}
                Tengo acceso a riego
              </label>
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <p className="small-label">Paso 03 / Prioridades</p>
                </div>
                {(
                  [
                    ["water", "Ahorrar agua"],
                    ["soil", "Mejorar el suelo"],
                    ["income", "Viabilidad comercial"],
                  ] as const
                ).map(([key, label]) => (
                  <div className="mb-3" key={key}>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span>{label}</span>
                      <span className="text-[#20835b]">{priorities[key]}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      aria-label={label}
                      className="w-full accent-[#267f58]"
                      value={priorities[key]}
                      onChange={(e) =>
                        setPriorities((p) => ({
                          ...p,
                          [key]: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={run}
                disabled={
                  busy ||
                  !Object.values(priorities).some(Boolean) ||
                  field.hectares <= 0 ||
                  field.name.trim().length < 2
                }
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />{" "}
                    Consultando NASA...
                  </>
                ) : (
                  <>
                    Analizar estrategias <ArrowRight size={18} />
                  </>
                )}
              </button>
              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-800 text-sm mt-2"
                >
                  {error}
                </div>
              )}
              <p className="text-[11px] text-slate-500 leading-4">
                Datos NASA reales; la primera consulta puede tardar. Sin NASA
                disponible, no fabricamos resultados.
              </p>
            </div>
          </section>
        </div>
        <section id="results" className="space-y-5 scroll-mt-5">
          {analysis ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <p className="small-label">
                    Resultado / Observaciones + heurísticas
                  </p>
                  <h2 className="text-2xl font-bold mt-1">
                    Diagnóstico de la parcela
                  </h2>
                </div>
                <div className="flex w-full sm:w-auto p-1 bg-white rounded-xl border border-green-100">
                  <button
                    onClick={() => setTab("analysis")}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 rounded-lg text-sm font-semibold ${tab === "analysis" ? "bg-[#196c4b] text-white" : "text-slate-600"}`}
                  >
                    Análisis
                  </button>
                  <button
                    onClick={() => setTab("method")}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 rounded-lg text-sm font-semibold ${tab === "method" ? "bg-[#196c4b] text-white" : "text-slate-600"}`}
                  >
                    Método y límites
                  </button>
                </div>
              </div>
              {tab === "analysis" ? (
                <>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Metric
                      title="Precipitación media anual"
                      value={`${analysis.climate.annual_rainfall_mm} mm`}
                      detail={`${analysis.climate.years[0]}–${analysis.climate.years[1]} · NASA POWER`}
                      icon={<CloudRain size={20} />}
                    />
                    <Metric
                      title="Temperatura media"
                      value={`${analysis.climate.mean_temperature_c} °C`}
                      detail="Media aproximada de promedios mensuales"
                      icon={<Earth size={20} />}
                    />
                    <Metric
                      title="Días con mínima < 0 °C"
                      value={`${analysis.climate.annual_frost_days}`}
                      detail="Media anual · proxy de heladas"
                      icon={<ShieldAlert size={20} />}
                    />
                  </div>
                  <div className="panel p-4 sm:p-5 md:p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div>
                        <p className="small-label">
                          Serie histórica climatológica
                        </p>
                        <h3 className="text-lg font-bold">
                          Lluvia y temperatura mensuales
                        </h3>
                      </div>
                      <span className="text-xs bg-green-50 text-green-800 px-3 py-1.5 rounded-full font-semibold">
                        Fuente: NASA POWER
                      </span>
                    </div>
                    <ClimateChart monthly={analysis.climate.monthly} />
                    <p className="text-xs text-slate-500 mt-2 leading-5">
                      Promedios mensuales del período. No son pronósticos ni
                      mediciones directas del suelo.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <p className="small-label">Paso 04 / Alternativas</p>
                      <h3 className="text-2xl font-bold">
                        Tres estrategias de rotación
                      </h3>
                    </div>
                    <span className="self-start text-xs bg-amber-100 text-amber-900 px-3 py-2 rounded-full">
                      Puntajes heurísticos; no predicen rendimiento
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysis.strategies.map((s, i) => (
                      <article
                        key={s.id}
                        className={`panel p-4 sm:p-5 ${i === 0 ? "ring-2 ring-[#2c9367]" : ""}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="small-label">
                            {s.id === "actual"
                              ? "Referencia actual"
                              : `Alternativa ${s.id}`}
                          </span>
                          {i === 0 && (
                            <span className="text-[10px] text-[#126144] bg-green-100 py-1 px-2 rounded-full font-bold whitespace-nowrap">
                              Mayor puntuación
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-lg mt-3 sm:min-h-12">
                          {s.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-700 mt-3 flex-wrap">
                          {s.crops.map((c, n) => (
                            <span key={n} className="flex items-center gap-1">
                              {n > 0 && (
                                <ArrowRight
                                  size={12}
                                  className="text-green-500"
                                />
                              )}
                              <span className="rounded-md bg-[#eff8ee] px-2 py-1.5">
                                {c.label}
                              </span>
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-5 gap-2">
                          <span className="text-xs text-slate-500">
                            Puntuación multicriterio
                          </span>
                          <span className="text-2xl font-bold text-[#176c4b] shrink-0">
                            {s.score}
                            <small className="text-sm text-slate-400">
                              /100
                            </small>
                          </span>
                        </div>
                        <div className="h-2 bg-[#e6f0e7] rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-[#2c9367] h-full rounded-full"
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-600 mt-4 sm:min-h-12 leading-5">
                          {s.explanation}
                        </p>
                        <div className="border-t mt-4 pt-3">
                          <p className="text-xs font-bold text-amber-800 flex gap-1 items-center">
                            <ShieldAlert size={14} /> Riesgos y validaciones
                          </p>
                          <ul className="mt-2 space-y-2 text-xs text-slate-600">
                            {s.risks.slice(0, 3).map((risk, j) => (
                              <li key={j} className="leading-5">
                                • {risk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="panel p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="text-green-700 shrink-0" />
                    <h3 className="font-bold text-lg">
                      Transparencia científica
                    </h3>
                  </div>
                  <p className="text-sm leading-6">
                    {analysis.methodology.method}
                  </p>
                  <p className="bg-[#f1f7f1] rounded-xl p-3 text-sm font-mono break-words overflow-x-auto">
                    {analysis.methodology.formula}
                  </p>
                  <p className="text-sm text-red-800 font-semibold leading-6">
                    {analysis.methodology.scope}
                  </p>
                  <ul className="space-y-2 text-sm text-slate-600 leading-6">
                    {analysis.methodology.limitations.map((l, i) => (
                      <li key={i}>• {l}</li>
                    ))}
                  </ul>
                  <a
                    href={analysis.methodology.nasa_source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-800 underline text-sm flex items-center gap-2"
                  >
                    Documentación oficial NASA POWER <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="panel p-5 sm:p-7 text-center">
              <div className="h-14 w-14 bg-green-50 text-[#21815b] rounded-2xl mx-auto flex items-center justify-center">
                <BarChart3 size={28} />
              </div>
              <h2 className="text-xl font-bold mt-3">
                Tu análisis aparecerá aquí
              </h2>
              <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto leading-6">
                Completa los datos de la parcela y selecciona “Analizar
                estrategias” para comparar observaciones reales NASA POWER y
                tres rotaciones ilustrativas.
              </p>
            </div>
          )}
        </section>
        <footer className="py-6 border-t border-green-100 flex flex-col sm:flex-row sm:justify-between gap-3 text-xs text-slate-500 leading-5">
          <span>
            AgroShift AI · Prototipo abierto · NASA Space Apps Challenge 2026
          </span>
          <span className="sm:text-right">
            Herramienta de apoyo. Consulta a agricultores y profesionales
            locales antes de tomar decisiones.
          </span>
        </footer>
      </main>
    </div>
  );
}
function Metric({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-500">{title}</p>
        <span className="text-green-700 bg-green-50 p-2 rounded-lg">
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-[11px] text-slate-500 mt-2">{detail}</p>
    </div>
  );
}
