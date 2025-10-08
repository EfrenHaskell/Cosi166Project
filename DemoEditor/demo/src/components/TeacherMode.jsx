import React, { useState } from "react";

export default function TeacherMode({ teacherMode, setTeacherMode}) {
  const [inputValue, setInputValue] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [studentResponse, setStudentResponse] = useState([]);

  const handleToggle = () => {
    setTeacherMode(!teacherMode);
  };


  const fetchStudentAnswers = async () => {

    setLoadingAnswer(true);

    try {
      const response = await fetch('http://localhost:9000/api/getStudentAnswers');
      const result = await response.json();

      if (result.status === "answers found") {
        setStudentResponse(prev => [...prev, result.answer]);
      } else if (result.status === "answer not found") {
        console.log('No student answers currently');
      }
    } catch (error) {
      console.error('Error fetching student answers:', error);
    } finally {
      setLoadingAnswer(false);
    }

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
          <form onSubmit={handleSubmit}>
            <input
              value={inputValue}
              placeholder="Enter question here"
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit">Submit</button>
          </form>

          <div> 
            <h4> Student Answers</h4>
            <button 
            onClick = {fetchStudentAnswers}
            disabled = {loadingAnswer}>
              {loadingAnswer ? "Loading Answer" : "Refresh Answer"}
            </button>

          {studentResponse.length === 0 ? ( 
            <p> No student answers</p>
          ) : (
            studentResponse.map((answer) => (
              <div>
                {answer}
              </div>
            ))
          )}
          </div>
        </div>
      )}
    </div>
  );
}
