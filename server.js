import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import handler from "./api/chat.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
);
const appVersion = packageJson.version;

// LOGGING: Check if API Key exists on startup
if (!process.env.GEMINI_API_KEY) {
  console.log("WARNING: GEMINI_API_KEY is not defined in your .env file!");
} else {
  console.log("API Key detected.");
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
  res.json({ version: appVersion });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
