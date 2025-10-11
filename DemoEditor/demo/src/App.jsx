import React, { useState } from "react";
import "./App.css";
import TeacherMode from "./components/TeacherMode";
import StudentMode from "./components/StudentMode";
import MainNotes from "./components/MainNotes";
import Sidebar from "./components/Sidebar";

function App() {
  const [teacherMode, setTeacherMode] = useState(false);

  return (
    <>
      {/* make basic  login feature that goes to teacher mode or student mode based on sign information provided*/}
      <TeacherMode teacherMode={teacherMode} setTeacherMode={setTeacherMode} />

      {!teacherMode && <StudentMode />}

      <hr />

      {/* the jsx below is for the notes app please do not touch!!!!!! */}

      {/* <div className="notes_app">
        <Sidebar />
        <MainNotes />
      </div> */}
    </>
  );
}

export default App;
