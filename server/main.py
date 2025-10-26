from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server import emotions
from server import users, emotions

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    #allow default port of react dev server
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(emotions.router, prefix="/api", tags=["Emotions"])