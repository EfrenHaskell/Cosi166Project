"""
OAuth Authentication Module for Google Login
"""

import os
import jwt
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from database import Database
import load


class OAuthService:
    """Google OAuth authentication service"""
    
    def __init__(self):
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.jwt_secret = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
        self.jwt_algorithm = "HS256"
        
        if not self.google_client_id or not self.google_client_secret:
            raise ValueError("Google OAuth credentials not found in environment variables")
    
    async def verify_google_token(self, token: str) -> Dict[str, Any]:
        """
        Verify Google ID token and return user information
        
        Args:
            token: Google ID token from frontend
            
        Returns:
            Dict containing user information from Google
            
        Raises:
            HTTPException: If token verification fails
        """
        try:
            # Verify token with Google
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
                )
                response.raise_for_status()
                user_info = response.json()
            
            # Verify the token is for our application
            if user_info.get("aud") != self.google_client_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token audience"
                )
            
            return user_info
            
        except httpx.HTTPStatusError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Token verification failed: {str(e)}"
            )
    
    def create_jwt_token(self, user_id: int, email: str, role: str) -> str:
        """
        Create JWT token for authenticated user
        
        Args:
            user_id: Database user ID
            email: User email
            role: User role (teacher/student)
            
        Returns:
            JWT token string
        """
        payload = {
            "user_id": user_id,
            "email": email,
            "role": role,
            "exp": datetime.utcnow() + timedelta(hours=24),  # 24 hour expiration
            "iat": datetime.utcnow()
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode JWT token
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload
            
        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )


class UserService:
    """User management service"""
    
    def __init__(self):
        self.db = Database()
    
    def create_or_update_user(self, google_user_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create new user or update existing user from Google OAuth info
        
        Args:
            google_user_info: User information from Google
            
        Returns:
            User information from database
        """
        google_id = google_user_info["sub"]
        email = google_user_info["email"]
        name = google_user_info["name"]
        picture_url = google_user_info.get("picture", "")
        
        try:
            # Check if user exists
            self.db.cursor.execute(
                "SELECT user_id, role FROM users WHERE google_id = %s",
                (google_id,)
            )
            existing_user = self.db.cursor.fetchone()
            
            if existing_user:
                # Update existing user
                user_id, role = existing_user
                self.db.cursor.execute(
                    """UPDATE users 
                       SET email = %s, name = %s, picture_url = %s, updated_at = CURRENT_TIMESTAMP 
                       WHERE user_id = %s""",
                    (email, name, picture_url, user_id)
                )
                self.db.conn.commit()
                return {"user_id": user_id, "email": email, "name": name, "role": role}
            else:
                # Create new user (default role is student)
                self.db.cursor.execute(
                    """INSERT INTO users (google_id, email, name, picture_url, role) 
                       VALUES (%s, %s, %s, %s, 'student')""",
                    (google_id, email, name, picture_url)
                )
                user_id = self.db.cursor.lastrowid
                self.db.conn.commit()
                return {"user_id": user_id, "email": email, "name": name, "role": "student"}
                
        except Exception as e:
            self.db.conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get user information by ID
        
        Args:
            user_id: User ID
            
        Returns:
            User information or None if not found
        """
        try:
            self.db.cursor.execute(
                "SELECT user_id, email, name, picture_url, role FROM users WHERE user_id = %s",
                (user_id,)
            )
            user = self.db.cursor.fetchone()
            
            if user:
                return {
                    "user_id": user[0],
                    "email": user[1],
                    "name": user[2],
                    "picture_url": user[3],
                    "role": user[4]
                }
            return None
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )
    
    def update_user_role(self, user_id: int, new_role: str) -> bool:
        """
        Update user role (teacher/student)
        
        Args:
            user_id: User ID
            new_role: New role ('teacher' or 'student')
            
        Returns:
            True if successful, False otherwise
        """
        if new_role not in ['teacher', 'student']:
            return False
            
        try:
            self.db.cursor.execute(
                "UPDATE users SET role = %s WHERE user_id = %s",
                (new_role, user_id)
            )
            self.db.conn.commit()
            return self.db.cursor.rowcount > 0
            
        except Exception as e:
            self.db.conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )


# Initialize services
oauth_service = OAuthService()
user_service = UserService()
