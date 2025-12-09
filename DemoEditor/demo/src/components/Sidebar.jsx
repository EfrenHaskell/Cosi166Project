import React from "react";
import { useState } from "react";

const Sidebar = ({ setStudentModalOpen }) => {
  const [open, setOpen] = useState(false);

  const openCodeQuestion = () => {
    if (typeof setStudentModalOpen === "function") setStudentModalOpen(true);
  };

  return (
    <div className="sideBar">
      <div className="sidebar_header">
        <h1>Class Notes</h1>
      </div>

      <div className="notes">
        <div className="note">
          <div
            className="note_title"
            onClick={() => setOpen(!open)}
            style={{ cursor: "pointer" }}
          >
            <p className="title">Class 1</p>
          </div>

          {open && (
            <div className="note_content">
              <button onClick={openCodeQuestion}>Code Question</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
