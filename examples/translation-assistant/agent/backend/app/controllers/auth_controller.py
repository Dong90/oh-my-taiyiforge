"""Authentication API endpoints."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.middleware.auth import create_access_token, create_refresh_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 1800

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    # In production, verify against database
    access_token = create_access_token({"sub": request.username})
    refresh_token = create_refresh_token({"sub": request.username})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
