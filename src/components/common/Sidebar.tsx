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
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-students', label: 'Students', icon: GraduationCap },
    { id: 'admin-teachers', label: 'Teachers', icon: Users },
    { id: 'admin-courses', label: 'Courses', icon: BookOpen },
    { id: 'admin-enrollments', label: 'Enrollments', icon: UserCheck },
    { id: 'admin-attendance', label: 'Attendance Records', icon: ClipboardList },
  ];

  const teacherNav = [
    { id: 'teacher-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'teacher-classes', label: 'My Classes', icon: BookOpen },
    { id: 'teacher-live', label: 'Live Session & BLE', icon: Radio },
    { id: 'teacher-history', label: 'Attendance History', icon: Clock },
  ];

  const studentNav = [
    { id: 'student-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'student-courses', label: 'My Courses', icon: BookOpen },
    { id: 'student-attendance', label: 'Scan & Mark Attendance', icon: Radio },
    { id: 'student-history', label: 'Attendance History', icon: Clock },
  ];

  const navItems = role === 'ADMIN' ? adminNav : role === 'TEACHER' ? teacherNav : studentNav;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* User summary card */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Logged In Portal
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-bold text-slate-800 text-sm">{user?.name || 'User'}</span>
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
  );
};
