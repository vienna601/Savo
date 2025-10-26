# server/tts_router.py
from fastapi import APIRouter, Form
from transformers import VitsModel, AutoTokenizer
import scipy.io.wavfile
import torch, os, uuid
import numpy as np
import tempfile

router = APIRouter()

model = VitsModel.from_pretrained("facebook/mms-tts-eng")
tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-eng")
print("✅ Loaded TTS model")
@router.post("/tts")
async def tts(text: str = Form(...)):
    inputs = tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        audio = model(**inputs).waveform.squeeze().cpu().numpy()

    # ✅ Convert to 16-bit PCM (browser playable)
    audio_int16 = (audio * 32767).astype(np.int16)

    filename = f"{uuid.uuid4().hex}.wav"
    filepath = os.path.join("/tmp", filename)

    scipy.io.wavfile.write(filepath, model.config.sampling_rate, audio_int16)

    return {"audio_url": f"/static/{filename}"}

