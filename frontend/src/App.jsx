import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './Signup';
import Login from './Login';
import AuthGuard from './AuthGuard';
import StudentProfile from './Studentprofile';
import InstructorProfile from './Instructorprofile';
import InstructorDashboard from './InstructorDashboard';
import CoursePicker from './CoursePicker';
import Submission from './Submission';
import CourseDescription from './CourseDescription';
import AcceptInvitation from './AcceptInvitation';
import InstructorCourseOverview from './InstructorCourseOverview';
import RegisterCourse from './RegisterCourse';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/invite" element={<AcceptInvitation />} />

        {/* Student-only routes */}
        <Route path="/profile/student" element={<AuthGuard allowedRoles={['student']}><StudentProfile /></AuthGuard>} />
        <Route path="/courses" element={<AuthGuard allowedRoles={['student']}><CoursePicker /></AuthGuard>} />
        <Route path="/submission" element={<AuthGuard allowedRoles={['student']}><Submission /></AuthGuard>} />
        <Route path="/course-description" element={<AuthGuard allowedRoles={['student']}><CourseDescription /></AuthGuard>} />

        {/* Instructor-only routes */}
        <Route path="/profile/instructor" element={<AuthGuard allowedRoles={['instructor']}><InstructorProfile /></AuthGuard>} />
        <Route path="/instructor/dashboard" element={<AuthGuard allowedRoles={['instructor']}><InstructorDashboard /></AuthGuard>} />
        <Route path="/instructor/course-dashboard" element={<AuthGuard allowedRoles={['instructor']}><InstructorCourseOverview /></AuthGuard>} />
        <Route path="/register-course" element={<AuthGuard allowedRoles={['instructor']}><RegisterCourse /></AuthGuard>} />

        {/* Default route: anyone landing on "/" goes to login for now */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;