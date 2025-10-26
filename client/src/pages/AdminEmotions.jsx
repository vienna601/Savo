import React, { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

// Pie chart colors
const EMOTION_COLORS = {
  happy: "#4CAF50",
  neutral: "#9E9E9E",
  sad: "#2196F3",
  angry: "#F44336",
  fearful: "#FFC107",
};

// Error Boundary to prevent crashes
class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("AdminEmotions error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return <h2 style={{ color: "red" }}>Something went wrong in Admin Dashboard.</h2>;
    }
    return this.props.children;
  }
}

// Chart card component
const ChartCard = ({ title, data }) => {
  if (!data || !data.length) return <p>{title}: No data yet.</p>;
  return (
    <div
      style={{
        width: 300,
        height: 300,
        background: "#fff",
        padding: 20,
        borderRadius: 12,
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      }}
    >
      <h4>{title}</h4>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label>
            {data.map((entry, index) => (
              <Cell key={index} fill={EMOTION_COLORS[entry.name] || "#888"} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Main AdminEmotions component
const AdminEmotions = ({ therapyData }) => {
  const [adminMode, setAdminMode] = useState(false);
  const [preChatData, setPreChatData] = useState([]);
  const [postChatData, setPostChatData] = useState([]);

  // Secret shortcut Ctrl+Alt+A to toggle admin mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "a") {
        setAdminMode((prev) => !prev);
        if (!adminMode) {
          localStorage.setItem("admin-emotions", JSON.stringify([]));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update pie charts whenever therapyData changes
  useEffect(() => {
    if (!adminMode) return;
    const safeData = Array.isArray(therapyData) ? therapyData : [];

    const pre = safeData.filter((e) => e.phase === "pre");
    const post = safeData.filter((e) => e.phase === "post");

    setPreChatData(toPieData(pre));
    setPostChatData(toPieData(post));

    // Store temporarily in localStorage
    localStorage.setItem("admin-emotions", JSON.stringify(safeData));
  }, [therapyData, adminMode]);

  // Clear storage when dashboard closes
  useEffect(() => {
    return () => localStorage.removeItem("admin-emotions");
  }, []);

  const toPieData = (events) => {
    const counts = {};
    for (const e of events) counts[e.emotion] = (counts[e.emotion] || 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  if (!adminMode) return null;

  return (
    <div style={{ padding: 20, background: "#f5f5f5" }}>
      <h2>Admin Emotion Dashboard</h2>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 20 }}>
        <ChartCard title="Pre-Chat Emotions" data={preChatData} />
        <ChartCard title="Post-Chat Emotions" data={postChatData} />
      </div>
    </div>
  );
};

// Wrap AdminEmotions with error boundary
const AdminEmotionsWrapper = (props) => (
  <AdminErrorBoundary>
    <AdminEmotions {...props} />
  </AdminErrorBoundary>
);

export default AdminEmotionsWrapper;
