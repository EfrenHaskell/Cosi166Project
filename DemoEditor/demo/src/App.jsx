import React, { useState } from "react";
import "./App.css";
import Login from "./components/Login";
import TeacherMode from "./components/TeacherMode";
import StudentMode from "./components/StudentMode";
import MainNotes from "./components/MainNotes";
import Sidebar from "./components/Sidebar";
import DarkLightTheme from "./components/DarkLightTheme";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState(null);
  const [teacherMode, setTeacherMode] = useState(false);

  const handleLogin = (type, username, password) => {
    // You can add your hardcoded credentials validation here
    // For now, we'll just accept any non-empty credentials
    console.log(`Login attempt: ${type} - ${username}`);
    
    setIsLoggedIn(true);
    setUserType(type);
    
    if (type === "teacher") {
      setTeacherMode(true);
    } else {
      setTeacherMode(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserType(null);
    setTeacherMode(false);
  };

  return (
    <>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          {/* use to toggle lightmode on and off*/}
          <DarkLightTheme />
          
          {/* Logout button */}
          <div style={{ textAlign: 'right', padding: '10px' }}>
            <button 
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout ({userType})
            </button>
          </div>

          {userType === "teacher" ? (
            <TeacherMode teacherMode={teacherMode} setTeacherMode={setTeacherMode} />
          ) : (
            <StudentMode />
          )}

          <hr />

          {/* the jsx below is for the notes app please do not touch!!!!!! */}

          {/* <div className="notes_app">
            <Sidebar />
            <MainNotes />
          </div> */}
        </>
      )}
    </>
  );
}

export default App;
