"use client";

import { useState } from "react";
import { WearableMonitor } from "../components/WearableMonitor";
import { Radio, Settings2, Zap, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function WearablePage() {
  const { t } = useI18n();
  const [patientId, setPatientId] = useState("demo-patient-001");
  const [baseHr, setBaseHr] = useState(75);
  const [baseSpo2, setBaseSpo2] = useState(97);
  const [riskLevel, setRiskLevel] = useState("Low");
  const [active, setActive] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{t("wearable.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("wearable.subtitle")}
          </p>
        </div>
      </div>

      {/* Config panel */}
      <div className="glass-card card-hover rounded-2xl p-5 space-y-4 animate-fade-up">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
            <Settings2 className="w-3.5 h-3.5 text-white" />
          </span>
          Stream Configuration
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Patient ID
            </label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={active}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:border-white/20 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Baseline HR (bpm)
            </label>
            <input
              type="number"
              min={40}
              max={180}
              value={baseHr}
              onChange={(e) => setBaseHr(+e.target.value)}
              disabled={active}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:border-white/20 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Baseline SpO2 (%)
            </label>
            <input
              type="number"
              min={80}
              max={100}
              value={baseSpo2}
              onChange={(e) => setBaseSpo2(+e.target.value)}
              disabled={active}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:border-white/20 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Risk Profile
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              disabled={active}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:border-white/20 disabled:opacity-50"
            >
              <option value="Low">Low — stable vitals</option>
              <option value="Medium">Medium — mild drift</option>
              <option value="High">High — rapid deterioration</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setActive(!active)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
            active
              ? "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 ring-1 ring-red-200/50"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 hover:-translate-y-0.5"
          }`}
        >
          <Zap className="w-4 h-4" />
          {active ? t("wearable.stop") : t("wearable.start")}
        </button>
      </div>

      {/* Live stream */}
      {active && (
        <WearableMonitor
          patientId={patientId}
          baseHr={baseHr}
          baseSpo2={baseSpo2}
          riskLevel={riskLevel}
        />
      )}

      {/* Info */}
      {!active && (
        <div className="glass-card card-hover rounded-2xl p-5 space-y-3 animate-fade-up">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Info className="w-3.5 h-3.5 text-white" />
            </span>
            How It Works
          </h3>
          <div className="text-xs text-slate-500 space-y-2">
            <p>
              This module simulates a smartwatch or wearable device streaming
              real-time vital signs to the triage system via WebSocket. The
              simulation produces physiologically realistic heart rate and SpO2
              readings with natural sinus rhythm variation.
            </p>
            <p>
              <strong className="text-slate-300">Low risk:</strong> Vitals
              remain stable around baseline with minor noise.
            </p>
            <p>
              <strong className="text-slate-300">Medium risk:</strong> Gradual
              drift with occasional micro-desaturation events.
            </p>
            <p>
              <strong className="text-slate-300">High risk:</strong> Accelerated
              deterioration trend — heart rate climbs while SpO2 drops,
              triggering automatic alerts.
            </p>
            <p>
              In a production system, this data would feed back into the
              triage engine to dynamically re-assess patient priority in
              real time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
