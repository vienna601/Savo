from datetime import datetime

def new_user_document(user_info):
    """Create default user record for new Auth0 logins"""
    return {
        #user info fields
        "_id": user_info["sub"],
        "email": user_info.get("email"),
        "name": user_info.get("name"),
        "emotionList":user_info.get("emotionList"),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
