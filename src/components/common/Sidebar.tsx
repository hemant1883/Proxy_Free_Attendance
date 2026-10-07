import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Users, GraduationCap, BookOpen, 
  UserCheck, ClipboardList, Radio, Clock, LogOut 
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { role, logout, user } = useAuth();

  const adminNav = [
    { id: 'admin-dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
    { id: 'admin-students', label: 'Students', shortLabel: 'Students', icon: GraduationCap },
    { id: 'admin-teachers', label: 'Teachers', shortLabel: 'Teachers', icon: Users },
    { id: 'admin-courses', label: 'Courses', shortLabel: 'Courses', icon: BookOpen },
    { id: 'admin-enrollments', label: 'Enrollments', shortLabel: 'Enroll', icon: UserCheck },
    { id: 'admin-attendance', label: 'Attendance Records', shortLabel: 'Records', icon: ClipboardList },
  ];

  const teacherNav = [
    { id: 'teacher-dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
    { id: 'teacher-classes', label: 'My Classes', shortLabel: 'Classes', icon: BookOpen },
    { id: 'teacher-live', label: 'Live Session & BLE', shortLabel: 'Live BLE', icon: Radio },
    { id: 'teacher-history', label: 'Attendance History', shortLabel: 'History', icon: Clock },
  ];

  const studentNav = [
    { id: 'student-dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
    { id: 'student-courses', label: 'My Courses', shortLabel: 'Courses', icon: BookOpen },
    { id: 'student-attendance', label: 'Scan & Mark Attendance', shortLabel: 'Scan BLE', icon: Radio },
    { id: 'student-history', label: 'Attendance History', shortLabel: 'History', icon: Clock },
  ];

  const navItems = role === 'ADMIN' ? adminNav : role === 'TEACHER' ? teacherNav : studentNav;

  // On mobile, limit admin items to 4 primary + others or show all 5 with compact styling
  const mobileNavItems = role === 'ADMIN' 
    ? [
        { id: 'admin-dashboard', shortLabel: 'Home', icon: LayoutDashboard },
        { id: 'admin-students', shortLabel: 'Students', icon: GraduationCap },
        { id: 'admin-teachers', shortLabel: 'Teachers', icon: Users },
        { id: 'admin-courses', shortLabel: 'Courses', icon: BookOpen },
        { id: 'admin-attendance', shortLabel: 'Records', icon: ClipboardList },
      ]
    : navItems;

  return (
    <>
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0 min-h-[calc(100vh-4rem)]">
        {/* User summary card */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Logged In Portal
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{user?.name || 'User'}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              {role}
            </span>
          </div>
          <div className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-1.5 py-1 flex items-center justify-around safe-area-bottom">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isPrimaryAction = item.id === 'teacher-live' || item.id === 'student-attendance';

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all rounded-lg ${
                isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1.5 rounded-full transition-all ${
                isPrimaryAction
                  ? isActive
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
                    : 'bg-blue-50 text-blue-600'
                  : isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500'
              }`}>
                <Icon className={`w-5 h-5 ${isPrimaryAction && isActive ? 'animate-pulse' : ''}`} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 line-clamp-1 ${
                isActive ? 'font-bold text-blue-700' : 'font-medium'
              }`}>
                {item.shortLabel || item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
