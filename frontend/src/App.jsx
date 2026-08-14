import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './Signup';
import Login from './Login';
import StudentProfile from './Studentprofile';
import InstructorProfile from './Instructorprofile';
import CoursePicker from './CoursePicker';
import Submission from './Submission';
import CourseDescription from './CourseDescription';
import AcceptInvitation from './AcceptInvitation';
import InstructorCourseOverview from './Instructorcourseoverview';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile/student" element={<StudentProfile />} />
        <Route path="/profile/instructor" element={<InstructorProfile />} />
        <Route path="/courses" element={<CoursePicker />} />
        <Route path="/submission" element={<Submission />} />
        <Route path="/course-description" element={<CourseDescription />} />
        <Route path="/invite" element={<AcceptInvitation />} />
        <Route path="/instructor/course-dashboard" element={<InstructorCourseOverview />} />

        {/* Default route: anyone landing on "/" goes to login for now */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Catch-all: unknown URLs fall back to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;