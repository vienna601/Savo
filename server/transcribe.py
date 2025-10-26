from fastapi import APIRouter, UploadFile, File
from transformers import pipeline
import tempfile

router = APIRouter()

transcriber = pipeline("automatic-speech-recognition", model="openai/whisper-tiny.en")
print("✅ Loaded Whisper model")

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(await audio.read())
        filepath = tmp.name

    result = transcriber(filepath)
    text = result.get("text", "").strip()

    return {"text": text}
