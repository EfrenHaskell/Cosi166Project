# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your application.

## Prerequisites

- Google Cloud Console account
- Application running on localhost or deployed domain

## Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized origins:
     - `http://localhost:3000` (for development)
     - `http://localhost:5173` (for Vite development)
     - Your production domain
   - Add authorized redirect URIs:
     - `http://localhost:3000` (for development)
     - `http://localhost:5173` (for Vite development)
     - Your production domain

## Step 2: Backend Environment Variables

1. Copy `altdemoapi/env.example` to `altdemoapi/.env`
2. Fill in the following variables:

```env
# Database Configuration (already configured)
DB_USER="app_connect"
DB_PASSWORD="cosi-166-connpass"
DB_HOST="localhost"
DB_DATABASE="learning_app"

# OpenAI API Key (if using AI features)
OPEN_AI_API_KEY="your-openai-api-key-here"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

## Step 3: Frontend Environment Variables

1. Copy `demo/env.example` to `demo/.env`
2. Fill in the following variables:

```env
# Google OAuth Client ID (same as backend)
REACT_APP_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# Backend API URL
REACT_APP_API_URL="http://localhost:8000"
```

## Step 4: Install Dependencies

### Backend
```bash
cd altdemoapi
pip install -r requirements.txt
```

### Frontend
```bash
cd demo
npm install
```

## Step 5: Database Setup

1. Make sure MySQL is running
2. Run the database setup (this will create the user tables):

```bash
cd altdemoapi
python -c "from database import Database; Database().__enter__()"
```

## Step 6: Start the Application

### Start Backend
```bash
cd altdemoapi
python run.py
```

### Start Frontend
```bash
cd demo
npm run dev
```

## Step 7: Test the OAuth Flow

1. Open your browser to `http://localhost:5173`
2. You should see the login page with a Google sign-in button
3. Click the button and complete the OAuth flow
4. After successful authentication, you'll be redirected to the main app
5. You can switch between teacher and student roles using the dropdown in the user profile

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/google` - Authenticate with Google OAuth token
- `GET /api/auth/me` - Get current user information
- `PUT /api/auth/role` - Update user role
- `POST /api/auth/logout` - Logout user

### Protected Endpoints

- `GET /api/protected/test` - Test protected route

## Database Schema

The OAuth implementation creates the following tables:

### `users` table
- `user_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `google_id` (VARCHAR(255), UNIQUE, NOT NULL)
- `email` (VARCHAR(255), UNIQUE, NOT NULL)
- `name` (VARCHAR(255), NOT NULL)
- `picture_url` (VARCHAR(500))
- `role` (ENUM('teacher', 'student'), DEFAULT 'student')
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### `user_sessions` table
- `session_id` (INT, PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (INT, FOREIGN KEY)
- `jwt_token` (VARCHAR(500), NOT NULL)
- `expires_at` (TIMESTAMP, NOT NULL)
- `created_at` (TIMESTAMP)

## Security Considerations

1. **JWT Secret**: Always use a strong, random JWT secret in production
2. **HTTPS**: Use HTTPS in production for secure token transmission
3. **Token Expiration**: JWT tokens expire after 24 hours
4. **Environment Variables**: Never commit `.env` files to version control
5. **Google Client Secret**: Keep your Google client secret secure

## Troubleshooting

### Common Issues

1. **"Invalid token audience" error**:
   - Ensure the Google Client ID in your environment variables matches the one in Google Cloud Console

2. **"CORS error"**:
   - Make sure your backend is running on the correct port
   - Check that CORS is properly configured in the FastAPI app

3. **"Database connection failed"**:
   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure the database exists

4. **"Google sign-in button not appearing"**:
   - Check browser console for JavaScript errors
   - Verify `REACT_APP_GOOGLE_CLIENT_ID` is set correctly
   - Ensure the domain is authorized in Google Cloud Console

### Debug Mode

To enable debug logging, set the following environment variable in your backend `.env`:

```env
DEBUG=true
```

This will provide more detailed error messages in the console.

## Production Deployment

When deploying to production:

1. Update authorized origins in Google Cloud Console
2. Use environment-specific database credentials
3. Use a strong JWT secret
4. Enable HTTPS
5. Update `REACT_APP_API_URL` to your production backend URL
6. Consider using a reverse proxy (nginx) for better security

## Support

If you encounter issues:

1. Check the browser console for frontend errors
2. Check the backend logs for API errors
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed
5. Check that the database is properly initialized
