import { useRef, useState } from 'react'
import Editor from '@monaco-editor/react';

export default function CodeEditor( {prompt} ){
  const editorRef = useRef(null);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function handleEditorDidMount(editor) {
    editorRef.current = editor;
    console.log('Editor mount succeeded');
  }

  function getEditorValue() {
    const value = editorRef.current?.getValue();
    console.log('Editor content:', value);
    return value;
  }

  const handleRun = () => {
    sendCodeSample();
    sendStudentCode();
  };

const sendCodeSample = async () => {
    const code = getEditorValue()

    try {
      const response = await fetch('http://localhost:9000/api/submitCode', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ codeSample: {code}, prompt: {prompt}}),
      });
      const result = await response.json();
      if (result.status == "received") {
        setOutput(result.out || "");
        setError(result.err || "");
      }

    } catch(error) {
      setError(error.message);
    }}


  //sends student code to new api endpoint /studentAnswers
  const sendStudentCode = async() => {

    const code = getEditorValue()

    try{
      const response = await fetch('http://localhost:9000/api/studentAnswers', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({studentAnswers : {code}})
      })
      const result = await response.json();

      if(!response.ok){
        throw new Error (`Error status: ${response.status}`)
      }
      if (result.status == "received") {
        setOutput(result.out || "");
        setError(result.err || "");
      }
    }
    catch(error){
        setError(error.message)
    }


  }


  
  return (
    <div>
      <Editor
        height='500px'
        width='500px'
        defaultLanguage='python'
        defaultValue='# Start coding here!'
        theme='vs-dark'
        onMount={handleEditorDidMount}
      />
      <button onClick={handleRun}>Run!</button>
      <div style={{ 
        backgroundColor: "#1e1e1e", 
        color: "#d4d4d4", 
        padding: "10px", 
        marginTop: "10px", 
        height: "150px", 
        width: "500px",
        fontFamily: "monospace",
        borderRadius: "4px",
        overflowY: "auto"
      }}>
        {output && <div>{output}</div>}
        {error && <div style={{color:"red"}}>{error}</div>}
      </div>
    </div>
  );

}