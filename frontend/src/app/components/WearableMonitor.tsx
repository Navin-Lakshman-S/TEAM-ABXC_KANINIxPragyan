"use client";

import { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { createVitalsSocket } from "@/lib/api";
import { Heart, Wind, AlertTriangle } from "lucide-react";

interface VitalReading {
  timestamp: string;
  heart_rate: number;
  spo2: number;
  steps: number;
  tick: number;
  alerts: { type: string; value: number }[];
}

interface WearableMonitorProps {
  patientId: string;
  baseHr?: number;
  baseSpo2?: number;
  riskLevel?: string;
}

export function WearableMonitor({
  patientId,
  baseHr = 75,
  baseSpo2 = 97,
  riskLevel = "Low",
}: WearableMonitorProps) {
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [connected, setConnected] = useState(false);
  const [latestAlerts, setLatestAlerts] = useState<{ type: string; value: number }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const maxPoints = 60;

  useEffect(() => {
    const ws = createVitalsSocket(patientId, baseHr, baseSpo2, riskLevel);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      const data: VitalReading = JSON.parse(event.data);
      setReadings((prev) => [...prev.slice(-maxPoints), data]);
      if (data.alerts.length > 0) {
        setLatestAlerts(data.alerts);
      }
    };

    return () => {
      ws.close();
    };
  }, [patientId, baseHr, baseSpo2, riskLevel]);

  const latest = readings[readings.length - 1];
  const chartData = readings.map((r, i) => ({
    idx: i,
    HR: Math.round(r.heart_rate),
    SpO2: Math.round(r.spo2 * 10) / 10,
  }));

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-green-400 animate-pulse" : "bg-red-400"
          }`}
        />
        <span className={connected ? "text-green-400" : "text-red-400"}>
          {connected ? "Smartwatch Connected" : "Disconnected"}
        </span>
      </div>

      {/* Live vitals tiles */}
      {latest && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-xl p-4 card-hover">
            <div className="flex items-center gap-1.5 text-rose-500 mb-1">
              <Heart className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-medium">
                Heart Rate
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {Math.round(latest.heart_rate)}
              <span className="text-xs text-slate-400 ml-1">bpm</span>
            </p>
          </div>
          <div className="glass-card rounded-xl p-4 card-hover">
            <div className="flex items-center gap-1.5 text-blue-500 mb-1">
              <Wind className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-medium">
                SpO2
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {(latest.spo2).toFixed(1)}
              <span className="text-xs text-slate-400 ml-1">%</span>
            </p>
          </div>
          <div className="glass-card rounded-xl p-4 card-hover">
            <div className="flex items-center gap-1.5 text-amber-500 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-medium">
                Steps
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {readings.reduce((s, r) => s + r.steps, 0)}
            </p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {latestAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-1">
            <AlertTriangle className="w-4 h-4" />
            Wearable Alert
          </div>
          {latestAlerts.map((a, i) => (
            <p key={i} className="text-xs text-red-600">
              {a.type.replace("_", " ")} detected — value: {a.value}
            </p>
          ))}
        </div>
      )}

      {/* Live chart */}
      {chartData.length > 5 && (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="idx" hide />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.85)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  boxShadow: "0 8px 30px -8px rgba(0,0,0,0.08)",
                }}
              />
              <Line
                type="monotone"
                dataKey="HR"
                stroke="#ff2d78"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="SpO2"
                stroke="#00f0ff"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
