// AdminEmotions.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const EMOTION_COLORS = {
  happy: "#4CAF50",
  sad: "#2196F3",
  angry: "#F44336",
  fearful: "#FF9800",
  neutral: "#9E9E9E",
};

const SAMPLE_USERS = [
  {
    name: "User 1",
    before: { happy: 10, sad: 40, angry: 20, fearful: 20, neutral: 10 },
    after: { happy: 50, sad: 10, angry: 5, fearful: 5, neutral: 30 },
  },
  {
    name: "User 2",
    before: { happy: 20, sad: 30, angry: 10, fearful: 20, neutral: 20 },
    after: { happy: 60, sad: 5, angry: 5, fearful: 5, neutral: 25 },
  },
];

// Helper to convert emotion object to pie data
const toPieData = (obj) =>
  Object.entries(obj).map(([name, value]) => ({ name, value }));

export default function AdminEmotions() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const shortcutHandler = (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      if (ctrl && e.shiftKey && e.key.toLowerCase() === "e") {
        navigate("/admin");
      }
    };

    window.addEventListener("keydown", shortcutHandler);
    return () => window.removeEventListener("keydown", shortcutHandler);
  }, []);

  if (!visible) return null;

  // Generate improvement data for line chart
  const lineData = SAMPLE_USERS.map((u, idx) => ({
    name: u.name,
    improvement:
      (u.after.happy || 0) -
      (u.before.happy || 0) +
      (u.after.neutral || 0) -
      (u.before.neutral || 0),
  }));

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.95)",
        color: "#fff",
        overflowY: "auto",
        zIndex: 9999,
        padding: "2rem",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "2rem" }}>
        Admin Emotions Dashboard
      </h1>

      {SAMPLE_USERS.map((user, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            gap: "2rem",
            marginBottom: "3rem",
            flexWrap: "wrap",
          }}
        >
          {/* Before Pie */}
          <div style={{ width: 300, height: 300, background: "#222", padding: 10, borderRadius: 10 }}>
            <h3 style={{ textAlign: "center" }}>Before: {user.name}</h3>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={toPieData(user.before)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {Object.keys(user.before).map((key, i) => (
                    <Cell
                      key={i}
                      fill={EMOTION_COLORS[key.toLowerCase()] || "#888"}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* After Pie */}
          <div style={{ width: 300, height: 300, background: "#222", padding: 10, borderRadius: 10 }}>
            <h3 style={{ textAlign: "center" }}>After: {user.name}</h3>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={toPieData(user.after)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {Object.keys(user.after).map((key, i) => (
                    <Cell
                      key={i}
                      fill={EMOTION_COLORS[key.toLowerCase()] || "#888"}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}

      <div style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
          Improvement Line Chart
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#555" />
            <XAxis dataKey="name" stroke="#fff" />
            <YAxis stroke="#fff" />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="improvement"
              stroke="#4CAF50"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p style={{ textAlign: "center", marginTop: "2rem", color: "#ccc" }}>
        Press Ctrl+Shift+E again to hide
      </p>
    </div>
  );
}
