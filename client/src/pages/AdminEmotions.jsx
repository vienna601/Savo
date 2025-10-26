// AdminEmotions.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const EMOTION_COLORS = {
  happy: "#4CAF50",
  neutral: "#9E9E9E",
  sad: "#2196F3",
  angry: "#F44336",
  fearful: "#FF9800",
  surprised: "#FFD700",
  disgusted: "#8B008B",
};

// Convert emotion map to pie chart data
const toPieData = (emotionMap) =>
  Object.entries(emotionMap).map(([name, value]) => ({ name, value }));

export default function AdminEmotions() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const labelRef = useRef(null);

  const [confidenceHistory, setConfidenceHistory] = useState([]);
  const [preChatEmotions, setPreChatEmotions] = useState({});
  const [postChatEmotions, setPostChatEmotions] = useState({});
  const [lineData, setLineData] = useState([]);

  const firstFrameCaptured = useRef(false);
  const postChatStarted = useRef(false);

  useEffect(() => {
    const loadModelsAndStart = async () => {
      const faceapi = window.faceapi;
      if (!faceapi) return console.error("face-api.js not found");

      const label = labelRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      label.textContent = "Loading models...";

      await faceapi.nets.tinyFaceDetector.loadFromUri(
        "https://justadudewhohacks.github.io/face-api.js/models"
      );
      await faceapi.nets.faceLandmark68Net.loadFromUri(
        "https://justadudewhohacks.github.io/face-api.js/models"
      );
      await faceapi.nets.faceExpressionNet.loadFromUri(
        "https://justadudewhohacks.github.io/face-api.js/models"
      );

      label.textContent = "Models loaded, starting camera...";
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      video.onloadeddata = () => {
        const startPostChatTimer = () => {
          setTimeout(() => {
            postChatStarted.current = true;
          }, 30000); // start post-chat after 30s
        };
        startPostChatTimer();

        async function detectLoop() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

          if (detection) {
            const maxExp = Object.entries(detection.expressions).reduce(
              (a, b) => (a[1] > b[1] ? a : b)
            );
            const [expression, confidence] = maxExp;

            const validEmotions = [
              "happy",
              "neutral",
              "sad",
              "angry",
              "fearful",
              "surprised",
              "disgusted",
            ];
            if (!validEmotions.includes(expression)) return;

            // Pre-chat: first detected frame
            if (!firstFrameCaptured.current) {
              setPreChatEmotions((prev) => ({
                ...prev,
                [expression]: (prev[expression] || 0) + 1,
              }));
              firstFrameCaptured.current = true;
            }

            // Post-chat: after 30s, keep updating continuously
            if (postChatStarted.current) {
              setPostChatEmotions((prev) => ({
                ...prev,
                [expression]: (prev[expression] || 0) + 1,
              }));
            }

            // Update line chart confidence
            const yValue = ["happy", "neutral", "surprised"].includes(
              expression
            )
              ? confidence
              : -confidence;
            setConfidenceHistory((prev) => [
              ...prev.slice(-200),
              { time: Date.now(), expression, value: yValue },
            ]);

            // Update label
            const colorMap = EMOTION_COLORS;
            label.textContent = `${expression.toUpperCase()} (${(
              confidence * 100
            ).toFixed(1)}%)`;
            label.style.color = colorMap[expression] || "yellow";
            label.style.textShadow = `0 0 15px ${
              colorMap[expression] || "yellow"
            }`;
          } else {
            label.textContent = "No face detected";
          }

          requestAnimationFrame(detectLoop);
        }
        detectLoop();
      };
    };

    loadModelsAndStart();
  }, []);

  // Update line chart every second
  useEffect(() => {
    const interval = setInterval(() => {
      const scoreMap = {
        happy: 5,
        neutral: 3,
        sad: 2,
        angry: 1,
        fearful: 2,
        surprised: 4,
        disgusted: 1,
      };
      const allEmotions = { ...preChatEmotions, ...postChatEmotions };
      const total = Object.values(allEmotions).reduce((a, b) => a + b, 1);
      const avg =
        Object.entries(allEmotions).reduce(
          (acc, [key, val]) => acc + (scoreMap[key] || 3) * val,
          0
        ) / total;

      setLineData([{ session: "Live Session", avg }]);
    }, 1000);
    return () => clearInterval(interval);
  }, [preChatEmotions, postChatEmotions]);

  return (
    <div
      style={{
        padding: 20,
        background: "#111",
        color: "#fff",
        minHeight: "100vh",
      }}
    >
      <h2 style={{ textAlign: "center" }}>Admin Emotion Dashboard</h2>

      {/* Pie Charts */}
      <div
        style={{
          display: "flex",
          gap: 20,
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: 20,
        }}
      >
        <ChartCard
          title="Pre-Chat Emotions"
          data={toPieData(preChatEmotions)}
        />
        <ChartCard
          title="Post-Chat Emotions"
          data={toPieData(postChatEmotions)}
        />
      </div>

      {/* Webcam + Line Chart */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 40,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* Webcam */}
        <div
          style={{
            flex: 1,
            minWidth: 350,
            maxWidth: 500,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3 style={{ textAlign: "center" }}>Live Webcam Feed</h3>
          <div style={{ position: "relative", width: "100%", height: 300 }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              style={{ width: "100%", height: "100%" }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
            />
          </div>
          <div
            ref={labelRef}
            style={{ textAlign: "center", marginTop: 10 }}
          ></div>
        </div>

        {/* Line Chart */}
        <div style={{ flex: 1, minWidth: 350, maxWidth: 500 }}>
          <h3 style={{ textAlign: "center" }}>Improvement Over Time</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={lineData}>
              <CartesianGrid stroke="#555" strokeDasharray="5 5" />
              <XAxis dataKey="session" stroke="#fff" />
              <YAxis domain={[-1, 5]} stroke="#fff" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#4CAF50"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const ChartCard = ({ title, data }) => {
  if (!data.length)
    return (
      <p style={{ width: 300, textAlign: "center" }}>{title}: No data yet.</p>
    );
  return (
    <div
      style={{
        width: 300,
        height: 300,
        background: "#222",
        padding: 20,
        borderRadius: 12,
      }}
    >
      <h4 style={{ textAlign: "center", marginBottom: 10 }}>{title}</h4>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            label
          >
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
