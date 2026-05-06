import { useEffect, useMemo, useRef, useState } from "react";

const HISTORY_KEY = "quiz_topic_history";
const QUIZ_HISTORY_KEY = "quiz_recent_runs";
const THEME_KEY = "quiz_theme_mode";
const VERSION_FALLBACK =
  typeof __APP_VERSION__ === "string" && __APP_VERSION__
    ? __APP_VERSION__
    : "v?";

function getCacheKey(topic, difficulty, questionCount) {
  return `cache_${topic}_${difficulty}_${questionCount}`;
}

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(topic) {
  const cleanTopic = topic.trim().toLowerCase();
  if (!cleanTopic) return;

  const existing = readHistory();
  const next = [cleanTopic, ...existing.filter((item) => item !== cleanTopic)].slice(
    0,
    10,
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function readRecentQuizRuns() {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentQuizRun(run) {
  const existing = readRecentQuizRuns();
  const next = [run, ...existing].slice(0, 3);
  localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(next));
  console.log("Saved recent quiz run:", run, "->", next);
}


function formatElapsed(secondsTotal) {
  const minutes = Math.floor(secondsTotal / 60);
  const seconds = secondsTotal % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function toTitleCase(text) {
  return String(text || "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function App() {
  const [screen, setScreen] = useState("setup");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [history, setHistory] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);
  const [quizStartTime, setQuizStartTime] = useState(0);
  const [version, setVersion] = useState(VERSION_FALLBACK);
  const [theme, setTheme] = useState(
    localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light",
  );
  const recentListRef = useRef(null);

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;

  useEffect(() => {
    setHistory(readHistory());
    setRecentRuns(readRecentQuizRuns());
  }, []);

  // Add a mounted class to recent list to stagger animations on changes
  useEffect(() => {
    if (!recentListRef.current) return;
    const el = recentListRef.current;
    el.classList.remove("mounted");
    // frame to allow reflow then add class
    requestAnimationFrame(() => el.classList.add("mounted"));
  }, [recentRuns]);

  function clearRecentRuns() {
    if (!confirm("Clear recent quiz runs? This will remove the Last 3 Quizzes.")) return;
    localStorage.removeItem(QUIZ_HISTORY_KEY);
    setRecentRuns([]);
    console.log("Cleared recent quiz runs");
  }

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const response = await fetch("/api/version", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (!response.ok) throw new Error("Version request failed");
        const data = await response.json();
        setVersion(`v${data.version}`);
      } catch {
        setVersion(VERSION_FALLBACK);
      }
    };

    loadVersion();

    const intervalId = window.setInterval(loadVersion, 30000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadVersion();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const progress = useMemo(() => {
    if (!totalQuestions) return 0;
    return ((currentIdx + 1) / totalQuestions) * 100;
  }, [currentIdx, totalQuestions]);

  async function fetchQuiz(options = { forceFresh: false, config: null }) {
    const selectedConfig = options.config || {
      topic,
      difficulty,
      questionCount,
    };

    const normalizedTopic = String(selectedConfig.topic || "").trim().toLowerCase();
    const chosenDifficulty = selectedConfig.difficulty || difficulty;
    const chosenQuestionCount = Number(selectedConfig.questionCount) || questionCount;

    if (!normalizedTopic) {
      alert("Please enter a topic!");
      return;
    }

    const cacheKey = getCacheKey(
      normalizedTopic,
      chosenDifficulty,
      chosenQuestionCount,
    );

    if (!options.forceFresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setTopic(normalizedTopic);
        setDifficulty(chosenDifficulty);
        setQuestionCount(chosenQuestionCount);
        setQuestions(parsed);
        setCurrentIdx(0);
        setScore(0);
        setSelectedIdx(null);
        setQuizStartTime(Date.now());
        setScreen("quiz");
        saveHistory(normalizedTopic);
        setHistory(readHistory());
        return;
      }
    } else {
      localStorage.removeItem(cacheKey);
    }

    setScreen("loading");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: normalizedTopic,
          difficulty: chosenDifficulty,
          questionCount: chosenQuestionCount,
        }),
      });

      if (!response.ok) {
        let backendMessage = "Failed to generate quiz";
        try {
          const errorData = await response.json();
          if (errorData?.error) backendMessage = errorData.error;
        } catch {
          // Keep generic message when response is not JSON.
        }
        throw new Error(backendMessage);
      }

      const quizData = await response.json();
      if (!Array.isArray(quizData) || quizData.length === 0) {
        throw new Error("Quiz response is empty");
      }

      localStorage.setItem(cacheKey, JSON.stringify(quizData));
      saveHistory(normalizedTopic);
      setHistory(readHistory());
      setTopic(normalizedTopic);
      setDifficulty(chosenDifficulty);
      setQuestionCount(chosenQuestionCount);
      setQuestions(quizData);
      setCurrentIdx(0);
      setScore(0);
      setSelectedIdx(null);
      setQuizStartTime(Date.now());
      setScreen("quiz");
    } catch (error) {
      const extraHint =
        error?.name === "TypeError"
          ? " Please ensure backend is running on http://localhost:3000."
          : "";
      alert(`Error: ${error.message || "Unexpected error."}${extraHint}`);
      setScreen("setup");
    }
  }

  function handleAnswer(choiceIndex) {
    if (selectedIdx !== null) return;

    setSelectedIdx(choiceIndex);
    if (choiceIndex === currentQuestion.answer) {
      setScore((prev) => prev + 1);
    }
  }

  function handleNext() {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedIdx(null);
      return;
    }

    const elapsedSeconds = Math.max(
      0,
      Math.round((Date.now() - quizStartTime) / 1000),
    );
    const nextAccuracy = totalQuestions
      ? Math.round((score / totalQuestions) * 100)
      : 0;

    saveRecentQuizRun({
      topic,
      difficulty,
      questionCount: totalQuestions,
      score,
      accuracy: nextAccuracy,
      timeSpent: elapsedSeconds,
      completedAt: new Date().toISOString(),
    });
    setRecentRuns(readRecentQuizRuns());
    setScreen("results");
  }

  function resultComment(percent) {
    if (percent === 100) return "Perfect score. You nailed it.";
    if (percent >= 80) return "Excellent work. Strong command of this topic.";
    if (percent >= 60) return "Nice progress. Keep practicing to level up.";
    if (percent >= 40) return "Solid start. A quick review will help.";
    return "Keep going. Another round will improve your score.";
  }

  const elapsedSeconds = Math.max(0, Math.round((Date.now() - quizStartTime) / 1000));
  const timeLabel = formatElapsed(elapsedSeconds);
  const accuracy = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;

  const headerTitle =
    screen === "setup"
      ? "Quiz FiveQ AI"
      : screen === "quiz"
        ? toTitleCase(topic)
        : "Quiz Report";

  const headerSubtitle =
    screen === "setup"
      ? "Build sharp knowledge loops with dynamic AI-generated quizzes."
      : screen === "quiz"
        ? `${toTitleCase(difficulty)} mode · ${totalQuestions} questions`
        : "Track performance and jump straight into your next challenge.";

  return (
    <main className="app-shell">
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />
      <section className="card">
        <div className="card-top">
          <div className="top-bar">
            <span className="version-badge">{version}</span>
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              aria-label="Toggle dark and light mode"
            >
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
          <h1>{headerTitle}</h1>
          <p>{headerSubtitle}</p>
        </div>

        {screen === "setup" && (
          <div className="setup-panel">
            <div className="setup-grid">
              <div className="setup-main">
            <label className="field-label" htmlFor="topic">
              Topic
            </label>
            <input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Space, Python, History"
            />

            <div className="selectors-row">
              <div>
                <label className="field-label" htmlFor="difficulty">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="questionCount">
                  Quiz Length
                </label>
                <select
                  id="questionCount"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                </select>
              </div>
            </div>

            {history.length > 0 && recentRuns.length === 0 && (
              <div className="history-panel">
                <p className="field-label">Recent Topics</p>
                <div className="chip-wrap">
                  {history.slice(0, 8).map((item) => (
                    <button
                      key={item}
                      className="topic-chip"
                      type="button"
                      onClick={() => setTopic(item)}
                    >
                      {toTitleCase(item)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="recent-quiz-panel">
              <p className="field-label">Last 3 Quizzes</p>
              <div className="recent-quiz-list" ref={recentListRef}>
                {recentRuns.length > 0 ? (
                  recentRuns.map((run) => (
                    <div key={run.completedAt} className="recent-quiz-item">
                      <div className="recent-quiz-meta">
                        <strong>{toTitleCase(run.topic)}</strong>
                        <span>
                          {run.difficulty} · {run.questionCount}Q · {run.score}/{run.questionCount}
                        </span>
                        <span>
                          {run.accuracy}% · {formatElapsed(run.timeSpent || 0)}
                        </span>
                      </div>
                      <button
                        className="topic-chip"
                        type="button"
                        onClick={() =>
                          fetchQuiz({
                            forceFresh: false,
                            config: {
                              topic: run.topic,
                              difficulty: run.difficulty,
                              questionCount: run.questionCount,
                            },
                          })
                        }
                      >
                        Reuse
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="recent-placeholder">
                    <div className="placeholder-text">No recent quizzes yet.</div>
                      {history.length === 0 ? null : null}
                      {/* When `history` is already shown in the Recent Topics panel we avoid duplicating chips here. */}
                  </div>
                )}
              </div>
            </div>

            <button className="primary-btn" type="button" onClick={() => fetchQuiz()}>
              Generate Quiz
            </button>
              </div>

              <aside className="setup-side">
                <div className="side-stat">
                  <span>Mode</span>
                  <strong>{toTitleCase(difficulty)}</strong>
                </div>
                <div className="side-stat">
                  <span>Length</span>
                  <strong>{questionCount} Questions</strong>
                </div>
                <div className="side-stat">
                  <span>Recent Runs</span>
                  <strong>{recentRuns.length}</strong>
                </div>
                <div className="side-note">
                  Every quiz adapts to your selected difficulty and length. Reuse previous runs instantly from the panel.
                </div>
                <button className="clear-btn" onClick={clearRecentRuns}>
                  Clear Last 3
                </button>
              </aside>
            </div>
          </div>
        )}

        {screen === "loading" && (
          <div className="loading-panel">
            <div className="spinner" />
            <p>Generating your quiz with the latest prompt profile...</p>
          </div>
        )}

        {screen === "quiz" && currentQuestion && (
          <div className="quiz-panel">
            <div className="quiz-meta">
              <span>
                Question {currentIdx + 1}/{totalQuestions}
              </span>
              <span>
                Score {score}/{totalQuestions}
              </span>
            </div>

            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <h2>{currentQuestion.q}</h2>

            <div className="options-grid">
              {currentQuestion.options.map((option, index) => {
                const isCorrectAnswer = index === currentQuestion.answer;
                const isSelected = index === selectedIdx;
                const isWrongChoice = selectedIdx !== null && isSelected && !isCorrectAnswer;
                const isCorrectChoice = selectedIdx !== null && isCorrectAnswer;

                let className = "option-btn";
                if (isCorrectChoice) className += " correct";
                if (isWrongChoice) className += " wrong";

                return (
                  <button
                    key={`${option}-${index}`}
                    className={className}
                    type="button"
                    disabled={selectedIdx !== null}
                    onClick={() => handleAnswer(index)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {selectedIdx !== null && (
              <p className="explanation">
                {selectedIdx === currentQuestion.answer ? "Correct. " : "Incorrect. "}
                {currentQuestion.explanation}
              </p>
            )}

            <button
              className="secondary-btn"
              type="button"
              disabled={selectedIdx === null}
              onClick={handleNext}
            >
              {currentIdx === totalQuestions - 1 ? "See Results" : "Next Question"}
            </button>
          </div>
        )}

        {screen === "results" && (
          <div className="results-panel">
            <h2>
              Final Score {score}/{totalQuestions}
            </h2>
            <p className="result-commentary">{resultComment(accuracy)}</p>

            <div className="result-grid">
              <div>
                <span>Accuracy</span>
                <strong>{accuracy}%</strong>
              </div>
              <div>
                <span>Time</span>
                <strong>{timeLabel}</strong>
              </div>
            </div>

            <div className="result-actions">
              <button
                className="secondary-btn"
                type="button"
                onClick={() => fetchQuiz({ forceFresh: true })}
              >
                Generate New Set
              </button>
              <button className="primary-btn" type="button" onClick={() => setScreen("setup")}
              >
                New Topic
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
