import React, { useState } from "react";
//import '/App.css'  from '/App.css'

export default function TeacherMode({ teacherMode, setTeacherMode }) {
  const [inputValue, setInputValue] = useState("");
  const [duration, setDuration] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [studentResponse, setStudentResponse] = useState([]);

  const handleToggle = () => {
    setTeacherMode(!teacherMode);
  };

  //fetch student asnswers from api getStudentAnswers
  const fetchStudentAnswers = async () => {
    setLoadingAnswer(true)
    try {
      const response = await fetch('http://localhost:8000/api/getStudentAnswers')
      if (!response.ok) {
        throw new Error(`Error message: ${response.status} `)
      }
      const result = await response.json()
      console.log('Student answer result:', result)
      if (result.status === 'answers found') {
        setStudentResponse(prev => [...prev, result.answer])
      }
    }
    catch (error) {
      console.error(`Failed to retrieve student answers ${error}`)
    }
    finally {
      setLoadingAnswer(false)
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
      const response = await fetch('http://localhost:8000/api/createProblem', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      console.log('Problem submitted:', result);

      if (result.status === "received") {
        setInputValue("");
        setDuration("");
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

          <div className='display-Student-Answers'>
            <button
              id="get-student-answers-button"
              onClick={fetchStudentAnswers}
              disabled={loadingAnswer}
              style={{ marginTop: '2rem' }}
            >
              {loadingAnswer ? 'Loading...' : '📋 Get student answers'}
            </button>
            {studentResponse.length > 0 && (
              <div>
                <h4>Student Answers:</h4>
                {studentResponse.map((answer, index) => (
                  <div key={index} style={{
                    backgroundColor: '#f0f0f0',
                    padding: '10px',
                    margin: '5px 0',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap'
                  }}>
                    <strong>Answer {index + 1}:</strong>
                    <br />
                    {answer}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
