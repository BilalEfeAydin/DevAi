import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './Signup';
import Login from './Login';
import StudentProfile from './Studentprofile';
import InstructorProfile from './Instructorprofile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile/student" element={<StudentProfile />} />
        <Route path="/profile/instructor" element={<InstructorProfile />} />

        {/* Default route: anyone landing on "/" goes to the signup page for now */}
        <Route path="/" element={<Navigate to="/signup" replace />} />

        {/* Catch-all: unknown URLs fall back to signup */}
        <Route path="*" element={<Navigate to="/signup" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;