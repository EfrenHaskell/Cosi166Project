import React, { useState } from "react";
import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import TeacherMode from "./components/TeacherMode";
import StudentMode from "./components/StudentMode";
import MainNotes from "./components/MainNotes";
import Sidebar from "./components/Sidebar";
import DarkLightTheme from "./components/DarkLightTheme";
import LoginPage from "./components/LoginPage";
import UserProfile from "./components/UserProfile";

function AppContent() {
  const { user, loading, isAuthenticated } = useAuth();
  const [teacherMode, setTeacherMode] = useState(false);

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setTeacherMode(user?.role === 'teacher')} />;
  }

  return (
    <>
      {/* use to toggle lightmode on and off*/}
      {<DarkLightTheme/>}

      {/* User Profile and Navigation */}
      <div className="app-header">
        <UserProfile />
      </div>

      {/* Main Content based on user role */}
      {user?.role === 'teacher' ? (
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
