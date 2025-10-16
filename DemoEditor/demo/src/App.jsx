import React, { useState } from "react";
import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import TeacherMode from "./components/TeacherMode";
import StudentMode from "./components/StudentMode";
import MainNotes from "./components/MainNotes";
import Sidebar from "./components/Sidebar";
import DarkLightTheme from "./components/DarkLightTheme";
import LoginPage from "./components/LoginPage";
import UserProfile from "./components/UserProfile";

function App() {
  const { user, loading, isAuthenticated } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState("student");
  const [teacherMode, setTeacherMode] = useState(false);


  //hardcoding login credentials for now 
  const loginCredentials = {
    student: {
      username: "student",
      password: "studentpass"
    },
    teacher: {
      username: "teacher",
      password: "teacherpass"
    }
  };

  const handleLogin = (userType, userName, password) => {
    if(
      userType === "teacher" && 
      userName === loginCredentials.teacher.username &&
      password === loginCredentials.teacher.password
    )
      {
      setTeacherMode(true)
      setIsLoggedIn(true)
      setUserType("teacher")
      } 
    else if (
        userType === "student" &&
        userName === loginCredentials.student.username &&
        password === loginCredentials.student.password
      )
      {
      setTeacherMode(false)
      setIsLoggedIn(true)
      setUserType("student")  
      }
    else{
      alert(`The username or password does not match any ${userType} account`)
    }
  };

  const handleLogOut = () => {
        setIsLoggedIn(false)
        setTeacherMode(false)
  };

  return (
    <>
      {!isLoggedIn ? (
        <>

          {<Login onLogin={handleLogin} />}
        </>
      ) : (
        <>
        <DarkLightTheme/>

        {/* need to make this its own component too lazy lol*/}
        <button className = "log-out-button" onClick = {handleLogOut}> Log Out </button>


        {teacherMode ? (
          
          <TeacherMode teacherMode={teacherMode} setTeacherMode={setTeacherMode}/>
        ) : (

          <StudentMode/>

        )
        }

        </>



      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
