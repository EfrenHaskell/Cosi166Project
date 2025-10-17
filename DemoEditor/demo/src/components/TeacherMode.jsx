import React, { useState } from "react";

export default function TeacherMode({ teacherMode, setTeacherMode}) {
  const [inputValue, setInputValue] = useState("");

  const handleToggle = () => {
    setTeacherMode(!teacherMode);
  };

  const handleSubmit =  async (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    try {
      const response = await fetch('http://localhost:9000/api/createProblem', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const result = await response.json();
      console.log('Problem submitted:', result);
      
      if (result.status === "received") {
        setInputValue(""); // Clear input after successful submission
        console.log("Problem sent to backend successfully");
      }
    } catch (error) {
      console.error('Failed to submit problem:', error);
    }

  };

  return (
    <div className="teacher-mode">
      <button className="teacherModeButton" onClick={handleToggle}>
        TeacherMode is {teacherMode ? "On" : "Off"}
      </button>

      {teacherMode && (
        <div>
          <h3>Teacher Mode</h3>
          <form className="questionForm" onSubmit={handleSubmit}>
            <input
              class="teacherInput"
              value={inputValue}
              placeholder="Enter question here"
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit">Submit</button>
          </form>
        </div>
      )}
    </div>
  );
}
