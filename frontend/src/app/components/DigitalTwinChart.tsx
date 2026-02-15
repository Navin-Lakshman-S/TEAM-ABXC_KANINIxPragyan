"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface TimelineStep {
  time_minutes: number;
  vitals: Record<string, number>;
  risk_score: number;
  risk_level: string;
}

interface DigitalTwinChartProps {
  timeline: TimelineStep[];
  escalationPoint: number | null;
}

export function DigitalTwinChart({
  timeline,
  escalationPoint,
}: DigitalTwinChartProps) {
  const data = timeline.map((step) => ({
    time: `${step.time_minutes}m`,
    minutes: step.time_minutes,
    "Heart Rate": Math.round(step.vitals.heart_rate),
    "BP Systolic": Math.round(step.vitals.bp_systolic),
    SpO2: Math.round(step.vitals.spo2 * 10) / 10,
    "Risk Score": Math.round(step.risk_score * 100),
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
          />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 8px 30px -8px rgba(0,0,0,0.08)",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
          />
          {escalationPoint !== null && (
            <ReferenceLine
              x={`${escalationPoint}m`}
              stroke="#ff073a"
              strokeDasharray="4 4"
              label={{
                value: "Escalation",
                position: "top",
                fill: "#ff073a",
                fontSize: 11,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="Heart Rate"
            stroke="#ff6b00"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="BP Systolic"
            stroke="#00d4ff"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="SpO2"
            stroke="#39ff14"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Risk Score"
            stroke="#ff073a"
            strokeWidth={2.5}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
