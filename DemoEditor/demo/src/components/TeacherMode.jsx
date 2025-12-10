import React, { useState, useEffect, useRef, useCallback } from "react";
import AnalyticsModal from "./AnalyticsModal";
import AddclassModal from "./AddclassModal";
import StudentAnswersModal from "./StudentAnswersModal";

const STORAGE_KEY = "teacher_questions";

export default function TeacherMode({ teacherMode, setTeacherMode }) {
  const [showAnswersModal, setShowAnswersModal] = useState(false);
  const isEndingRef = useRef(false);
  const [inputValue, setInputValue] = useState("");
  const [duration, setDuration] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  
  // Load questions from local storage
  const [questions, setQuestions] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Error loading questions:", e);
    }
    return [];
  });

  const [activeQuestion, setActiveQuestion] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [studentsResponded, setStudentsResponded] = useState(0);
  const [expectedStudents, setExpectedStudents] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);

  // --- Helper Functions ---

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Save to local storage on change
  useEffect(() => {
    try {
      if (questions.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
      }
    } catch (e) {
      console.error("Error saving questions:", e);
    }
  }, [questions]);

  const fetchStudentAnswers = useCallback(async (silent = false) => {
    if (!silent) setLoadingAnswer(true);
    try {
      const response = await fetch("http://localhost:8000/api/getStudentAnswers");
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const result = await response.json();

      if (result.status === "success" && result.questions !== undefined) {
        setQuestions((prevQuestions) => {
          const questionMap = new Map();
          // Initialize map with previous questions
          (prevQuestions || []).forEach((q) => questionMap.set(q.question_id, { ...q }));
          
          if (result.questions && result.questions.length > 0) {
            result.questions.forEach((serverQ) => {
              const existing = questionMap.get(serverQ.question_id);
              if (existing) {
                questionMap.set(serverQ.question_id, {
                  ...existing,
                  ...serverQ,
                  // Merge answers logic
                  answers: Array.isArray(serverQ.answers) ? [...serverQ.answers] : existing.answers || [],
                  answer_count: serverQ.answer_count !== undefined ? serverQ.answer_count : (existing.answer_count || 0),
                });
              } else {
                questionMap.set(serverQ.question_id, {
                  ...serverQ,
                  answers: Array.isArray(serverQ.answers) ? [...serverQ.answers] : [],
                  answer_count: serverQ.answer_count || 0,
                });
              }
            });
          }
          
          return Array.from(questionMap.values());
        });
      }
    } catch (error) {
      console.error(`Failed to retrieve answers: ${error}`);
    } finally {
      if (!silent) setLoadingAnswer(false);
    }
  }, []);

  // Poll for status
  useEffect(() => {
    if (!teacherMode) return;

    const pollStatus = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/questionStatus");
        const data = await response.json();

        // Race condition fix
        if (isEndingRef.current) {
          if (data.active) {
            console.log("Server is lagging (still reports active). Ignoring...");
            return; 
          }
          if (!data.active) {
            console.log("Server caught up. Lowering flag.");
            isEndingRef.current = false;
          }
        }

        if (data.active) {
          setActiveQuestion(data.question_id);
          setTimeRemaining(data.time_remaining);
          setStudentsResponded(data.responses_received);
          setExpectedStudents(data.expected_students);

          // Auto-end logic
          if ((data.all_responded && data.expected_students > 0) || 
              (data.time_remaining !== null && data.time_remaining <= 0 && data.duration !== null)) {
            
            console.log("Auto-ending question session.");
            isEndingRef.current = true;
            await fetch("http://localhost:8000/api/endQuestionSession", { method: "POST" });
            setActiveQuestion(null);
            setTimeRemaining(null);
            setTimeout(() => fetchStudentAnswers(true), 100);
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

    // Initial load
    fetchStudentAnswers(false);
    
    // Polling interval
    const interval = setInterval(pollStatus, 1000);
    const refreshInterval = setInterval(() => fetchStudentAnswers(true), 5000);

    return () => {
      clearInterval(interval);
      clearInterval(refreshInterval);
    };
  }, [teacherMode, fetchStudentAnswers]);

  const deleteQuestion = async (questionId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this question and all its answers?")) return;

    try {
      const response = await fetch(`http://localhost:8000/api/deleteQuestion/${questionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
      const result = await response.json();

      if (result.status === "success") {
        setQuestions((prev) => prev.filter((q) => q.question_id !== questionId));
      } else {
        alert(`Failed to delete: ${result.message}`);
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      // Optimistic delete on network error
      setQuestions((prev) => prev.filter((q) => q.question_id !== questionId));
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
      if (durationSeconds !== null) body.duration = durationSeconds;
      
      const response = await fetch("http://localhost:8000/api/createProblem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (result.status === "received" && result.question_id) {
        // Optimistic update
        const newQuestion = {
          question_id: result.question_id,
          prompt: trimmedQuestion,
          answers: [],
          answer_count: 0,
        };
        setQuestions(prev => [newQuestion, ...prev]);
        setInputValue("");
        setDuration("");
        setTimeout(() => fetchStudentAnswers(true), 100);
      }
    } catch (error) {
      console.error("Failed to submit problem:", error);
    }
  };

  return (
    <div className="teacher-mode">
      {teacherMode && (
        <div>
          <div className="Class">
            <div className="classSeccions">
              <h3>Class Sessions</h3>
              <button onClick={() => setShowAddClass(true)}>Add Class Sections</button>
              {showAddClass && <AddclassModal onClose={() => setShowAddClass(false)} />}
            </div>

            {!showAddClass && (
              <div className="teacher-analytics_option">
                <h3>Analytics Data</h3>
                <button onClick={() => setShowAnalytics(true)}>Analytics</button>
                {showAnalytics && <AnalyticsModal onClose={() => setShowAnalytics(false)} />}
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
            <button id="submit-button" type="submit">✅ Submit</button>
          </form>

          {activeQuestion && (
            <div style={{ marginTop: "1.5rem", padding: "15px", backgroundColor: "#e3f2fd", border: "2px solid #2196F3", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.95rem", color: "#666" }}><strong>Active Question in Progress</strong></div>
                <div style={{ display: "flex", gap: "20px", fontSize: "1rem", fontWeight: "bold" }}>
                  <div style={{ color: timeRemaining < 60 ? "#d32f2f" : "#2196F3" }}>
                    ⏱️ Time: {formatTime(timeRemaining)}
                  </div>
                  <div style={{ color: "#4CAF50" }}>
                    👥 Responses: {studentsResponded}/{expectedStudents}
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                   if (window.confirm("End session?")) {
                       isEndingRef.current = true;
                       try {
                           await fetch("http://localhost:8000/api/endQuestionSession", { method: "POST" });
                           setActiveQuestion(null);
                           setTimeRemaining(null);
                           await fetchStudentAnswers(true);
                       } catch(e) { console.error(e); isEndingRef.current = false; }
                   }
                }}
                style={{ padding: "8px 16px", backgroundColor: "#d32f2f", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                ⏹️ End Question
              </button>
            </div>
          )}

          <div className="display-Student-Answers">
            {/* BUTTON GROUP - CENTERED */}
            <div style={{ display: "flex", gap: "15px", marginTop: "2rem", marginBottom: "1rem", justifyContent: "center" }}>
                <button
                  id="get-student-answers-button"
                  onClick={() => fetchStudentAnswers(false)}
                  disabled={loadingAnswer}
                  style={{
                      padding: "10px 20px",
                      cursor: "pointer",
                      backgroundColor: "#f0f0f0",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      color: "#333", // Dark gray text for visibility on light background
                      fontWeight: "600"
                  }}
                >
                  {loadingAnswer ? "Loading..." : "🔄 Refresh Data"}
                </button>

                <button
                  onClick={() => setShowAnswersModal(true)}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                >
                  📂 View Student Answers ({(questions || []).length})
                </button>
            </div>

            {showAnswersModal && (
              <StudentAnswersModal 
                questions={questions || []}
                onClose={() => setShowAnswersModal(false)}
                onDelete={deleteQuestion}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}