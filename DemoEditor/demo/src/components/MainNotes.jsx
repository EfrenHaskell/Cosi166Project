import React from "react";

const MainNotes = () => {
  return (
    <div className="main">
      <div className="note_box">
        <div className="note_writing">
          <input type="text" id="title" autoFocus />
        </div>
        <textarea id="body" placeholder="Write your notes here"></textarea>
      </div>
    </div>
  );
};

export default MainNotes;
