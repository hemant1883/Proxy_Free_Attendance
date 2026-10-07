import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { LoginPage } from './pages/auth/LoginPage';
import { ProjectArchitectureDoc } from './pages/ProjectArchitectureDoc';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StudentsManagement } from './pages/admin/StudentsManagement';
import { TeachersManagement } from './pages/admin/TeachersManagement';
import { CoursesManagement } from './pages/admin/CoursesManagement';
import { EnrollmentsManagement } from './pages/admin/EnrollmentsManagement';
import { AttendanceOverview } from './pages/admin/AttendanceOverview';

// Teacher Pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherClasses } from './pages/teacher/TeacherClasses';
import { LiveAttendanceSession } from './pages/teacher/LiveAttendanceSession';
import { TeacherHistory } from './pages/teacher/TeacherHistory';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentCourses } from './pages/student/StudentCourses';
import { ScanAttendancePage } from './pages/student/ScanAttendancePage';
import { StudentAttendanceHistory } from './pages/student/StudentAttendanceHistory';

const MainAppContent: React.FC = () => {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedSessionId, setSelectedSessionId] = useState<number | undefined>(undefined);
  const [showDocs, setShowDocs] = useState<boolean>(false);

  // Sync default tab when role changes
  useEffect(() => {
    if (role === 'ADMIN') {
      setCurrentTab('admin-dashboard');
    } else if (role === 'TEACHER') {
      setCurrentTab('teacher-dashboard');
    } else if (role === 'STUDENT') {
      setCurrentTab('student-dashboard');
    }
  }, [role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Initializing PresenceGuard...</p>
        </div>
      </div>
    );
  }

  // Not logged in: Show Login Page or Docs
  if (!isAuthenticated) {
    if (showDocs) {
      return (
        <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
          <ProjectArchitectureDoc onClose={() => setShowDocs(false)} />
        </div>
      );
    }
    return <LoginPage onOpenDocs={() => setShowDocs(true)} />;
  }

  // Render current active view
  const renderContent = () => {
    if (showDocs) {
      return <ProjectArchitectureDoc onClose={() => setShowDocs(false)} />;
    }

    // --- ADMIN VIEWS ---
    if (role === 'ADMIN') {
      switch (currentTab) {
        case 'admin-dashboard':
          return <AdminDashboard onNavigate={setCurrentTab} />;
        case 'admin-students':
          return <StudentsManagement />;
        case 'admin-teachers':
          return <TeachersManagement />;
        case 'admin-courses':
          return <CoursesManagement />;
        case 'admin-enrollments':
          return <EnrollmentsManagement />;
        case 'admin-attendance':
          return <AttendanceOverview />;
        default:
          return <AdminDashboard onNavigate={setCurrentTab} />;
      }
    }

    // --- TEACHER VIEWS ---
    if (role === 'TEACHER') {
      switch (currentTab) {
        case 'teacher-dashboard':
          return (
            <TeacherDashboard
              onNavigate={setCurrentTab}
              onSelectSession={(id) => {
                setSelectedSessionId(id);
                setCurrentTab('teacher-live');
              }}
            />
          );
        case 'teacher-classes':
          return (
            <TeacherClasses
              onStartAttendance={(courseId) => {
                setCurrentTab('teacher-live');
              }}
            />
          );
        case 'teacher-live':
          return (
            <LiveAttendanceSession
              sessionId={selectedSessionId}
              onSessionEnded={() => setCurrentTab('teacher-dashboard')}
            />
          );
        case 'teacher-history':
          return <TeacherHistory onSelectSession={setSelectedSessionId} />;
        default:
          return (
            <TeacherDashboard
              onNavigate={setCurrentTab}
              onSelectSession={(id) => {
                setSelectedSessionId(id);
                setCurrentTab('teacher-live');
              }}
            />
          );
      }
    }

    // --- STUDENT VIEWS ---
    if (role === 'STUDENT') {
      switch (currentTab) {
        case 'student-dashboard':
          return <StudentDashboard onNavigate={setCurrentTab} />;
        case 'student-courses':
          return <StudentCourses />;
        case 'student-attendance':
          return <ScanAttendancePage onNavigate={setCurrentTab} />;
        case 'student-history':
          return <StudentAttendanceHistory />;
        default:
          return <StudentDashboard onNavigate={setCurrentTab} />;
      }
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar onOpenDocs={() => setShowDocs(!showDocs)} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto min-w-0">
        {!showDocs && (
          <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />
        )}

        <main className="flex-1 w-full min-w-0 p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
