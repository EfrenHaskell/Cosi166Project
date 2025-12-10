import React, { useState, useEffect, useRef, useCallback } from "react";
import AnalyticsModal from "./AnalyticsModal";
import AddclassModal from "./AddclassModal";
//import '/App.css'  from '/App.css'

const STORAGE_KEY = "teacher_questions";

export default function TeacherMode({ teacherMode, setTeacherMode }) {
  const [inputValue, setInputValue] = useState("");
  const [duration, setDuration] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [questions, setQuestions] = useState(() => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const loaded = Array.isArray(parsed) ? parsed : [];
        console.log(
          `Loaded ${loaded.length} questions from localStorage on mount`
        );
        return loaded;
      }
    } catch (e) {
      console.error("Error loading questions from localStorage:", e);
    }
    console.log("No questions found in localStorage on mount");
    return [];
  });
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const expandedQuestionIdRef = useRef(null); // Preserve expanded state during refresh

  // Timer and active question tracking
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [studentsResponded, setStudentsResponded] = useState(0);
  const [expectedStudents, setExpectedStudents] = useState(0);

  // Format time in MM:SS format
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };
  
  // Save questions to localStorage whenever they change
  useEffect(() => {
    try {
      if (questions.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
        console.log(`Saved ${questions.length} questions to localStorage`);
      }
    } catch (e) {
      console.error("Error saving questions to localStorage:", e);
    }
  }, [questions]);

  const handleToggle = () => {
    setTeacherMode(!teacherMode);
  };

  //fetch student answers from api getStudentAnswers
  const fetchStudentAnswers = useCallback(async (silent = false) => {
    if (!silent) {
      setLoadingAnswer(true);
    }
    try {
      const response = await fetch(
        "http://localhost:9000/api/getStudentAnswers"
      );
      if (!response.ok) {
        throw new Error(`Error message: ${response.status} `);
      }
      const result = await response.json();

      if (result.status === "success" && result.questions !== undefined) {
        // Preserve expanded state during update
        const currentExpanded = expandedQuestionIdRef.current;

        setQuestions((prevQuestions) => {
          // Always merge, never replace - server data updates existing, but we keep local if server is empty
          const questionMap = new Map();

          // First, add all existing questions (from localStorage/previous state)
          // This ensures we preserve questions even if backend is empty
          prevQuestions.forEach((q) => {
            questionMap.set(q.question_id, {
              ...q,
              answers: Array.isArray(q.answers) ? [...q.answers] : [],
              answer_count:
                q.answer_count ||
                (Array.isArray(q.answers) ? q.answers.length : 0),
            }); // Deep copy to avoid mutations
          });

          // Then, update with server data (server data takes precedence for answers)
          if (result.questions && result.questions.length > 0) {
            result.questions.forEach((serverQ) => {
              const existing = questionMap.get(serverQ.question_id);
              if (existing) {
                // Update existing question with server data (especially answers)
                questionMap.set(serverQ.question_id, {
                  ...existing,
                  ...serverQ,
                  // Ensure answers array is properly updated from server
                  answers: Array.isArray(serverQ.answers)
                    ? [...serverQ.answers]
                    : existing.answers || [],
                  answer_count:
                    serverQ.answer_count !== undefined
                      ? serverQ.answer_count
                      : Array.isArray(serverQ.answers)
                      ? serverQ.answers.length
                      : existing.answer_count || 0,
                });
              } else {
                // New question from server
                questionMap.set(serverQ.question_id, {
                  ...serverQ,
                  answers: Array.isArray(serverQ.answers)
                    ? [...serverQ.answers]
                    : [],
                  answer_count:
                    serverQ.answer_count ||
                    (Array.isArray(serverQ.answers)
                      ? serverQ.answers.length
                      : 0),
                });
              }
            });
          }

          // Convert back to array - preserve original order (no sorting)
          const merged = Array.from(questionMap.values());
          // Maintain order by preserving the order from prevQuestions, then adding new ones
          const final = [];
          const addedIds = new Set();

          // First, add existing questions in their original order
          prevQuestions.forEach((q) => {
            const updated = questionMap.get(q.question_id);
            if (updated) {
              final.push(updated);
              addedIds.add(q.question_id);
            }
          });

          // Then, add any new questions from server that weren't in prevQuestions
          merged.forEach((q) => {
            if (!addedIds.has(q.question_id)) {
              final.push(q);
            }
          });

          // Safety check: If merge resulted in empty but we had questions before, reload from localStorage
          if (final.length === 0 && prevQuestions.length > 0) {
            console.warn(
              "Merge resulted in empty array but had questions before - reloading from localStorage"
            );
            try {
              const stored = localStorage.getItem(STORAGE_KEY);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  console.log(
                    `Reloaded ${parsed.length} questions from localStorage as safety measure`
                  );
                  return parsed;
                }
              }
            } catch (e) {
              console.error("Error reloading from localStorage:", e);
            }
            // If localStorage also fails, return previous questions
            return prevQuestions;
          }

          // Restore expanded state if question still exists
          if (
            currentExpanded &&
            final.some((q) => q.question_id === currentExpanded)
          ) {
            setTimeout(() => {
              setExpandedQuestionId(currentExpanded);
            }, 0);
          }

          return final;
        });
      } else {
        // Backend returned empty or invalid response - don't clear existing questions
        console.warn(
          "Backend returned invalid response, preserving existing questions"
        );
      }
    } catch (error) {
      console.error(`Failed to retrieve student answers ${error}`);
    } finally {
      if (!silent) {
        setLoadingAnswer(false);
      }
    }
  }, []);

  // Load questions on mount and when teacher mode is enabled
  useEffect(() => {
    if (teacherMode) {
      // Initial load
      fetchStudentAnswers(false);

      // Set up auto-refresh every 5 seconds
      const interval = setInterval(() => {
        fetchStudentAnswers(true); // true = silent refresh
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [teacherMode, fetchStudentAnswers]);

  // Poll question status for timer display and auto-end
  useEffect(() => {
    if (!teacherMode) {
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/questionStatus");
        const data = await response.json();
        
        if (data.active) {
          setActiveQuestion(data.question_id);
          setTimeRemaining(data.time_remaining);
          setStudentsResponded(data.responses_received);
          setExpectedStudents(data.expected_students);
          
          // Auto-end question when all students have responded
          if (data.all_responded && data.expected_students > 0) {
            console.log("All students have responded! Auto-ending question session.");
            await fetch("http://localhost:8000/api/endQuestionSession", {
              method: "POST",
            });
            setActiveQuestion(null);
            setTimeRemaining(null);
            
            // Refresh student answers to show final state
            setTimeout(() => {
              fetchStudentAnswers(true);
            }, 100);
          }
          
          // Auto-end when time is up
          if (data.time_remaining !== null && data.time_remaining <= 0 && data.duration !== null) {
            console.log("Time is up! Auto-ending question session.");
            await fetch("http://localhost:8000/api/endQuestionSession", {
              method: "POST",
            });
            setActiveQuestion(null);
            setTimeRemaining(null);
            
            // Refresh student answers
            setTimeout(() => {
              fetchStudentAnswers(true);
            }, 100);
          }
        } else {
          setActiveQuestion(null);
          setTimeRemaining(null);
          setStudentsResponded(0);
          setExpectedStudents(0);
        }
      } catch (error) {
        console.error("Failed to get question status:", error);
      }
    };

    // Poll every 1 second for accurate timer display
    const interval = setInterval(pollStatus, 1000);
    
    // Initial poll
    pollStatus();

    return () => clearInterval(interval);
  }, [teacherMode, fetchStudentAnswers]);

  const toggleQuestion = (questionId) => {
    const newExpandedId = expandedQuestionId === questionId ? null : questionId;
    setExpandedQuestionId(newExpandedId);
    expandedQuestionIdRef.current = newExpandedId; // Store in ref for persistence
  };

  const deleteQuestion = async (questionId, e) => {
    e.stopPropagation(); // Prevent expanding/collapsing when clicking delete

    if (
      !window.confirm(
        "Are you sure you want to delete this question and all its answers?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:9000/api/deleteQuestion/${questionId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Check if response is OK (status 200-299)
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Delete request failed with status ${response.status}:`,
          errorText
        );
        throw new Error(
          `Server returned status ${response.status}: ${errorText}`
        );
      }

      const result = await response.json();
      console.log(`Delete response status: ${result.status}`);
      console.log(`Delete response message: ${result.message}`);

      if (result.status === "success") {
        // Remove from local state
        setQuestions((prevQuestions) => {
          const filtered = prevQuestions.filter(
            (q) => q.question_id !== questionId
          );
          console.log(
            `Deleted question ${questionId}. Remaining: ${filtered.length}`
          );
          return filtered;
        });

        // Clear expanded state if this question was expanded
        if (expandedQuestionId === questionId) {
          setExpandedQuestionId(null);
          expandedQuestionIdRef.current = null;
        }
      } else {
        console.log(`Here is the question id: ${questionId}`);
        console.error("Failed to delete question:", result.message);
        alert(`Failed to delete question: ${result.message}`);
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      // If it's a network error, still remove from local state (idempotent delete)
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        console.warn(
          "Network error during delete, removing from local state anyway"
        );
        setQuestions((prevQuestions) => {
          const filtered = prevQuestions.filter(
            (q) => q.question_id !== questionId
          );
          console.log(
            `Removed question ${questionId} from local state due to network error. Remaining: ${filtered.length}`
          );
          return filtered;
        });

        if (expandedQuestionId === questionId) {
          setExpandedQuestionId(null);
          expandedQuestionIdRef.current = null;
        }
      } else {
        alert(`Error deleting question: ${error.message}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedQuestion = inputValue.trim();
    if (!trimmedQuestion) return;

    const trimmedDuration = duration.trim();
    let durationSeconds = null;

    if (trimmedDuration !== "") {
      const parsed = Number(trimmedDuration);
      if (parsed < 0) {
        alert("Please enter a non-negative number for duration.");
        return;
      }
      durationSeconds = parsed * 60;
    }

    try {
      const body = { prompt: trimmedQuestion };
      if (durationSeconds !== null) {
        body.duration = durationSeconds;
      }
      const response = await fetch("http://localhost:8000/api/createProblem", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      console.log("Problem submitted:", result);

      if (result.status === "received" && result.question_id) {
        // Immediately add the new question to local state
        const newQuestion = {
          question_id: result.question_id,
          prompt: trimmed,
          answers: [],
          answer_count: 0,
        };

        setQuestions((prevQuestions) => {
          // Check if question already exists (shouldn't, but just in case)
          const exists = prevQuestions.some(
            (q) => q.question_id === result.question_id
          );
          if (exists) {
            // Update existing question
            return prevQuestions.map((q) =>
              q.question_id === result.question_id
                ? { ...q, prompt: trimmed }
                : q
            );
          }
          // Add new question at the beginning
          return [newQuestion, ...prevQuestions];
        });

        setInputValue("");
        setDuration("");
        console.log("Problem sent to backend successfully");

        // Also refresh to get any server-side updates and sync
        setTimeout(() => {
          fetchStudentAnswers(true);
        }, 100);
      }
    } catch (error) {
      console.error("Failed to submit problem:", error);
    }
  };

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);

  return (
    <div className="teacher-mode">
      {teacherMode && (
        <div>
          <div className="Class">
            <div className="classSeccions">
              <h3>Class Sessions</h3>
              <button onClick={() => setShowAddClass(true)}>
                Add Class Sections
              </button>
              {showAddClass && (
                <AddclassModal onClose={() => setShowAddClass(false)} />
              )}
            </div>

            {!showAddClass && (
              <div className="teacher-analytics_option">
                <h3>Analytics Data</h3>
                <button onClick={() => setShowAnalytics(true)}>
                  Analytics
                </button>
                {showAnalytics && (
                  <AnalyticsModal onClose={() => setShowAnalytics(false)} />
                )}
              </div>
            )}
          </div>

          <h3>Teacher Mode</h3>
          <form className="questionForm" onSubmit={handleSubmit}>
            <input
              className="teacherInput"
              value={inputValue}
              placeholder="Enter question here"
              onChange={(e) => setInputValue(e.target.value)}
            />
            <input
              className="teacherInput"
              type="number"
              value={duration}
              placeholder="Duration (in minutes)"
              onChange={(e) => setDuration(e.target.value)}
            />
            <button id="submit-button" type="submit">
              ✅ Submit
            </button>
          </form>

          {/* Active Question Timer Display */}
          {activeQuestion && (
            <div
              style={{
                marginTop: "1.5rem",
                marginBottom: "1.5rem",
                padding: "15px",
                backgroundColor: "#e3f2fd",
                border: "2px solid #2196F3",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.95rem", color: "#666", marginBottom: "8px" }}>
                  <strong>Active Question in Progress</strong>
                </div>
                <div style={{ display: "flex", gap: "20px", fontSize: "1rem" }}>
                  {timeRemaining !== null && (
                    <div
                      style={{
                        fontWeight: "bold",
                        color: timeRemaining < 60 ? "#d32f2f" : "#2196F3",
                      }}
                    >
                      ⏱️ Time Remaining: {formatTime(timeRemaining)}
                    </div>
                  )}
                  {expectedStudents > 0 && (
                    <div style={{ color: "#4CAF50", fontWeight: "bold" }}>
                      👥 Responses: {studentsResponded}/{expectedStudents}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  if (
                    window.confirm("Are you sure you want to end this question session?")
                  ) {
                    const response = await fetch("http://localhost:8000/api/endQuestionSession", {
                      method: "POST",
                    });
                    const data = await response.json();
                    console.log("Session end response:", data);
                    setActiveQuestion(null);
                    setTimeRemaining(null);
                    await fetchStudentAnswers(true);
                  }
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#d32f2f",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                ⏹️ End Question
              </button>
            </div>
          )}

          <div className="display-Student-Answers">
            <button
              id="get-student-answers-button"
              onClick={fetchStudentAnswers}
              disabled={loadingAnswer}
              style={{ marginTop: "2rem", marginBottom: "1rem" }}
            >
              {loadingAnswer ? "Loading..." : "🔄 Refresh Student Answers"}
            </button>

            {questions.length > 0 ? (
              <div>
                <h4 style={{ marginBottom: "1rem" }}>Questions and Answers:</h4>
                {questions.map((question) => (
                  <div
                    key={question.question_id}
                    style={{
                      marginBottom: "1rem",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      overflow: "hidden",
                      backgroundColor: "#fff",
                    }}
                  >
                    <div
                      onClick={() => toggleQuestion(question.question_id)}
                      style={{
                        padding: "15px",
                        cursor: "pointer",
                        backgroundColor:
                          expandedQuestionId === question.question_id
                            ? "#f0f0f0"
                            : "#fafafa",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "background-color 0.2s",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: "1.1rem" }}>
                          {question.prompt}
                        </strong>
                        <div
                          style={{
                            marginTop: "5px",
                            fontSize: "0.9rem",
                            color: "#666",
                          }}
                        >
                          {question.answer_count ||
                            question.answers?.length ||
                            0}{" "}
                          {(question.answer_count ||
                            question.answers?.length ||
                            0) === 1
                            ? "answer"
                            : "answers"}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <button
                          onClick={(e) =>
                            deleteQuestion(question.question_id, e)
                          }
                          style={{
                            padding: "5px 10px",
                            fontSize: "0.85rem",
                            backgroundColor: "#ff4d4f",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                          title="Delete this question"
                        >
                          🗑️ Delete
                        </button>
                        <div style={{ fontSize: "1.5rem" }}>
                          {expandedQuestionId === question.question_id
                            ? "▼"
                            : "▶"}
                        </div>
                      </div>
                    </div>

                    {expandedQuestionId === question.question_id && (
                      <div style={{ padding: "15px", backgroundColor: "#fff" }}>
                        {question.answers && question.answers.length > 0 ? (
                          <div>
                            <h5 style={{ marginTop: 0, marginBottom: "10px" }}>
                              Student Answers:
                            </h5>
                            {question.answers.map((answer, index) => (
                              <div
                                key={`${question.question_id}-answer-${index}`}
                                style={{
                                  backgroundColor: "#f9f9f9",
                                  padding: "12px",
                                  margin: "8px 0",
                                  borderRadius: "6px",
                                  fontFamily: "monospace",
                                  whiteSpace: "pre-wrap",
                                  border: "1px solid #e0e0e0",
                                }}
                              >
                                <strong
                                  style={{ color: "#666", fontSize: "0.9rem" }}
                                >
                                  Answer {index + 1}:
                                </strong>
                                <pre
                                  style={{
                                    margin: "8px 0 0 0",
                                    whiteSpace: "pre-wrap",
                                    wordWrap: "break-word",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  {answer}
                                </pre>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: "#999", fontStyle: "italic" }}>
                            No answers yet for this question.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  color: "#999",
                  fontStyle: "italic",
                  marginTop: "1rem",
                }}
              >
                No questions created yet. Create a question to see student
                answers here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
