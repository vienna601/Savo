import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Smile, Heart, Brain } from "lucide-react";
import EmotionGraph from "../components/EmotionGraph.jsx";
import "../styles/AdminEmotions.css";
// Face + Emotion Detection Component
const FaceEmotionDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const labelRef = useRef(null);
  const [confidenceHistory, setConfidenceHistory] = useState([]);

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

            const maxExp = Object.entries(detection.expressions).reduce(
              (a, b) => (a[1] > b[1] ? a : b)
            );
            const [expression, confidence] = maxExp;
            setConfidenceHistory((prev) => [
              ...prev.slice(-200),
              { time: Date.now(), expression, confidence },
            ]);

            label.textContent = `${expression.toUpperCase()} (${(
              confidence * 100
            ).toFixed(1)}%)`;

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

      <div className="camera-wrapper">
        <video ref={videoRef} autoPlay muted />
        <canvas ref={canvasRef} />
      </div>
      <div>
        <EmotionGraph data={confidenceHistory} />
      </div>
    </div>
  );
};

export default FaceEmotionDetector;
