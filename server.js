import express from "express";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import handler from "./api/chat.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

function readAppVersion() {
  try {
    const packageJson = JSON.parse(
      readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
    );
    return packageJson.version || "unknown";
  } catch {
    return "unknown";
  }
}

// LOGGING: Check if API Key exists on startup
if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
  console.log("WARNING: Configure GROQ_API_KEY or GEMINI_API_KEY in your .env file!");
} else {
  console.log("At least one AI provider key detected.");
}

app.post("/api/chat", async (req, res) => {
  console.log(`\nIncoming request for topic: ${req.body.topic}`);
  try {
    await handler(req, res);
  } catch (err) {
    console.error("Handler Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/version", (req, res) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({ version: readAppVersion() });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
