const TRANSIENT_STATUSES = new Set([429, 500, 503]);
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 30000;

function getQuizPrompt(topic, difficulty, questionCount) {
  return `Generate a fresh ${questionCount}-question quiz about "${topic}".
Target difficulty level: ${difficulty}.
Make this set meaningfully different from any previous set for the same topic.
Requirements:
- Use ${questionCount} distinct questions with no repeated wording patterns.
- Cover different subtopics, facts, or angles within the topic.
- Start with a varied mix of question types, not always the same first 3 questions.
- Keep question difficulty consistently aligned to ${difficulty}.
- Avoid duplicate concepts, repeated definitions, or nearly identical questions.
- Each question must have 4 answer options.
- Return ONLY valid JSON in this exact shape: {"questions":[...]}.

JSON schema for each item:
{
  "q": "question text",
  "options": ["A", "B", "C", "D"],
  "answer": 0,
  "explanation": "brief fact"
}`;
}

function extractQuiz(data) {
  const rawJson =
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    data.choices?.[0]?.message?.content;

  if (!rawJson) {
    throw new Error("The AI provider returned no quiz content.");
  }

  const parsed = JSON.parse(rawJson);
  const questions = Array.isArray(parsed) ? parsed : parsed.questions;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("The AI provider returned an invalid quiz.");
  }

  return questions;
}

async function requestProvider(name, url, body, headers) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response;
    let data;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      data = await response.json();
    } catch (error) {
      console.error(`❌ ${name} attempt ${attempt} failed:`, error.message);
      if (attempt === MAX_ATTEMPTS) {
        return null;
      }

      const delayMs = 1000 * 2 ** (attempt - 1);
      console.log(`🔄 Retrying ${name} in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    if (response.ok) {
      return data;
    }

    const message = data.error?.message || "Unknown provider error";
    console.error(`❌ ${name} attempt ${attempt} failed:`, message);

    if (!TRANSIENT_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
      return null;
    }

    const delayMs = 1000 * 2 ** (attempt - 1);
    console.log(`🔄 Retrying ${name} in ${delayMs / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
}

export default async function handler(req, res) {
  try {
    const { topic, difficulty = "medium", questionCount = 5 } = req.body || {};
    const allowedDifficulties = ["easy", "medium", "hard"];
    const allowedQuestionCounts = [5, 10, 15];
    const normalizedDifficulty = String(difficulty || "medium").toLowerCase();
    const normalizedQuestionCount = Number(questionCount) || 5;

    if (!allowedDifficulties.includes(normalizedDifficulty)) {
      return res
        .status(400)
        .json({ error: "difficulty must be easy, medium, or hard" });
    }

    if (!allowedQuestionCounts.includes(normalizedQuestionCount)) {
      return res
        .status(400)
        .json({ error: "questionCount must be one of 5, 10, or 15" });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!groqApiKey && !geminiApiKey) {
      return res.status(500).json({
        error: "Configure GROQ_API_KEY or GEMINI_API_KEY in the deployment environment.",
      });
    }

    console.log(
      `\n--- Generating Quiz for: ${topic} (${normalizedDifficulty}, ${normalizedQuestionCount} questions) ---`,
    );

    const prompt = getQuizPrompt(
      topic,
      normalizedDifficulty,
      normalizedQuestionCount,
    );
    const providers = [
      groqApiKey && {
        name: "Groq",
        apiKey: groqApiKey,
        url: "https://api.groq.com/openai/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: {
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 1.1,
          max_completion_tokens: 2048,
        },
      },
      geminiApiKey && {
        name: "Gemini",
        apiKey: geminiApiKey,
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 1.1,
            topP: 0.95,
            topK: 40,
          },
        },
      },
    ].filter(Boolean);

    for (const [index, provider] of providers.entries()) {
      if (index > 0) {
        console.log(`🔄 Trying fallback to ${provider.name}...`);
      }

      const url =
        provider.name === "Gemini"
          ? `${provider.url}?key=${provider.apiKey}`
          : provider.url;
      const data = await requestProvider(
        provider.name,
        url,
        provider.body,
        provider.headers,
      );

      if (!data) {
        continue;
      }

      try {
        const quizData = extractQuiz(data);
        console.log(
          `✅ Quiz Generated Successfully${index > 0 ? " via fallback" : ""}!`,
        );
        return res.status(200).json(quizData);
      } catch (error) {
        console.error(`❌ ${provider.name} returned invalid JSON:`, error.message);
      }
    }

    return res.status(503).json({
      error:
        "The AI services are temporarily unavailable. Please wait a moment and try again.",
    });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    return res.status(500).json({ error: "Check server logs for details." });
  }
}
