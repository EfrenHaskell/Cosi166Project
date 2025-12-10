import React from "react";

export default function StudentCodeOutputModal({ isOpen, onClose, output, error, aiResponse }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Code Output</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Output Section */}
          <div className="output-section">
            <h3>Standard Output</h3>
            <pre className="output-box">
              {output && output.trim() ? output : "(no output)"}
            </pre>
          </div>

          {/* Error Section */}
          {error && error.trim() && (
            <div className="error-section">
              <h3>Errors</h3>
              <pre className="error-box">
                {error}
              </pre>
            </div>
          )}

          {/* AI Response Section */}
          {aiResponse && aiResponse !== "AI analysis unavailable" && (
            <div className="ai-section">
              <h3>AI Feedback</h3>
              <div className="ai-box">
                {aiResponse}
              </div>
            </div>
          )}

          {!output && !error && (
            <div className="no-output">
              Your code executed successfully with no output.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            animation: fadeIn 0.2s ease-in-out;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .modal-content {
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            max-width: 700px;
            width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease-out;
          }

          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 2px solid #f0f0f0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .modal-header h2 {
            margin: 0;
            color: white;
            font-size: 1.5rem;
          }

          .modal-close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: background-color 0.2s;
          }

          .modal-close-btn:hover {
            background-color: rgba(255, 255, 255, 0.2);
          }

          .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
          }

          .output-section,
          .error-section,
          .ai-section {
            margin-bottom: 20px;
          }

          .output-section h3,
          .error-section h3,
          .ai-section h3 {
            color: #333;
            font-size: 1rem;
            margin: 0 0 10px 0;
            font-weight: 600;
          }

          .output-box,
          .error-box,
          .ai-box {
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 12px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.85rem;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: #333;
            max-height: 200px;
            overflow-y: auto;
            margin: 0;
          }

          .error-box {
            background-color: #fff5f5;
            border-color: #ffcccc;
            color: #d32f2f;
          }

          .ai-box {
            background-color: #f0f7ff;
            border-color: #cce7ff;
            color: #1565c0;
            padding: 15px;
            line-height: 1.6;
          }

          .no-output {
            text-align: center;
            color: #999;
            font-style: italic;
            padding: 30px;
            background-color: #fafafa;
            border-radius: 6px;
          }

          .modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #f0f0f0;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
          }

          .close-btn {
            padding: 10px 20px;
            background-color: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: background-color 0.2s;
          }

          .close-btn:hover {
            background-color: #764ba2;
          }

          /* Scrollbar styling */
          .modal-body::-webkit-scrollbar,
          .output-box::-webkit-scrollbar,
          .error-box::-webkit-scrollbar,
          .ai-box::-webkit-scrollbar {
            width: 8px;
          }

          .modal-body::-webkit-scrollbar-track,
          .output-box::-webkit-scrollbar-track,
          .error-box::-webkit-scrollbar-track,
          .ai-box::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }

          .modal-body::-webkit-scrollbar-thumb,
          .output-box::-webkit-scrollbar-thumb,
          .error-box::-webkit-scrollbar-thumb,
          .ai-box::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
          }

          .modal-body::-webkit-scrollbar-thumb:hover,
          .output-box::-webkit-scrollbar-thumb:hover,
          .error-box::-webkit-scrollbar-thumb:hover,
          .ai-box::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
        `}</style>
      </div>
    </div>
  );
}
