import React, { useState, useEffect } from "react"; 
import CodeEditor from "./CodeEditor";


export default function StudentMode(){

    const [teacherQuestion, setTeacherQuestion] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProblem();
    }, []);

    const fetchProblem = async () => {
        
        try {
            setLoading(true);
            const response = await fetch('http://localhost:9000/api/getProblem');
            const result = await response.json();
            console.log('Fetched problem:', result);
            
            if (result.status !== "queue empty") {
                setTeacherQuestion(result.prompt);
            }
        } catch (error) {
            console.error('Failed to fetch problem:', error);
            setTeacherQuestion("");
        } finally {
            setLoading(false);
        }
    };

    // Fetch the latest question from the backend
    const handleRefresh = () => {
        fetchProblem();
    };

    if (loading) {
        return (
            <div className="student-mode">
                <h3>Student Mode</h3>
                <div>Loading question...</div>
            </div>
        );
    }

    return(
        <div className="student-mode">
            <h3>Student Mode</h3>
            {teacherQuestion ? 
            (<div> 
                <p>{teacherQuestion}</p>
                <button onClick={handleRefresh}>Refresh Question</button>
            </div>) : 
            (<div>
                No question asked yet
                <button onClick={handleRefresh}>Check for Questions</button>
            </div>)}
            <CodeEditor prompt={teacherQuestion}/>
        </div>
    );
}