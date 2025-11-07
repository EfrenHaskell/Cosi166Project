import React from "react";

const MainNotes = () => {
  return (
    <div className="main">
      <div className="note_writing">
        <input type="text" id="title" autoFocus />
      
        <textarea id="body" placeholder="Write your notes here"></textarea>
      </div>
      {/* <textarea id="body" placeholder="Write your notes here"></textarea> */}
    </div>
  );
};

export default MainNotes;
