# Quiz FiveQ AI

## 📋 Project Overview

**Project Name:** Quiz FiveQ AI

**Version:** 3.1.0

**Type:** Full-Stack Web Application

**Purpose:** An AI-powered interactive quiz generation platform that creates custom multiple-choice quizzes on any user-specified topic.

---

## 🎯 Project Description

Quiz FiveQ generates quizzes on demand using Groq first and Google Gemini as an automatic fallback. Users can choose a topic, difficulty, and quiz length, then receive questions with multiple-choice options, correct answers, and explanations. The app includes a responsive interface, real-time scoring, local quiz caching, recent-run history, theme preferences, and daily usage controls.

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

#### **AI Providers**
- **Primary:** Groq `openai/gpt-oss-120b`
- **Fallback:** Google Gemini `gemini-3.8-flash`
- **API Type:** REST API (HTTP POST requests via Fetch API)
- **Purpose:** AI-powered content generation for quiz questions
- **Provider Format:** JSON object containing a `questions` array
- **API Format:** JSON array of quiz questions
- **Features:**
  - Generative AI model for text generation
  - Structured JSON output
  - Automatic fallback when the primary provider is unavailable
  - Retries with exponential backoff for temporary provider failures

#### **dotenv**
- **Version:** ^16.3.1
- **Role:** Environment variable management
- **Usage:** Secure storage of GROQ_API_KEY and GEMINI_API_KEY

#### **Fetch API**
- **Role:** HTTP client for making requests to AI providers
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

#### **React**
- **Build Tool:** Vite
- **Key Features:**
  - Event handling
  - Component-based UI
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
Quiz FiveQ/
├── package.json                 # Node.js project metadata and dependencies
├── server.js                    # Express server entry point
├── .env                         # Local environment variables (not committed)
├── api/
│   ├── chat.js                 # Provider orchestration and quiz API
│   └── version.js              # Application version API
├── src/
│   ├── App.jsx                 # Main React application
│   └── styles.css              # Application styles
├── vite.config.js              # Vite build and local API proxy
├── vercel.json                 # Vercel build configuration
└── public/                     # Vite production output
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
- Tries Groq first, then Google Gemini as a fallback
- Retries temporary provider failures with exponential backoff and timeout
- Parses JSON response from AI model
- Returns quiz data as JSON array

#### **src/App.jsx** (Frontend Application)
- React single-page application
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
- Development, build, and preview scripts

---

## 🔄 API Architecture

### REST API Design

The application uses a **RESTful architecture** with the following characteristics:

#### **Endpoint: POST /api/chat**

**Purpose:** Generate a 5, 10, or 15-question quiz on a specified topic

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

**Response (Error - 503 Service Unavailable):**
```json
{
  "error": "The AI services are temporarily unavailable. Please wait a moment and try again."
}
```

**HTTP Methods:**
- POST: Create new quiz data

## 💻 Local Development

### Prerequisites

- Node.js 18 or newer
- A Groq API key
- A Gemini API key for fallback (recommended)

Create a local `.env` file in the project root:

```text
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

At least one key is required. Groq is tried first; Gemini is used when Groq
fails or is unavailable. The keys must remain server-side and must not be
added to frontend code or committed to Git.

Install dependencies and start both the API server and Vite:

```bash
npm install
npm run dev:full
```

Open [http://localhost:5173](http://localhost:5173). The Express API runs on
port 3000, and Vite proxies `/api` requests to it.

Other useful commands:

```bash
npm run server  # Start only the Express API
npm run dev     # Start only the Vite frontend
npm run build   # Create the production build
npm run preview # Preview the production build locally
```

## 🚀 Deploying to Vercel

1. Push this repository to GitHub and import it into Vercel.
2. Keep the framework preset as **Vite**. The repository's `vercel.json` runs
   `npm run build` and serves the generated `public` directory.
3. In **Project Settings → Environment Variables**, add:

   ```text
   GROQ_API_KEY=your_groq_key
   GEMINI_API_KEY=your_gemini_key
   ```

   Groq is tried first. Gemini is used when Groq is unavailable. At least one
   key is required; configure both for automatic fallback.
4. Redeploy after saving the environment variables.

The keys are read only by the serverless functions in `api/` and are never
exposed to the browser. For local development, copy `.env.example` to `.env`
and add the keys there, then run `npm run dev:full`.
