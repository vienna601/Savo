import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/TherapistRobot.css";
import { Mic, Send } from "lucide-react";

// ==== CONFIG ====
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

// face-api.js (loaded dynamically)
const FACE_API_URL =
  "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";

// Expressions from face-api: neutral, happy, sad, angry, fearful, disgusted, surprised
const EMOTION_PALETTE = {
  frustrated: "#34d399",
  grief: "#94a3b8",
  angry: "#f87171",
  anxious: "#a78bfa",
  disgusted: "#84cc16",
  irritated: "#fbbf24",
  neutral: "#9E9E9E",
  happy: "#4CAF50",
  sad: "#2196F3",
  fearful: "#FF9800",
};

const PIE_COLORS = Object.values(EMOTION_PALETTE);

// Helper to convert emotion object to pie data
const toPieData = (obj) =>
  Object.entries(obj).map(([name, value]) => ({ name, value }));

// Helper functions
const buildTherapistSystemPrompt = (emotion, confidence) => {
  return `You are a warm, empathetic therapist friend. The user is currently feeling ${emotion} with ${Math.round(
    confidence * 100
  )}% confidence. Respond with compassion and understanding. Keep responses brief (1-3 sentences) and conversational.`;
};

const deriveTextEmotion = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes("sad") || lower.includes("depressed")) return "sad";
  if (lower.includes("angry") || lower.includes("mad")) return "angry";
  if (lower.includes("anxious") || lower.includes("worried")) return "anxious";
  if (lower.includes("happy") || lower.includes("great")) return "happy";
  return null;
};

const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const startOfWeek = (ts) => {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const startOfMonth = (ts) => {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const aggregateEmotions = (events) => {
  const counts = {};
  events.forEach((e) => {
    counts[e.emotion] = (counts[e.emotion] || 0) + 1;
  });
  return counts;
};

export default function TherapistRobot() {
  const location = useLocation();
  const { logout } = useAuth0();
  const audioRef = useRef(new Audio());

  const handleLogout = () => {
    logout({ returnTo: window.location.origin });
  };

  // Chat state
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "hey, i'm here for you 💬 how are you feeling today? share anything — no judgment.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  // Background emotion detection (hidden webcam)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [lastEmotion, setLastEmotion] = useState("neutral");
  const [lastConfidence, setLastConfidence] = useState(0);
  const [emotionEvents, setEmotionEvents] = useState(() => {
    try {
      const raw = localStorage.getItem("emotion-events");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persist emotion events
  useEffect(() => {
    localStorage.setItem("emotion-events", JSON.stringify(emotionEvents));
  }, [emotionEvents]);

  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Recording functions
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: "audio/webm",
    });
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });
      const formData = new FormData();
      formData.append("audio", audioBlob, "input.webm");

      try {
        const res = await fetch("http://localhost:8000/api/transcribe", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        console.log("Transcribed:", data.text);
        setInput(data.text);
      } catch (err) {
        console.error("Transcription failed:", err);
      }
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  // Load face-api.js and run hidden detection loop
  useEffect(() => {
    let stream;
    let rafId;

    (async () => {
      if (!window.faceapi) {
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = FACE_API_URL;
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }

      const faceapi = window.faceapi;
      const MODEL_URI =
        "https://justadudewhohacks.github.io/face-api.js/models";

      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URI);
      setModelsLoaded(true);

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera permission denied:", err);
        return;
      }

      const detectLoop = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) {
          rafId = requestAnimationFrame(detectLoop);
          return;
        }

        const W = 320;
        const H = 240;
        if (canvas.width !== W) canvas.width = W;
        if (canvas.height !== H) canvas.height = H;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, W, H);

        try {
          const detection = await faceapi
            .detectSingleFace(
              video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
            )
            .withFaceLandmarks()
            .withFaceExpressions();

          if (detection?.expressions) {
            const [emotion, conf] = Object.entries(
              detection.expressions
            ).reduce((a, b) => (a[1] > b[1] ? a : b));
            setLastEmotion(emotion);
            setLastConfidence(conf);

            if (conf >= 0.6) {
              const ts = Date.now();
              setEmotionEvents((prev) => [
                ...prev,
                { emotion, confidence: conf, ts },
              ]);
            }
          }
        } catch {}

        rafId = requestAnimationFrame(detectLoop);
      };

      const video = videoRef.current;
      if (video) {
        video.onloadeddata = () => {
          rafId = requestAnimationFrame(detectLoop);
        };
      }
    })();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      try {
        if (stream) stream.getTracks().forEach((t) => t.stop());
      } catch {
        console.log("Error stopping video stream");
      }
    };
  }, []);

  // Send message via Gemini
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg = { sender: "user", text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    const simpleSentiment = deriveTextEmotion(text);
    if (simpleSentiment) {
      setEmotionEvents((prev) => [
        ...prev,
        { emotion: simpleSentiment, confidence: 0.7, ts: Date.now() },
      ]);
    }

    const systemTone = buildTherapistSystemPrompt(lastEmotion, lastConfidence);

    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: systemTone }],
            },
            {
              role: "model",
              parts: [
                { text: "I understand. I'll adapt my responses accordingly." },
              ],
            },
            {
              role: "user",
              parts: [
                {
                  text: `${text}\n\nRespond in a warm, compact paragraph (1–3 sentences). Use everyday language. Avoid clinical jargon.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(`Gemini API error: ${res.status}`);
      }

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "i'm here with you. let's take one small step — can we try one deep breath together right now? 🌿";

      setMessages((m) => [
        ...m,
        { sender: "bot", text: reply, ts: Date.now() },
      ]);
    } catch (err) {
      console.error("Gemini fetch failed:", err);
      setMessages((m) => [
        ...m,
        {
          sender: "bot",
          text: "hmm, i'm having trouble reaching my brain right now 😅 could you try again in a moment?",
          ts: Date.now(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="chat">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span>Savo</span>
        </div>
        <nav className="nav-menu">
          <Link
            to="/dashboard"
            className={`nav-item ${
              location.pathname === "/" || location.pathname === "/dashboard"
                ? "active"
                : ""
            }`}
          >
            <span>Home</span>
          </Link>
          <Link
            to="/chat"
            className={`nav-item ${
              location.pathname === "/chat" ? "active" : ""
            }`}
          >
            <span>Chat</span>
          </Link>
          <Link
            to="/resources"
            className={`nav-item ${
              location.pathname === "/resources" ? "active" : ""
            }`}
          >
            <span>Resources</span>
          </Link>
        </nav>
        <button onClick={handleLogout} className="logout-btn">
          <span>Logout</span>
        </button>
      </aside>

      <div className="main-content">
        <div className="chat-container">
          {/* Robot Avatar */}
          <div className="robot-avatar">
            <img src="/src/assets/robot-smiling.png" alt="Therapist Robot" />
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`message ${
                  m.sender === "user" ? "message-user" : "message-bot"
                }`}
              >
                {m.text}
              </div>
            ))}
            {typing && <div className="message message-bot">typing…</div>}
          </div>

          {/* Input */}
          <div className="input-container">
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`mic-button ${recording ? "recording" : ""}`}
              title={recording ? "Stop Recording" : "Start Recording"}
            >
              <Mic size={20} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="share your thoughts…"
              className="chat-input"
            />
            <button onClick={sendMessage} className="send-button" title="Send">
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden video & canvas */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
      />
    </div>
  );
}
