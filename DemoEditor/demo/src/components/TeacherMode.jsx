import React, { useState } from "react";
//import '/App.css'  from '/App.css'

export default function TeacherMode({ teacherMode, setTeacherMode}) {
  const [inputValue, setInputValue] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [studentResponse, setStudentResponse] = useState([]);

  const handleToggle = () => {
    setTeacherMode(!teacherMode);
  };

  //fetch student asnswers from api getStudentAnswers
  const fetchStudentAnswers = async () => {
      setLoadingAnswer(true)
      try{
        const response = await fetch('http://localhost:9000/api/getStudentAnswers')
        if(!resonpse.ok){
          throw new Error(`Error message: ${response.status} `)
        }
        const result = await response.json()
        setStudentResponse(prev => [...prev, result])
      }
      catch(error){
        console.error(`Failed to retrieve student answers ${error}`)
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

          <div className = 'display-Student-Answers'>
            <button onClick={fetchStudentAnswers}>
                Get student answers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
