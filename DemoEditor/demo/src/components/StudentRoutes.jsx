import { Routes, Route } from "react-router-dom";
import StudentMode from "./StudentMode";

const StudentRoutes = () => {
  return (
    <Routes>
      <Route path="/student" element={<StudentMode />} />
    </Routes>
  );
};

export default StudentRoutes;
