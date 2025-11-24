// TimedCodeEditor.jsx
import { useRef } from "react";
import Editor from "@monaco-editor/react";

export default function TimedCodeEditor({ prompt, onCodeChange, onSubmit }) {
    const editorRef = useRef(null);

    const handleEditorDidMount = (editor) => {
        editorRef.current = editor;
    };

    const getEditorValue = () => editorRef.current?.getValue() ?? "";

    const handleSubmitClick = () => {
        const code = getEditorValue();
        console.log("TimedCodeEditor: Submit clicked, code length:", (code || "").length);
        if (onCodeChange) onCodeChange(code);
        if (onSubmit) onSubmit(code);     
    };

    return (
        <div
            className="timed-editor-container"
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
            <Editor
                height="100%"
                width="100%"
                defaultLanguage="python"
                defaultValue="# Start coding here!"
                theme="vs-dark"
                onMount={handleEditorDidMount}
                onChange={(value) => {
                    if (onCodeChange) {
                        onCodeChange(value ?? "");
                    }
                }}
                style={{
                    borderRadius: "10px",
                    overflow: "hidden",
                    width: "100%",
                    flex: 1,
                }}
            />
            <button
                style={{
                    marginTop: "1rem",
                    alignSelf: "center",
                    padding: "0.7rem 2.2rem",
                    fontSize: "1.1rem",
                    borderRadius: "8px",
                    background: "#727064",
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
                onClick={handleSubmitClick}
            >
                📤 Submit
            </button>
        </div>
    );
}
