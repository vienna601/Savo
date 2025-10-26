from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, List
from server.verify_jwt_token import verify_jwt_token
from server.connection import db

router = APIRouter()
emotions_collection = db["emotions"]

class EmotionData(BaseModel):
    emotion: str
    confidence: float
    timestamp: datetime
    expressions: Dict[str, float]
    landmarks: List[Dict[str, float]]

@router.post("/emotions")
async def save_emotion_data(data: EmotionData, token=Depends(verify_jwt_token)):
    """
    Save emotion detection data from the face-api.js
    Store in MongoDB, linked to user by Auth0 sub
    """
    user_id = token["sub"]
    emotion_doc = {
        "user_id": user_id,
        "emotion": data.emotion,
        "confidence": data.confidence,
        "timestamp": data.timestamp,
        "expressions": data.expressions,
        "landmarks": data.landmarks,
        "createdAt": datetime.utcnow(),
    }
    try:
        emotions_collection.insert_one(emotion_doc)
        return {"status": "success", "message": "Emotion data saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")
