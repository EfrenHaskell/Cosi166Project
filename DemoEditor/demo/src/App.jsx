import React, { useState } from "react";
import "./App.css";
//import { GoogleLogin } from "@react-oauth/google";
import Login from "./components/Login";
import TeacherMode from "./components/TeacherMode";
import StudentMode from "./components/StudentMode";
import MainNotes from "./components/MainNotes";
import Sidebar from "./components/Sidebar";
import DarkLightTheme from "./components/DarkLightTheme";
import { StudentModal } from "./components/StudentModeModal";

function App() {
  //const { user, loading, isAuthenticated, logout } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState("student");
  const [teacherMode, setTeacherMode] = useState(false);

  // modal state for student modal
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  //hardcoding login credentials for now
  const loginCredentials = {
    student: {
      username: "student",
      password: "studentpass",
    },
    teacher: {
      username: "teacher",
      password: "teacherpass",
    },
  };

  const handleLogin = (userType, userName, password) => {
    if (
      userType === "teacher" &&
      userName === loginCredentials.teacher.username &&
      password === loginCredentials.teacher.password
    ) {
      setTeacherMode(true);
      setIsLoggedIn(true);
      setUserType("teacher");
    } else if (
      userType === "student" &&
      userName === loginCredentials.student.username &&
      password === loginCredentials.student.password
    ) {
      setTeacherMode(false);
      setIsLoggedIn(true);
      setUserType("student");
    } else {
      alert(`The username or password does not match any ${userType} account`);
    }
  };

  const handleLogOut = () => {
    setIsLoggedIn(false);
    setTeacherMode(false);
  };

  const handleGoogleLogin = (decodedToken) => {
    // Extract user information from Google token
    const email = decodedToken.email;
    const name = decodedToken.name;

    // For now, we'll log them in as a student by default
    // You can customize this logic based on your needs
    setTeacherMode(false);
    setIsLoggedIn(true);
    setUserType("student");

    console.log("Google login successful:", { email, name });
  };

  return (
    <>
      {!isLoggedIn ? (
        <>{<Login onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} />}</>
      ) : (
        <>
          <DarkLightTheme />

          {/* need to make this its own component too lazy lol*/}
          <button className="log-out-button" onClick={handleLogOut}>
            {" "}
            Log Out{" "}
          </button>

          {teacherMode ? (
            <TeacherMode
              teacherMode={teacherMode}
              setTeacherMode={setTeacherMode}
            />
          ) : (
            // <StudentMode />
            <div className="class-container">
              <Sidebar setStudentModalOpen={setStudentModalOpen} />
              <MainNotes />
            </div>
          )}

          {studentModalOpen && (
            <StudentModal
              onClose={() => setStudentModalOpen(false)}
              handleRefresh={() => console.log("refresh from modal")}
            />
          )}
        </>
      )}
    </>
  );
}

export default App;
