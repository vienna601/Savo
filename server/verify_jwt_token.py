from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer
from jose import JWT
import requests, os
from dotenv import load_dotenv

security = HTTPBearer()
load_dotenv()

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
API_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
ALGORITHMS = ["RS256"]

def verify_jwt_token(token: str = Security(security)):
    """Verify Auth0 JWT and return decoded payload"""
    try:
        #find public keys
        jwks_url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
        jwks = requests.get(jwks_url).json()
        unverified_header = JWT.get_unverified_header(token.credentials)
        rsa_key = next(
            (key for key in jwks["keys"] if key["kid"] == unverified_header["kid"]),
            None
        )

        if not rsa_key:
            raise HTTPException(status_code=401, detail="Invalid token header")
        
        payload = JWT.decode(
            token.credentials,
            key={
                "kty": rsa_key["kty"],
                "kid": rsa_key["kid"],
                "use": rsa_key["use"],
                "n": rsa_key["n"],
                "e": rsa_key["e"],
            },
            algorithms=ALGORITHMS,
            audience=API_AUDIENCE
        )
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Token verification failed")
    

