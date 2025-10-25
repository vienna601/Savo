from fastapi import APIRouter, Depends
from server.verify_jwt_token import verify_jwt_token
from server.connection import users_collection
from server.user_model import new_user_document
from datetime import datetime

router = APIRouter()

@router.get("/")
def get_or_create_user(user=Depends(verify_jwt_token)):
    """Check if user exists in MongoDB, else create new one"""
    user_id = user["sub"]
    existing_user = users_collection.find_one({"_id": user_id})

    if existing_user:
        # update last active time
        users_collection.update_one(
            {"_id": user_id},
            {"$set": {"updatedAt": datetime.utcnow()}}
        )
        return {"status": "existing", "user": existing_user}

    # create new user
    new_user = new_user_document(user)
    users_collection.insert_one(new_user)
    return {"status": "created", "user": new_user}
