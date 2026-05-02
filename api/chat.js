export default async function handler(req, res) {
  try {
    const { topic } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey)
      return res.status(500).json({ error: "API Key not found in .env" });

    console.log(`\n--- Generating Quiz for: ${topic} ---`);

    // Using Gemini 2.5 Flash as it is the current standard workhorse
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `Generate a fresh 5-question quiz about "${topic}".
    Make this set meaningfully different from any previous set for the same topic.
    Requirements:
    - Use 5 distinct questions with no repeated wording patterns.
    - Cover different subtopics, facts, or angles within the topic.
    - Start with a varied mix of question types, not always the same first 3 questions.
    - Include a balance of easy, medium, and harder questions.
    - Avoid duplicate concepts, repeated definitions, or nearly identical questions.
    - Each question must have 4 answer options.
    - Return ONLY the raw JSON array.

    JSON schema for each item:
    {
      "q": "question text",
      "options": ["A", "B", "C", "D"],
      "answer": 0,
      "explanation": "brief fact"
    }`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 1.1,
          topP: 0.95,
          topK: 40,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "❌ Primary Model Failed:",
        data.error?.message || "Unknown Error",
      );

      // If 2.5 fails, try to fallback to the stable 2.0 version
      console.log("🔄 Trying fallback to gemini-2.0-flash...");
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 1.1,
            topP: 0.95,
            topK: 40,
          },
        }),
      });

      const fallbackData = await fallbackRes.json();

      if (!fallbackRes.ok) {
        console.error("❌ Both models failed.");
        return res.status(response.status).json({ error: data.error?.message });
      }

      const rawJson = fallbackData.candidates[0].content.parts[0].text;
      const quizData = JSON.parse(rawJson);
      console.log("✅ Quiz Generated Successfully via fallback!");
      return res.status(200).json(quizData);
    }

    // If Primary model worked:
    const rawJson = data.candidates[0].content.parts[0].text;
    const quizData = JSON.parse(rawJson);
    console.log("✅ Quiz Generated Successfully!");
    res.status(200).json(quizData);
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Check terminal for details." });
  }
}
