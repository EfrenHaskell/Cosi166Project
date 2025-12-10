import React, { useState, useEffect } from "react";
import CodeEditor from "./CodeEditor";
import TimedCodeEditor from "./TimedCodeEditor";

export default function StudentMode({ email }) {
  const [teacherQuestion, setTeacherQuestion] = useState("");
  const [questionId, setQuestionId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [timeLimit, setTimeLimit] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  const [studentCode, setStudentCode] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showTimedModal, setShowTimedModal] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [pendingDuration, setPendingDuration] = useState(null);

  useEffect(() => {
    fetchProblem();
  }, []);

  const fetchProblem = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8000/api/peekProblem");
      const result = await response.json();
      console.log("Peeked problem:", result);

      if (result.status !== "queue empty") {
        const duration = result.duration;
        console.log("Time (seconds):", duration);

        if (duration != null && duration > 0) {
          setPendingQuestion(result.prompt);
          setPendingDuration(duration);
          // reset submission state for the new incoming timed quiz
          setHasSubmitted(false);
          setShowTimedModal(true);
        } else {
          await fetch("http://localhost:8000/api/getProblem");

          setTeacherQuestion(result.prompt);
          setTimeLimit(null);
          setTimeLeft(null);
          setShowWarning(false);

          setPendingQuestion(null);
          setPendingDuration(null);
          setShowTimedModal(false);
        }
      } else {
        setTeacherQuestion("");
        setTimeLimit(null);
        setTimeLeft(null);
        setShowWarning(false);
        setPendingQuestion(null);
        setPendingDuration(null);
        setShowTimedModal(false);
      }
    } catch (error) {
      console.error("Failed to fetch problem:", error);
      setTeacherQuestion("");
      setTimeLimit(null);
      setTimeLeft(null);
      setShowWarning(false);
      setPendingQuestion(null);
      setPendingDuration(null);
      setShowTimedModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!pendingQuestion) return;

    await fetch("http://localhost:8000/api/getProblem");

    setTeacherQuestion(pendingQuestion);

    // new quiz started — ensure submission state is reset
    setHasSubmitted(false);

    if (pendingDuration != null) {
      setTimeLimit(pendingDuration);
      setTimeLeft(pendingDuration);
      setShowWarning(false);
    } else {
      setTimeLimit(null);
      setTimeLeft(null);
      setShowWarning(false);
    }

    setPendingQuestion(null);
    setPendingDuration(null);
  };

  const handleCancelQuiz = () => {
    setShowTimedModal(false);
    setPendingQuestion(null);
    setPendingDuration(null);
  };

  const submitAnswer = async (codeArg, email) => {
    console.log(email);

    if (hasSubmitted) return;

    const codeToSend =
      codeArg !== undefined && codeArg !== null ? codeArg : studentCode ?? "";

    console.log("Submitting student answer length:", (codeToSend || "").length);

    try {
      const res = await fetch("http://localhost:8000/api/studentAnswers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentAnswers: {
            studentEmail: email,
            code: codeToSend,
          },
        }),
      });

      console.log("Submit HTTP status:", res.status, "ok:", res.ok);
      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        const text = await res.text();
        console.warn(
          "Failed to parse JSON response from /api/studentAnswers, raw text:",
          text,
          parseErr
        );
        data = { raw: text };
      }

      console.log("Answer submit response:", data);

      if (res.ok) {
        setHasSubmitted(true);
        alert("Your answer has been submitted.");
        setShowTimedModal(false);
      } else {
        alert("Submission failed. Check console and try again.");
      }
    } catch (err) {
      console.error("Failed to submit student answer:", err);
      alert("Failed to submit your answer. Please try again.");
    }
    setTeacherQuestion("");
  };

  const handleRefresh = () => {
    fetchProblem();
  };

  const handleTimesUp = async () => {
    console.log("⏰ Time is up!");
    if (!hasSubmitted) {
      console.log(
        "handleTimesUp: calling submitAnswer with current studentCode length:",
        (studentCode || "").length
      );
      submitAnswer(studentCode, email);
      setShowTimedModal(false);

      // Call the API to end the session and categorize skills by competency
      try {
        const response = await fetch("http://localhost:8000/api/endSession", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        console.log("Session end response:", data);

        if (data.status === "success") {
          console.log(
            "Skills categorized by competency:",
            data.categorized_skills
          );
        } else {
          console.warn("Failed to categorize skills:", data.message);
        }
      } catch (err) {
        console.error("Error calling end session:", err);
      }
    } else {
      console.log("handleTimesUp: already submitted, skipping submit.");
      setShowTimedModal(false);

      // Still call the API even if already submitted
      try {
        const response = await fetch("http://localhost:8000/api/endSession", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        console.log("Session end response:", data);
      } catch (err) {
        console.error("Error calling end session:", err);
      }
    }
  };

  useEffect(() => {
    if (!teacherQuestion || timeLimit == null) {
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev == null) return prev;

        const next = prev - 1;

        if (next === 60) {
          setShowWarning(true);
        }

        if (next <= 0) {
          clearInterval(intervalId);
          handleTimesUp();
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [teacherQuestion, timeLimit, hasSubmitted]);

  const formatTime = (secs) => {
    if (timeLimit == null) return "Unlimited";
    if (secs == null) return "--:--";

    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="content-card">
        <h2>Student Mode</h2>
        <div>Loading question...</div>
      </div>
    );
  }

  return (
    <div className="content-card">
      {showTimedModal && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal"
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "1.5rem 1.75rem 1.25rem",
              maxWidth: "1000px",
              width: "90vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setShowTimedModal(false)}
              style={{
                position: "absolute",
                top: "0.75rem",
                left: "50%",
                transform: "translateX(-50%)",
                border: "none",
                background: "transparent",
                fontSize: "1.1rem",
                cursor: "pointer",
                padding: "0.25rem 0.75rem",
                borderRadius: "999px",
                backgroundColor: "#727064",
              }}
            >
              Close quiz
            </button>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ margin: 0 }}>Timed Quiz</h3>
              <div>Time left: {formatTime(timeLeft)}</div>
            </div>

            {pendingQuestion ? (
              <>
                {pendingDuration != null && (
                  <p style={{ marginBottom: "0.75rem" }}>
                    Time limit:{" "}
                    <strong>
                      {Math.max(1, Math.round(pendingDuration / 60))} minute
                      {Math.round(pendingDuration / 60) !== 1 ? "s" : ""}
                    </strong>
                  </p>
                )}
                <p style={{ fontSize: "0.95rem", marginBottom: "1rem" }}>
                  When you click <strong>Start Quiz</strong>, the question will
                  appear and the timer will begin.
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "0.5rem",
                  }}
                >
                  <button id="not-now-button" onClick={handleCancelQuiz}>
                    Not now
                  </button>
                  <button
                    onClick={handleStartQuiz}
                    style={{ fontWeight: 600, backgroundColor: "#727064" }}
                  >
                    Start Quiz
                  </button>
                </div>
              </>
            ) : (
              <>
                {showWarning && timeLimit != null && (
                  <div
                    style={{
                      backgroundColor: "#ffc107",
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      marginBottom: "0.75rem",
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
                    ⏰ Only 1 minute left!
                  </div>
                )}

                <p
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "normal",
                    marginBottom: "1rem",
                    textAlign: "center",
                  }}
                >
                  {teacherQuestion}
                </p>

                
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Standalone modal component — does not rely on StudentMode's internal state.
// Props:
// - onClose: () => void
// - teacherQuestion: string
// - handleRefresh: () => void
// - showTimedModal: boolean
// - submitAnswer: (code, email) => void
// - email: string
export const StudentModal = ({
  onClose,
  email,
}) => {
  const [teacherQuestion, setTeacherQuestion] = useState("");
  const [questionId, setQuestionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLimit, setTimeLimit] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showTimedModal, setShowTimedModal] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [pendingDuration, setPendingDuration] = useState(null);

  useEffect(() => {
    fetchProblem();
  }, []);

  const fetchProblem = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8000/api/peekProblem");
      const result = await response.json();
      console.log("Peeked problem:", result);

      if (result.status !== "queue empty") {
        const duration = result.duration;
        console.log("Time (seconds):", duration);

        if (duration != null && duration > 0) {
          setPendingQuestion(result.prompt);
          setPendingDuration(duration);
          // reset submission state for the new incoming timed quiz
          setHasSubmitted(false);
          setShowTimedModal(true);
        } else {
          await fetch("http://localhost:8000/api/getProblem");

          setTeacherQuestion(result.prompt);
          setTimeLimit(null);
          setTimeLeft(null);
          setShowWarning(false);

          setPendingQuestion(null);
          setPendingDuration(null);
          setShowTimedModal(false);
        }
      } else {
        setTeacherQuestion("");
        setTimeLimit(null);
        setTimeLeft(null);
        setShowWarning(false);
        setPendingQuestion(null);
        setPendingDuration(null);
        setShowTimedModal(false);
      }
    } catch (error) {
      console.error("Failed to fetch problem:", error);
      setTeacherQuestion("");
      setTimeLimit(null);
      setTimeLeft(null);
      setShowWarning(false);
      setPendingQuestion(null);
      setPendingDuration(null);
      setShowTimedModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!pendingQuestion) return;

    await fetch("http://localhost:8000/api/getProblem");

    setTeacherQuestion(pendingQuestion);

    // new quiz started — ensure submission state is reset
    setHasSubmitted(false);

    if (pendingDuration != null) {
      setTimeLimit(pendingDuration);
      setTimeLeft(pendingDuration);
      setShowWarning(false);
    } else {
      setTimeLimit(null);
      setTimeLeft(null);
      setShowWarning(false);
    }

    setPendingQuestion(null);
    setPendingDuration(null);
  };

  const handleCancelQuiz = () => {
    setShowTimedModal(false);
    setPendingQuestion(null);
    setPendingDuration(null);
  };

  const submitAnswer = async (codeArg, email) => {
    console.log(email);

    if (hasSubmitted) return;

    const codeToSend =
      codeArg !== undefined && codeArg !== null ? codeArg : studentCode ?? "";

    console.log("Submitting student answer length:", (codeToSend || "").length);

    try {
      const res = await fetch("http://localhost:8000/api/studentAnswers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentAnswers: {
            studentEmail: email,
            code: codeToSend,
          },
        }),
      });

      console.log("Submit HTTP status:", res.status, "ok:", res.ok);
      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        const text = await res.text();
        console.warn(
          "Failed to parse JSON response from /api/studentAnswers, raw text:",
          text,
          parseErr
        );
        data = { raw: text };
      }

      console.log("Answer submit response:", data);

      if (res.ok) {
        setHasSubmitted(true);
        alert("Your answer has been submitted.");
        setShowTimedModal(false);
      } else {
        alert("Submission failed. Check console and try again.");
      }
    } catch (err) {
      console.error("Failed to submit student answer:", err);
      alert("Failed to submit your answer. Please try again.");
    }
    setTeacherQuestion("");
  };

  const handleRefresh = () => {
    fetchProblem();
  };

  const handleTimesUp = async () => {
    console.log("⏰ Time is up!");
    if (!hasSubmitted) {
      console.log(
        "handleTimesUp: calling submitAnswer with current studentCode length:",
        (studentCode || "").length
      );
      submitAnswer(studentCode, email);
      setShowTimedModal(false);

      // Call the API to end the session and categorize skills by competency
      try {
        const response = await fetch("http://localhost:8000/api/endSession", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        console.log("Session end response:", data);

        if (data.status === "success") {
          console.log(
            "Skills categorized by competency:",
            data.categorized_skills
          );
        } else {
          console.warn("Failed to categorize skills:", data.message);
        }
      } catch (err) {
        console.error("Error calling end session:", err);
      }
    } else {
      console.log("handleTimesUp: already submitted, skipping submit.");
      setShowTimedModal(false);

      // Still call the API even if already submitted
      try {
        const response = await fetch("http://localhost:8000/api/endSession", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        console.log("Session end response:", data);
      } catch (err) {
        console.error("Error calling end session:", err);
      }
    }
  };

  useEffect(() => {
    if (!teacherQuestion || timeLimit == null) {
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev == null) return prev;

        const next = prev - 1;

        if (next === 60) {
          setShowWarning(true);
        }

        if (next <= 0) {
          clearInterval(intervalId);
          handleTimesUp();
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [teacherQuestion, timeLimit, hasSubmitted]);

  const formatTime = (secs) => {
    if (timeLimit == null) return "Unlimited";
    if (secs == null) return "--:--";

    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: "1rem",
      }}
    >
      <div
        className="modal"
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          maxWidth: "1400px",
          width: "100%",
          maxHeight: "92vh",
          overflow: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <div
          className="StudentModal-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <h2 className="StudentModal-title" style={{ margin: 0 }}>
          </h2>
          <button
            className="StudentModal-closeButton"
            onClick={onClose}
            style={{
              background: "black",
              border: "none",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            X
          </button>
        </div>

        <div className="StudentModal-content" style={{ gap: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Student Mode</h3>

          {teacherQuestion ? (
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <p style={{ fontSize: "1.15rem", fontWeight: "normal" }}>
                {teacherQuestion}
              </p>
              <button
                id="refresh-question-button"
                style={{ marginBottom: "1rem" }}
                onClick={handleRefresh}
              >
                🔄 Refresh Question
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <p>No question asked yet</p>
              <button id="check-questions-button" onClick={handleRefresh}>
                📋 Check for Questions
              </button>
            </div>
          )}

          {/* If the timed modal section exists, place it here and make it scroll inside the modal */}
          {showTimedModal && (
            <div style={{ marginBottom: "1rem" }}>
              {/* Placeholder: timed modal UI can be included here if needed */}
            </div>
          )}

          {!showTimedModal && (
            // <div style={{ width: "100%", marginBottom: "1.5rem" }}>
            //   <CodeEditor prompt={teacherQuestion} />
            // </div>
            <div style={{ flex: 1, overflow: "auto" }}>
                  <div style={{ height: "420px" }}>
                    <TimedCodeEditor
                      prompt={teacherQuestion}
                      onCodeChange={setStudentCode}
                      onSubmit={(code) => submitAnswer(code, email)}
                    />
                  </div>
                </div>
          )}
        </div>
      </div>
    </div>
  );
};
