# Quiz Buddy - Project Documentation

## 📋 Project Overview

**Project Name:** Quiz FiveQ AI (Quiz Buddy)  
**Version:** 1.0.0  
**Type:** Full-Stack Web Application  
**Purpose:** An AI-powered interactive quiz generation platform that dynamically creates 5-question quizzes on any user-specified topic using Google's Gemini AI models.

---

## 🎯 Project Description

Quiz Buddy is a web application that leverages artificial intelligence to generate custom quizzes on demand. Users enter a topic of their choice, and the application uses Google's Gemini AI API to intelligently generate five questions with multiple-choice options, correct answers, and educational explanations. The application features a modern, responsive user interface with real-time scoring, caching mechanisms to optimize API usage, and daily usage limits to prevent abuse.

---

## 🛠️ Technology Stack

### Backend Technologies

#### **Node.js**
- **Version:** Current LTS  
- **Role:** Runtime environment for server-side JavaScript execution
- **Module System:** ES6 modules (import/export syntax)

#### **Express.js**
- **Version:** ^4.18.2
- **Role:** RESTful web framework for handling HTTP requests and responses
- **Usage:**
  - Static file serving (public folder)
  - JSON request/response parsing
  - POST endpoint routing

#### **Google Gemini AI API**
- **Primary Model:** `gemini-2.5-flash`
- **Fallback Model:** `gemini-2.0-flash`
- **API Type:** REST API (HTTP POST requests via Fetch API)
- **Purpose:** AI-powered content generation for quiz questions
- **Response Format:** JSON with strict schema enforcement
- **Features:**
  - Generative AI model for text generation
  - Configurable response MIME type (application/json)
  - Generation config for structured output

#### **dotenv**
- **Version:** ^16.3.1
- **Role:** Environment variable management
- **Usage:** Secure storage of GEMINI_API_KEY

#### **Fetch API**
- **Role:** HTTP client for making requests to Google Gemini API
- **Implementation:** Native browser API in Node.js (v18+)

### Frontend Technologies

#### **HTML5**
- Semantic markup structure
- Meta tags for responsive design
- Accessibility considerations

#### **CSS3**
- **Styling Approach:** Custom properties (CSS variables)
- **Design Patterns:**
  - Glassmorphism (backdrop-filter effects)
  - Gradient backgrounds
  - Smooth transitions and animations
  - Responsive grid layout
- **Color Scheme:**
  - Primary: Cyan (#38bdf8)
  - Success: Green (#22c55e)
  - Error: Red (#ef4444)
  - Background: Dark blue (#0b1120)
  - Text: Light gray (#f1f5f9)

#### **Vanilla JavaScript**
- **No Framework Dependencies**
- **Key Features:**
  - Event handling
  - DOM manipulation
  - Asynchronous fetch operations
  - LocalStorage API usage
  - Quiz state management

#### **Google Fonts**
- **Font Family:** Inter (weights: 400, 500, 600, 700)
- **Purpose:** Modern, professional typography

#### **LocalStorage**
- **Purpose:** Client-side data persistence
- **Usage:**
  - Quiz result caching (reduce API calls for repeat topics)
  - Daily usage tracking (enforces 10-quiz daily limit)
  - Cookie-free data storage

---

## 📁 Project Structure

```
Quiz Buddy/
├── package.json                 # Node.js project metadata and dependencies
├── server.js                    # Express server entry point
├── .env                         # Environment variables (GEMINI_API_KEY)
├── .gitignore                   # Git ignore patterns
├── .git/                        # Git repository
├── node_modules/               # Installed npm dependencies
├── package-lock.json           # Dependency lock file
├── api/
│   └── chat.js                 # REST API handler for quiz generation
└── public/
    └── index.html              # Frontend single-page application
```

### File Descriptions

#### **server.js** (Backend Entry Point)
- Initializes Express application
- Configures middleware (JSON parsing, static file serving)
- Implements `/api/chat` POST endpoint
- Performs API key validation at startup
- Sets server to listen on PORT 3000
- Error handling and request logging

#### **api/chat.js** (API Handler)
- Exports default async handler function
- Receives topic from request body
- Makes HTTP POST request to Google Gemini API
- Implements fallback logic (2.5-flash → 2.0-flash)
- Parses JSON response from AI model
- Returns quiz data as JSON array

#### **public/index.html** (Frontend Application)
- Complete SPA with embedded CSS and JavaScript
- Three main screens:
  - **Setup Screen:** Topic input field and quiz initiation
  - **Loading Screen:** Loading spinner during AI quiz generation
  - **Quiz Screen:** Question display, multiple-choice options, instant feedback
  - **Results Screen:** Final score display and performance feedback
- Client-side state management
- LocalStorage integration for caching and rate limiting

#### **package.json** (Project Configuration)
- Project metadata (name, version)
- Dependency declarations
- NPM scripts configuration

---

## 🔄 API Architecture

### REST API Design

The application uses a **RESTful architecture** with the following characteristics:

#### **Endpoint: POST /api/chat**

**Purpose:** Generate a 5-question quiz on a specified topic

**Request:**
```json
{
  "topic": "space exploration"
}
```

**Response (Success - 200 OK):**
```json
[
  {
    "q": "What is the largest planet in our solar system?",
    "options": ["Jupiter", "Saturn", "Neptune", "Uranus"],
    "answer": 0,
    "explanation": "Jupiter is the largest planet by mass and volume."
  },
  ...
]
```

**Response (Error - 500 Server Error):**
```json
{
  "error": "API Key not found in .env"
}
```

**HTTP Methods:**
- POST: Create new quiz data
