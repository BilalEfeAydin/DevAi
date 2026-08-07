import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './Signup';
import Login from './Login';
import StudentProfile from './Studentprofile';
import InstructorProfile from './Instructorprofile';
import InstructorCourseDashboard from './InstructorCourseDashboard'; 
import CoursePicker from './CoursePicker';
import Submission from './Submission';
import CourseDescription from './CourseDescription';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile/student" element={<StudentProfile />} />
        <Route path="/profile/instructor" element={<InstructorProfile />} />
        <Route path="/instructor/course-dashboard" element={<InstructorCourseDashboard />} /> {/* NEW */}
        <Route path="/courses" element={<CoursePicker />} />
        <Route path="/submission" element={<Submission />} />
        <Route path="/course-description" element={<CourseDescription />} />

        <Route path="/" element={<Navigate to="/signup" replace />} />
        <Route path="*" element={<Navigate to="/signup" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;