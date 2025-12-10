import React, { useState } from "react";

const StudentAnswersModal = ({ questions, onClose, onDelete }) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);

  const toggleQuestion = (id) => {
    setExpandedQuestionId(expandedQuestionId === id ? null : id);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "8px",
          width: "80%",
          maxWidth: "800px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            borderBottom: "1px solid #eee",
            paddingBottom: "10px",
          }}
        >
          <h2 style={{ margin: 0 }}>Student Answers Repository</h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#666",
            }}
          >
            ✖
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div style={{ overflowY: "auto", paddingRight: "5px" }}>
          {questions.length > 0 ? (
            questions.map((question) => (
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
                {/* Question Row (Clickable) */}
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
                    <strong style={{ fontSize: "1.1rem", display: "block", marginBottom: "4px" }}>
                      {question.prompt}
                    </strong>
                    <span style={{ fontSize: "0.85rem", color: "#666" }}>
                      {question.answer_count || question.answers?.length || 0} answers
                    </span>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Stop row toggle when clicking delete
                        onDelete(question.question_id, e);
                      }}
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.85rem",
                        backgroundColor: "#ff4d4f",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      🗑️
                    </button>
                    <span style={{ fontSize: "1.2rem", color: "#888" }}>
                      {expandedQuestionId === question.question_id ? "▼" : "▶"}
                    </span>
                  </div>
                </div>

                {/* Expanded Answers Area */}
                {expandedQuestionId === question.question_id && (
                  <div style={{ padding: "15px", backgroundColor: "#fff", borderTop: "1px solid #eee" }}>
                    {question.answers && question.answers.length > 0 ? (
                      <div>
                        {question.answers.map((answerObj, index) => {
                          // Handle both string answers and object answers (if you updated session.py)
                          const answerText = typeof answerObj === 'object' ? answerObj.code : answerObj;
                          const studentId = typeof answerObj === 'object' ? answerObj.student_id : `Student ${index + 1}`;

                          return (
                            <div
                              key={`${question.question_id}-answer-${index}`}
                              style={{
                                backgroundColor: "#f9f9f9",
                                padding: "12px",
                                margin: "8px 0",
                                borderRadius: "6px",
                                border: "1px solid #e0e0e0",
                              }}
                            >
                              <div style={{fontWeight: "bold", fontSize: "0.85rem", color: "#555", marginBottom: "5px"}}>
                                {studentId}:
                              </div>
                              <pre
                                style={{
                                  margin: 0,
                                  whiteSpace: "pre-wrap",
                                  wordWrap: "break-word",
                                  fontSize: "0.9rem",
                                  fontFamily: "monospace",
                                  color: "#333"
                                }}
                              >
                                {answerText}
                              </pre>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: "#999", fontStyle: "italic", padding: "10px" }}>
                        No answers submitted for this question yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", color: "#666", padding: "40px" }}>
              <p>No questions found in history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAnswersModal;