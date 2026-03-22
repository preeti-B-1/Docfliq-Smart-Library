from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class OAuthLogin(BaseModel):
    email: EmailStr
    name: str
    oauth_provider: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    token: str
    user: UserResponse
