from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
import tempfile
import uvicorn

# Load Whisper model once at startup (tiny for speed, change to base/small/medium for accuracy)
print("Loading Whisper model…")
transcriber = pipeline("automatic-speech-recognition", model="openai/whisper-tiny.en")
print("✅ Whisper ready.")

app = FastAPI()

# Allow requests from React frontend (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # you can restrict this later
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    try:
        # Save uploaded audio to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(await audio.read())
            temp_path = tmp.name

        # Transcribe audio
        result = transcriber(temp_path)
        text = result.get("text", "").strip()

        return JSONResponse({"text": text})
    except Exception as e:
        print("❌ Transcription error:", e)
        return JSONResponse({"error": "transcription failed"}, status_code=500)
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080, reload=True)