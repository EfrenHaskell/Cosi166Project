
import { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({ prompt }) {
  const editorRef = useRef(null);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function handleEditorDidMount(editor) {
    editorRef.current = editor;
  }

  function getEditorValue() {
    const value = editorRef.current?.getValue();
    return value;
  }

  const handleRun = () => {
    sendCodeSample();
    sendStudentCode();
  };

  const sendCodeSample = async () => {
    const code = getEditorValue();
    try {
      const response = await fetch('http://localhost:9000/api/submitCode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codeSample: { code }, prompt }),
      });
      const result = await response.json();
      if (result.status === "received") {
        setOutput(result.out || "");
        setError(result.err || "");
      }
    } catch (error) {
      setError(error.message);
    }
  };

  // sends student code to new api endpoint /studentAnswers
  const sendStudentCode = async () => {
    const code = getEditorValue();
    try {
      const response = await fetch('http://localhost:9000/api/studentAnswers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentAnswers: { code } }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(`Error status: ${response.status}`);
      }
      if (result.status === "received") {
        setOutput(result.out || "");
        setError(result.err || "");
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="editor-output-container" style={{ maxWidth: '1300px', margin: '2rem auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="python"
          defaultValue="# Start coding here!"
          theme="vs-dark"
          onMount={handleEditorDidMount}
          style={{ borderRadius: '10px', overflow: 'hidden', width: '100%', height: '100%' }}
        />
  <button style={{ margin: '1rem 0', padding: '0.7rem 2.2rem', fontSize: '1.1rem', borderRadius: '8px', background: '#181818', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} onClick={handleRun}>▶️ Run!</button>
      </div>
      <div style={{ flex: 1, backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '18px 16px', fontFamily: 'monospace', borderRadius: '8px', overflowY: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', minHeight: '100%' }}>
        <h3 style={{ marginTop: 0 }}>Output</h3>
        {output && <div>{output}</div>}
        {error && <div style={{ color: '#ff4d4f' }}>{error}</div>}
      </div>
    </div>
  );
}