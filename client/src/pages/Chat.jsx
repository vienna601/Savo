import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Smile, Heart, Brain } from "lucide-react";

// Face + Emotion Detection Component
const FaceEmotionDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    const loadModelsAndStart = async () => {
      const faceapi = window.faceapi;
      if (!faceapi) {
        console.error("face-api.js not found!");
        return;
      }

      const label = labelRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      let currentEmotionColor = "yellow";

      label.textContent = "Loading models...";
      await faceapi.nets.tinyFaceDetector.loadFromUri("https://justadudewhohacks.github.io/face-api.js/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("https://justadudewhohacks.github.io/face-api.js/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("https://justadudewhohacks.github.io/face-api.js/models");
      label.textContent = "Models loaded, starting camera...";

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      video.onloadeddata = async () => {
        async function detectLoop() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

          if (detection) {
            const landmarks = detection.landmarks.positions;
            landmarks.forEach((pt) => {
              ctx.fillStyle = currentEmotionColor;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
              ctx.fill();
            });

            const maxExp = Object.entries(detection.expressions).reduce((a, b) =>
              a[1] > b[1] ? a : b
            );
            const [expression, confidence] = maxExp;
            label.textContent = `${expression.toUpperCase()} (${(confidence * 100).toFixed(1)}%)`;

            const colorMap = {
              happy: "#00ff00",
              sad: "#3399ff",
              angry: "#ff3333",
              default: "yellow",
            };
            currentEmotionColor = colorMap[expression] || colorMap.default;
            label.style.color = currentEmotionColor;
            label.style.textShadow = `0 0 15px ${currentEmotionColor}`;
          } else {
            label.textContent = "No face detected";
            currentEmotionColor = "gray";
          }

          requestAnimationFrame(detectLoop);
        }
        detectLoop();
      };
    };

    loadModelsAndStart();
  }, []);

  return (
    <div className="camera-container">
      <h2>Emotion Detection</h2>
      <div id="expressionLabel" ref={labelRef}>
        Loading models...
      </div>
      <video ref={videoRef} width="640" height="480" autoPlay muted></video>
      <canvas ref={canvasRef} width="640" height="480"></canvas>
    </div>
  );
};

// Main Therapist Robot
const TherapistRobot = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentView, setCurrentView] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");

  const handleTurnOn = () => {
    setIsActive(true);
    setMessages([
      {
        text: "Hello there. I'm here to listen. How are you feeling right now?",
        sender: "bot",
      },
    ]);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    setMessages((prev) => [...prev, { text: userInput, sender: "user" }]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { text: "I understand. Tell me more about how you feel.", sender: "bot" },
      ]);
    }, 1000);
    setUserInput("");
  };

  if (!isActive) {
    return (
      <div className="welcome-screen">
        <div className="logo-circle">
          <MessageCircle size={64} />
        </div>
        <h1>Therapist Robot</h1>
        <p>Your personal emotional support companion.</p>
        <button onClick={handleTurnOn}>Start Session</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <MessageCircle size={24} />
          <h2>Therapist Robot</h2>
        </div>
        <nav>
          <button
            onClick={() => setCurrentView("chat")}
            className={currentView === "chat" ? "active" : ""}
          >
            Chat
          </button>
          <button
            onClick={() => setCurrentView("emotion")}
            className={currentView === "emotion" ? "active" : ""}
          >
            Emotion
          </button>
        </nav>
      </header>

      <main>
        {currentView === "chat" ? (
          <div className="chat-section">
            <div className="messages">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`message ${msg.sender === "user" ? "user" : "bot"}`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="input-bar">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type your message..."
              />
              <button onClick={handleSendMessage}>
                <Send size={20} />
              </button>
            </div>
          </div>
        ) : (
          <FaceEmotionDetector />
        )}
      </main>
    </div>
  );
};

export default TherapistRobot;

/* ---------- CSS STYLING ---------- */
const style = document.createElement("style");
style.textContent = `
  body { margin:0; font-family: 'Inter', sans-serif; background:#f9fafb; color:#333; }
  .welcome-screen { height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
  .logo-circle { background:linear-gradient(135deg, #4f46e5, #9333ea); border-radius:50%; width:120px; height:120px; display:flex; align-items:center; justify-content:center; color:white; margin-bottom:20px; }
  .welcome-screen button { background:linear-gradient(135deg, #4f46e5, #9333ea); border:none; padding:12px 32px; border-radius:30px; color:white; font-size:1rem; cursor:pointer; transition:0.3s; }
  .welcome-screen button:hover { transform:scale(1.05); }

  .app-container { display:flex; flex-direction:column; height:100vh; }
  header { background:white; display:flex; justify-content:space-between; align-items:center; padding:12px 20px; box-shadow:0 1px 4px rgba(0,0,0,0.1); }
  .logo { display:flex; align-items:center; gap:10px; font-weight:bold; color:#4f46e5; }
  nav button { background:none; border:none; margin:0 6px; padding:8px 16px; border-radius:6px; cursor:pointer; color:#555; }
  nav button.active { background:#eef2ff; color:#4f46e5; font-weight:600; }

  .chat-section { flex:1; display:flex; flex-direction:column; background:#f9fafb; }
  .messages { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; }
  .message { padding:10px 16px; border-radius:16px; max-width:60%; }
  .message.bot { background:white; align-self:flex-start; border:1px solid #ddd; }
  .message.user { background:linear-gradient(135deg,#4f46e5,#9333ea); color:white; align-self:flex-end; }
  .input-bar { display:flex; padding:12px; background:white; border-top:1px solid #ddd; }
  .input-bar input { flex:1; padding:10px 16px; border:1px solid #ccc; border-radius:20px; outline:none; }
  .input-bar button { margin-left:8px; background:linear-gradient(135deg,#4f46e5,#9333ea); border:none; border-radius:50%; color:white; padding:10px; cursor:pointer; }

  .camera-container { position:relative; text-align:center; background:black; color:white; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  video, canvas { position:absolute; top:80px; left:50%; transform:translateX(-50%) scaleX(-1); }
  #expressionLabel { position:absolute; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.4); padding:8px 16px; border-radius:10px; color:#00ffcc; font-weight:bold; text-shadow:0 0 10px #00ffff; }
`;
document.head.appendChild(style);