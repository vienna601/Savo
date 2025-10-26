from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server import emotions
from server import users, emotions, transcribe,tts
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    #allow default port of react dev server
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory="/tmp"), name="static")
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(emotions.router, prefix="/api", tags=["Emotions"])
app.include_router(transcribe.router, prefix="/api", tags=["Transcribe"])
app.include_router(tts.router, prefix="/api", tags=["TTS"])