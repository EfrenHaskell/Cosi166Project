import React, { useState, useEffect } from "react"; 
import CodeEditor from "./CodeEditor";


export default function StudentMode(){

    const [teacherQuestion, setTeacherQuestion] = useState("");
    const [questionId, setQuestionId] = useState(null);
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
                setQuestionId(result.question_id || null);
                console.log('Question ID:', result.question_id);
            } else {
                setTeacherQuestion("");
                setQuestionId(null);
            }
        } catch (error) {
            console.error('Failed to fetch problem:', error);
            setTeacherQuestion("");
            setQuestionId(null);
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
            <div className="content-card">
                <h2>Student Mode</h2>
                <div>Loading question...</div>
            </div>
        );
    }

    return(
        <div className="content-card">
            <h2>Student Mode</h2>
            {teacherQuestion ? 
            (<div style={{ width: '100%', textAlign: 'center', marginBottom: '1.2rem' }}> 
                <p style={{ fontSize: '1.15rem', fontWeight: 'normal' }}>{teacherQuestion}</p>
                <button style={{ marginBottom: '1rem' }} onClick={handleRefresh}>🔄 Refresh Question</button>
            </div>) : 
            (<div style={{ width: '100%', textAlign: 'center', marginBottom: '1.2rem' }}>
                <p>No question asked yet</p>
                <button style={{ marginBottom: '1rem' }} onClick={handleRefresh}>📋 Check for Questions</button>
            </div>)}
            <div style={{ width: '100%', marginBottom: '1.5rem' }}>
                <CodeEditor prompt={teacherQuestion} questionId={questionId}/>
            </div>
        </div>
    );
}