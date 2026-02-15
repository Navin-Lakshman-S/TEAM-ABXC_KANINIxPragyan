"use client";

import { useEffect, useState, useCallback, useRef, FormEvent } from "react";
import {
  submitTriage,
  uploadEHR,
  getMetaSymptoms,
  PatientInput,
  TriageResult,
} from "@/lib/api";
import { RiskBadge } from "../components/RiskBadge";
import { ShapChart } from "../components/ShapChart";
import { DigitalTwinChart } from "../components/DigitalTwinChart";
import {
  Send,
  Upload,
  AlertCircle,
  CheckCircle2,
  Activity,
  ShieldAlert,
  Building2,
  Clock,
  ChevronDown,
  X,
  FileText,
  Heart,
  Thermometer,
  Droplets,
  Printer,
  Download,
  Mic,
  MicOff,
} from "lucide-react";
import Script from "next/script";
import { useI18n } from "@/lib/i18n";

const INSURERS = [
  "United Health",
  "Aetna",
  "Cigna",
  "Blue Cross",
  "Medicare",
  "Medicaid",
  "Kaiser",
  "Humana",
];

const GENDERS = ["Male", "Female", "Other"];

const DEFAULT_FORM: PatientInput = {
  name: "",
  age: 45,
  gender: "Male",
  symptoms: [],
  bp_systolic: 120,
  bp_diastolic: 80,
  heart_rate: 75,
  temperature: 98.6,
  spo2: 97,
  pre_existing_conditions: [],
  insurance_provider: "United Health",
  insurance_response_hours: 2,
};

export default function TriagePage() {
  const { t } = useI18n();
  const [form, setForm] = useState<PatientInput>({ ...DEFAULT_FORM });
  const [metaSymptoms, setMetaSymptoms] = useState<string[]>([]);
  const [metaConditions, setMetaConditions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // symptom search
  const [symptomQuery, setSymptomQuery] = useState("");
  const [conditionQuery, setConditionQuery] = useState("");
  const [showSymDropdown, setShowSymDropdown] = useState(false);
  const [showCondDropdown, setShowCondDropdown] = useState(false);

  // Voice recognition
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof Object> | null>(null);

  // EHR upload
  const [ehrFile, setEhrFile] = useState<File | null>(null);
  const [ehrLoading, setEhrLoading] = useState(false);
  const [ehrMessage, setEhrMessage] = useState<string | null>(null);

  useEffect(() => {
    getMetaSymptoms()
      .then((data) => {
        setMetaSymptoms(data.symptoms);
        setMetaConditions(data.conditions);
      })
      .catch(console.error);

    // Check voice recognition support
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
    }
  }, []);

  const toggleVoice = useCallback(() => {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening && recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognition as any)();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: { results: { transcript: string }[][] }) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      // Try to match spoken words to known symptoms
      const spoken = transcript.split(/[,;.]+|\band\b/).map((s: string) => s.trim()).filter(Boolean);
      let matched = 0;
      for (const phrase of spoken) {
        const match = metaSymptoms.find(
          (ms) =>
            ms.toLowerCase() === phrase ||
            ms.toLowerCase().includes(phrase) ||
            phrase.includes(ms.toLowerCase())
        );
        if (match && !form.symptoms.includes(match)) {
          setForm((prev) => ({ ...prev, symptoms: [...prev.symptoms, match] }));
          matched++;
        }
      }
      // If nothing matched, try each word individually
      if (matched === 0) {
        const words = transcript.split(/\s+/);
        for (const word of words) {
          if (word.length < 3) continue;
          const match = metaSymptoms.find(
            (ms) => ms.toLowerCase().includes(word) || word.includes(ms.toLowerCase())
          );
          if (match && !form.symptoms.includes(match)) {
            setForm((prev) => ({ ...prev, symptoms: [...prev.symptoms, match] }));
            matched++;
          }
        }
      }
      if (matched > 0) {
        setToast(`Added ${matched} symptom${matched > 1 ? "s" : ""} via voice`);
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast(`Voice: "${transcript}" — no matching symptoms found`);
        setTimeout(() => setToast(null), 4000);
      }
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }, [isListening, metaSymptoms, form.symptoms]);

  const updateField = useCallback(
    <K extends keyof PatientInput>(key: K, val: PatientInput[K]) => {
      setForm((prev) => ({ ...prev, [key]: val }));
    },
    []
  );

  const toggleItem = useCallback(
    (key: "symptoms" | "pre_existing_conditions", item: string) => {
      setForm((prev) => {
        const list = prev[key] as string[];
        return {
          ...prev,
          [key]: list.includes(item)
            ? list.filter((s) => s !== item)
            : [...list, item],
        };
      });
    },
    []
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    setToast(null);
    try {
      const res = await submitTriage(form);
      setResult(res);
      setToast(`✅ Patient "${res.patient_name}" triaged as ${res.risk_level} risk`);
      setTimeout(() => setToast(null), 5000);
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Triage failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEhrUpload = async () => {
    if (!ehrFile) return;
    setEhrLoading(true);
    setEhrMessage(null);
    try {
      const res = await uploadEHR(ehrFile);
      const fields = res.extracted_fields as Record<string, unknown>;
      // merge extracted fields into form
      setForm((prev) => ({
        ...prev,
        ...(fields.name && typeof fields.name === "string"
          ? { name: fields.name }
          : {}),
        ...(fields.age && typeof fields.age === "number"
          ? { age: fields.age }
          : {}),
        ...(fields.gender && typeof fields.gender === "string"
          ? { gender: fields.gender }
          : {}),
        ...(fields.bp_systolic && typeof fields.bp_systolic === "number"
          ? { bp_systolic: fields.bp_systolic }
          : {}),
        ...(fields.bp_diastolic && typeof fields.bp_diastolic === "number"
          ? { bp_diastolic: fields.bp_diastolic }
          : {}),
        ...(fields.heart_rate && typeof fields.heart_rate === "number"
          ? { heart_rate: fields.heart_rate }
          : {}),
        ...(fields.temperature && typeof fields.temperature === "number"
          ? { temperature: fields.temperature }
          : {}),
        ...(fields.spo2 && typeof fields.spo2 === "number"
          ? { spo2: fields.spo2 }
          : {}),
        ...(fields.symptoms && Array.isArray(fields.symptoms)
          ? { symptoms: fields.symptoms as string[] }
          : {}),
        ...(fields.pre_existing_conditions &&
        Array.isArray(fields.pre_existing_conditions)
          ? {
              pre_existing_conditions:
                fields.pre_existing_conditions as string[],
            }
          : {}),
      }));
      setEhrMessage(`Extracted ${Object.keys(fields).length} fields from ${res.source_file}`);
    } catch {
      setEhrMessage("Failed to parse EHR document.");
    } finally {
      setEhrLoading(false);
    }
  };

  const filteredSymptoms = metaSymptoms.filter(
    (s) =>
      s.toLowerCase().includes(symptomQuery.toLowerCase()) &&
      !form.symptoms.includes(s)
  );

  const filteredConditions = metaConditions.filter(
    (c) =>
      c.toLowerCase().includes(conditionQuery.toLowerCase()) &&
      !form.pre_existing_conditions.includes(c)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Send className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{ t("triage.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("triage.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input form — left two-thirds */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 space-y-5"
        >
          {/* Demographics */}
          <section className="glass-card card-hover rounded-2xl p-5 space-y-4 animate-fade-up">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-white" />
              </span>
              Patient Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {t("triage.fullName")}
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:border-white/20"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t("triage.age")}</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={120}
                  value={form.age}
                  onChange={(e) => updateField("age", +e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {t("triage.gender")}
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => updateField("gender", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:border-white/20"
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Vitals */}
          <section className="glass-card card-hover rounded-2xl p-5 space-y-4 animate-fade-up" style={{ animationDelay: '70ms' }}>
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-white" />
              </span>
              Vital Signs
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <VitalInput
                icon={<Heart className="w-3.5 h-3.5 text-red-400" />}
                label="BP Systolic"
                unit="mmHg"
                value={form.bp_systolic}
                onChange={(v) => updateField("bp_systolic", v)}
                min={50}
                max={300}
              />
              <VitalInput
                icon={<Heart className="w-3.5 h-3.5 text-red-400" />}
                label="BP Diastolic"
                unit="mmHg"
                value={form.bp_diastolic}
                onChange={(v) => updateField("bp_diastolic", v)}
                min={30}
                max={200}
              />
              <VitalInput
                icon={<Activity className="w-3.5 h-3.5 text-pink-400" />}
                label="Heart Rate"
                unit="bpm"
                value={form.heart_rate}
                onChange={(v) => updateField("heart_rate", v)}
                min={20}
                max={250}
              />
              <VitalInput
                icon={<Thermometer className="w-3.5 h-3.5 text-amber-400" />}
                label="Temperature"
                unit="°F"
                value={form.temperature}
                onChange={(v) => updateField("temperature", v)}
                min={90}
                max={110}
                step={0.1}
              />
              <VitalInput
                icon={<Droplets className="w-3.5 h-3.5 text-blue-400" />}
                label="SpO2"
                unit="%"
                value={form.spo2}
                onChange={(v) => updateField("spo2", v)}
                min={50}
                max={100}
              />
            </div>
          </section>

          {/* Symptoms */}
          <section className="glass-card card-hover rounded-2xl p-5 space-y-3 animate-fade-up" style={{ animationDelay: '140ms' }}>
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <ShieldAlert className="w-3.5 h-3.5 text-white" />
              </span>
              Symptoms
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isListening
                      ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse"
                      : "bg-white/8 text-slate-400 hover:bg-blue-500/10 hover:text-cyan-400 border border-white/10"
                  }`}
                  title={isListening ? "Stop listening" : "Voice input — speak your symptoms"}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isListening ? "..." : t("triage.voice")}
                </button>
              )}
            </h2>
            <div className="relative">
              <input
                type="text"
                value={symptomQuery}
                onChange={(e) => {
                  setSymptomQuery(e.target.value);
                  setShowSymDropdown(true);
                }}
                onFocus={() => setShowSymDropdown(true)}
                placeholder={isListening ? "🎤 ..." : t("triage.searchSymptoms")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:border-white/20"
              />
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              {showSymDropdown && filteredSymptoms.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-white/10 rounded-lg shadow-xl">
                  {filteredSymptoms.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        toggleItem("symptoms", s);
                        setSymptomQuery("");
                        setShowSymDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.symptoms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.symptoms.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2.5 py-0.5 text-xs"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => toggleItem("symptoms", s)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Conditions */}
          <section className="glass-card card-hover rounded-2xl p-5 space-y-3 animate-fade-up" style={{ animationDelay: '210ms' }}>
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                <AlertCircle className="w-3.5 h-3.5 text-white" />
              </span>
              Pre-existing Conditions
            </h2>
            <div className="relative">
              <input
                type="text"
                value={conditionQuery}
                onChange={(e) => {
                  setConditionQuery(e.target.value);
                  setShowCondDropdown(true);
                }}
                onFocus={() => setShowCondDropdown(true)}
                placeholder={t("triage.searchConditions")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:border-white/20"
              />
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              {showCondDropdown && filteredConditions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-white/10 rounded-lg shadow-xl">
                  {filteredConditions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        toggleItem("pre_existing_conditions", c);
                        setConditionQuery("");
                        setShowCondDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.pre_existing_conditions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.pre_existing_conditions.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2.5 py-0.5 text-xs"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => toggleItem("pre_existing_conditions", c)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Insurance */}
          <section className="glass-card card-hover rounded-2xl p-5 space-y-4 animate-fade-up" style={{ animationDelay: '280ms' }}>
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-white" />
              </span>
              Insurance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {t("triage.provider")}
                </label>
                <select
                  value={form.insurance_provider}
                  onChange={(e) =>
                    updateField("insurance_provider", e.target.value)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:border-white/20"
                >
                  {INSURERS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {t("triage.responseHours")}
                </label>
                <input
                  type="number"
                  min={0}
                  max={48}
                  step={0.5}
                  value={form.insurance_response_hours}
                  onChange={(e) =>
                    updateField("insurance_response_hours", +e.target.value)
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:border-white/20"
                />
              </div>
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !form.name}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            {submitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                {t("triage.running")}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> {t("triage.submit")}
              </>
            )}
          </button>
        </form>

        {/* EHR upload — right column */}
        <div className="space-y-4">
          <div className="glass-card card-hover rounded-2xl p-5 space-y-3 animate-fade-up">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Upload className="w-3.5 h-3.5 text-white" />
              </span>
              Upload EHR
            </h3>
            <p className="text-xs text-slate-500">
              {t("triage.uploadDesc")}
            </p>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => setEhrFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-500/10 file:text-blue-400 file:text-xs hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
            />
            <button
              type="button"
              onClick={handleEhrUpload}
              disabled={!ehrFile || ehrLoading}
              className="w-full flex items-center justify-center gap-2 bg-white/8 hover:bg-white/10 text-slate-300 text-sm py-2 rounded-lg transition-colors disabled:opacity-40"
            >
              {ehrLoading ? (
                <div className="animate-spin w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {t("triage.parseDoc")}
            </button>
            {ehrMessage && (
              <p className="text-xs text-cyan-400 mt-1">{ehrMessage}</p>
            )}
          </div>

          {/* 3D Interactive Body Viewer */}
          <div className="glass-card card-hover rounded-2xl p-5 space-y-3 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h3 className="text-sm font-semibold text-white">
              3D Body Viewer
            </h3>
            <p className="text-xs text-slate-400">
              Interactive 3D anatomical model
            </p>
            <div className="relative w-full rounded-xl overflow-hidden border border-white/10" style={{ height: '320px' }}>
              <Script
                src="https://unpkg.com/@splinetool/viewer@1.12.57/build/spline-viewer.js"
                type="module"
                strategy="lazyOnload"
              />
              {/* @ts-expect-error - spline-viewer is a web component */}
              <spline-viewer
                url="https://prod.spline.design/FU5F2nVr56dYuXUY/scene.splinecode"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in">
          <div className="bg-emerald-600/90 backdrop-blur-sm text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 border border-emerald-500/40">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{toast}</p>
            <button onClick={() => setToast(null)} className="ml-2 text-emerald-200 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Results panel */}
      {result && (
        <div className="space-y-6" id="results">
          <hr className="border-white/10/50" />
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-4.5 h-4.5 text-white" />
              </span>
              Triage Result
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 glass-card text-slate-400 rounded-xl text-xs hover:bg-white/90 transition-all shadow-sm border border-white/10/60"
              >
                <Printer className="w-3.5 h-3.5" /> {t("triage.print")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob(
                    [JSON.stringify(result, null, 2)],
                    { type: "application/json" }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `triage-${result.patient_id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20"
              >
                <Download className="w-3.5 h-3.5" /> {t("triage.export")}
              </button>
            </div>
          </div>

          {/* top summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card card-hover rounded-2xl p-5 flex flex-col items-center gap-2 animate-fade-up">
              <span className="text-xs text-slate-500">{t("triage.riskLevel")}</span>
              <RiskBadge level={result.risk_level} size="lg" />
              <span className="text-xs text-slate-400 mt-1">
                Confidence: {(result.confidence * 100).toFixed(1)}%
              </span>
              {result.override && (
                <span className="text-xs text-red-400 mt-1">
                  ⚠ Override: {result.override_reason}
                </span>
              )}
            </div>
            <div className="glass-card card-hover rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '70ms' }}>
              <span className="text-xs text-slate-500">Department</span>
              <p className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />{" "}
                {result.department.recommended_department}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Score: {(result.department.confidence_score * 100).toFixed(0)}%
              </p>
              {result.department.reasons.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {result.department.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-slate-500">
                      • {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="glass-card card-hover rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '140ms' }}>
              <span className="text-xs text-slate-500">
                Deterioration Score
              </span>
              <p
                className={`text-3xl font-bold mt-1 ${
                  result.deterioration.deterioration_score >= 60
                    ? "text-red-400"
                    : result.deterioration.deterioration_score >= 30
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {result.deterioration.deterioration_score}
              </p>
              {result.deterioration.has_critical_alert && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{" "}
                  {result.deterioration.alert_count} critical alert(s)
                </p>
              )}
            </div>
          </div>

          {/* SHAP explanation */}
          {result.shap_factors.length > 0 && (
            <div className="glass-card card-hover rounded-2xl p-5 animate-fade-up">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-white" />
                </span>
                AI Explainability — SHAP Factor Analysis
              </h3>
              <ShapChart factors={result.shap_factors} />
            </div>
          )}

          {/* Digital Twin */}
          {result.digital_twin && (
            <div className="glass-card card-hover rounded-2xl p-5 animate-fade-up">
              <h3 className="text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-white" />
                </span>
                Digital Twin — Projected Trajectory
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                {result.digital_twin.summary}
              </p>
              <DigitalTwinChart
                timeline={result.digital_twin.timeline}
                escalationPoint={result.digital_twin.escalation_point_min}
              />
            </div>
          )}

          {/* Deterioration alerts */}
          {result.deterioration.alerts.length > 0 && (
            <div className="glass-card card-hover rounded-2xl p-5 animate-fade-up">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-white" />
                </span>
                Deterioration Alerts
              </h3>
              <div className="space-y-3">
                {result.deterioration.alerts.map((a, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 border ${
                      a.severity === "critical"
                        ? "bg-red-500/10 border-red-500/20"
                        : a.severity === "warning"
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-blue-500/10 border-blue-500/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold uppercase ${
                          a.severity === "critical"
                            ? "text-red-400"
                            : a.severity === "warning"
                            ? "text-amber-400"
                            : "text-blue-400"
                        }`}
                      >
                        {a.type} — {a.severity}
                      </span>
                      <span className="text-xs text-slate-500">
                        Score: {a.score}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {a.recommendation}
                    </p>
                    {a.triggers.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Triggers: {a.triggers.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insurance risk */}
          {result.insurance_risk && (
            <div className="glass-card card-hover rounded-2xl p-5 animate-fade-up">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-white" />
                </span>
                Insurance Wait-Time Risk
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="text-xs text-slate-500">Insurer</p>
                  <p className="text-sm text-white font-medium">
                    {result.insurance_risk.insurance_response.insurer}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Est. Wait</p>
                  <p className="text-sm text-white font-medium">
                    {result.insurance_risk.insurance_response.estimated_minutes}{" "}
                    min
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Risk Now</p>
                  <p className="text-sm text-white font-medium">
                    {result.insurance_risk.current_risk}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Risk After Wait</p>
                  <p
                    className={`text-sm font-medium ${
                      result.insurance_risk.escalation_during_wait
                        ? "text-red-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {result.insurance_risk.risk_at_insurance_response}
                  </p>
                </div>
              </div>
              <div
                className={`rounded-lg p-3 text-xs ${
                  result.insurance_risk.urgency === "BYPASS_INSURANCE"
                    ? "bg-red-500/10 border border-red-500/20 text-red-400"
                    : result.insurance_risk.urgency === "EXPEDITE"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                }`}
              >
                {result.insurance_risk.advisory}
              </div>
            </div>
          )}

          {/* Resource status */}
          {result.resource_status && (
            <div className="glass-card card-hover rounded-2xl p-5 animate-fade-up">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-white" />
                </span>
                Hospital Resource Status
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs text-slate-500">Department</p>
                  <p className="text-sm text-white font-medium">
                    {result.resource_status.department}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Occupancy</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-16 bg-white/8 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${
                          result.resource_status.occupancy_percent >= 90
                            ? "bg-red-500/100"
                            : result.resource_status.occupancy_percent >= 70
                            ? "bg-amber-500/100"
                            : "bg-emerald-500/100"
                        }`}
                        style={{
                          width: `${result.resource_status.occupancy_percent}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-white font-mono">
                      {result.resource_status.occupancy_percent}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Beds Available</p>
                  <p className="text-sm text-white font-medium">
                    {result.resource_status.beds_available}
                  </p>
                </div>
              </div>
              {result.resource_status.alternatives.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">
                    Alternative Hospitals
                  </p>
                  <div className="space-y-1">
                    {result.resource_status.alternatives.map((alt, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs bg-white/5 rounded-lg px-3 py-1.5"
                      >
                        <span className="text-slate-300">{alt.hospital}</span>
                        <span className="text-slate-500">
                          {alt.distance_km} km · {alt.beds_available} beds
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-cyan-400 mt-2">
                {result.resource_status.recommendation}
              </p>
            </div>
          )}

          {/* Symptom issues */}
          {result.symptom_issues.has_issues && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-amber-400 mb-2">
                {t("triage.dataWarnings")}
              </h3>
              <ul className="space-y-1">
                {result.symptom_issues.issues.map((iss, i) => (
                  <li key={i} className="text-xs text-amber-400">
                    [{iss.severity}] {iss.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────── small presentational component ─────── */

function VitalInput({
  icon,
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  icon: React.ReactNode;
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs text-slate-500 mb-1">
        {icon} {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          min={min}
          max={max}
          step={step}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none pr-12 transition-all hover:border-white/20"
        />
        <span className="absolute right-3 top-2.5 text-xs text-slate-400">
          {unit}
        </span>
      </div>
    </div>
  );
}
