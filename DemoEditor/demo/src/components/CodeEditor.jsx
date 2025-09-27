import { useRef } from 'react'
import Editor from '@monaco-editor/react';

export default function CodeEditor(){
  const editorRef = useRef(null);

  function handleEditorDidMount(editor) {
    editorRef.current = editor;
    console.log('Editor mount succeeded');
  }

  function getEditorValue() {
    const value = editorRef.current?.getValue();
    console.log('Editor content:', value);
    return value;
  }

  const sendCodeSample = async () => {
    const code = getEditorValue()
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");

    try {
      const response = await fetch('http://localhost:9000/api/submitCode', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (result.status === "received") {
        setOutput(result.out || "");
        setError(result.err || "");
      }
    } catch(error) {
      setError('PUT submitCode failed:', error.message);
    }
  };
  
  return (
    <>
      <Editor
        height='500px'
        width='500px'
        defaultLanguage='python'
        defaultValue='// Start coding here!'
        theme='vs-dark'
        onMount={handleEditorDidMount}
      />
      <button onClick={sendCodeSample}>Run!</button>
    </>
  );

}