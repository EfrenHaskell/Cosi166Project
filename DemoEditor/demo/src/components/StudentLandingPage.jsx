import React, { useState } from "react";

export default function StudentLandingPage({ onClassJoined, studentEmail }) {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinedClasses, setJoinedClasses] = useState([]);

  const handleJoinClass = async (e) => {
    e.preventDefault();
    const trimmedCode = joinCode.trim();
    
    if (!trimmedCode) {
      setError("Please enter a join code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8000/api/joinClass", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ join_code: trimmedCode }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "success" && result.class) {
        // Store joined class info in localStorage
        const classInfo = result.class;
        const newJoinedClasses = [...joinedClasses, classInfo];
        setJoinedClasses(newJoinedClasses);
        localStorage.setItem("joinedClasses", JSON.stringify(newJoinedClasses));
        localStorage.setItem("currentClassId", classInfo.class_id);

        setJoinCode("");
        
        // Notify parent that student has joined a class
        onClassJoined(classInfo);
      } else {
        setError(result.message || "Failed to join class. Check the code and try again.");
      }
    } catch (err) {
      console.error("Error joining class:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-landing-page">
      <div className="landing-container">
        <h2>Welcome, Student!</h2>
        <p>Join a class to get started</p>

        <form className="join-class-form" onSubmit={handleJoinClass}>
          <div className="form-group">
            <label htmlFor="joinCode">Enter Join Code:</label>
            <input
              id="joinCode"
              type="text"
              placeholder="e.g., ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              disabled={loading}
              style={{
                padding: "10px",
                fontSize: "1rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
                width: "100%",
                maxWidth: "300px",
              }}
            />
          </div>

          {error && (
            <div className="error-message" style={{ color: "#d9534f", marginTop: "10px" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "15px",
              padding: "10px 20px",
              backgroundColor: loading ? "#ccc" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: "600",
            }}
          >
            {loading ? "Joining..." : "Join Class"}
          </button>
        </form>

        {joinedClasses.length > 0 && (
          <div className="joined-classes" style={{ marginTop: "30px" }}>
            <h3>Your Classes:</h3>
            {joinedClasses.map((classItem) => (
              <div
                key={classItem.class_id}
                style={{
                  padding: "15px",
                  marginBottom: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#f9f9f9",
                }}
              >
                <strong>{classItem.name}</strong>
                {classItem.section && <p>Section: {classItem.section}</p>}
                {classItem.description && <p>{classItem.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .student-landing-page {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .landing-container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          width: 100%;
          text-align: center;
        }

        .landing-container h2 {
          margin-top: 0;
          color: #333;
          font-size: 2rem;
        }

        .landing-container p {
          color: #666;
          margin-bottom: 30px;
        }

        .join-class-form {
          text-align: left;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
        }

        .error-message {
          padding: 10px;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          text-align: center;
        }

        .joined-classes {
          text-align: left;
        }

        .joined-classes h3 {
          color: #333;
          margin-bottom: 15px;
        }
      `}</style>
    </div>
  );
}
