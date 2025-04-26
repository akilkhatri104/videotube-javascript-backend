# Backend Project - Video Platform API

A backend API project built with Node.js, Express, and MongoDB that provides functionality similar to YouTube. This project implements various features like user authentication, video management, likes, comments, tweets, and more.

## Features

- **Authentication & Authorization**
  - User registration and login
  - JWT based authentication
  - Role-based access control
  - OTP-based email verification
  - Secure password management

- **User Operations**
  - Profile management
  - Avatar and cover image upload
  - Watch history tracking

- **Video Management**
  - Video upload and streaming
  - Thumbnail generation
  - Video publishing controls
  - View count tracking

- **Social Features**
  - Comments and replies
  - Like/Unlike videos and comments
  - Channel subscriptions
  - Tweet creation and management

- **Playlist Management**
  - Create and manage playlists
  - Add/remove videos from playlists

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Bcrypt for password hashing
- Cloudinary for media storage
- Multer for file handling

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd Backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=8000
   MONGODB_URI=your_mongodb_connection_string
   CORS_ORIGIN=*
   ACCESS_TOKEN_SECRET=your_access_token_secret
   ACCESS_TOKEN_EXPIRY=1d
   REFRESH_TOKEN_SECRET=your_refresh_token_secret
   REFRESH_TOKEN_EXPIRY=10d
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## API Documentation

The API provides the following main endpoints:

- `POST /api/v1/users/register` - Register new user
- `POST /api/v1/users/login` - Login user
- `GET /api/v1/videos` - Get all videos
- `POST /api/v1/videos` - Upload new video
- `POST /api/v1/comments` - Add comment to video
- `POST /api/v1/likes` - Like/unlike content
- `POST /api/v1/playlist` - Create playlist
- `GET /api/v1/dashboard/stats` - Get channel statistics

For detailed API documentation, refer to the Postman collection or API documentation file.

## Project Structure

```
src/
├── controllers/    # Request handlers
├── models/        # Database models
├── routes/        # API routes
├── middlewares/   # Custom middlewares
├── utils/         # Helper functions
└── app.js         # Express app setup
```
