import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, LogOut, BookOpen, User, RotateCcw, Bluetooth } from 'lucide-react';
import { UserRole } from '../../types';

interface NavbarProps {
  onOpenDocs?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDocs }) => {
  const { user, role, logout, quickSwitch, resetDatabase } = useAuth();

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Titles */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-slate-900 tracking-tight">PresenceGuard</span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-sm bg-emerald-100 text-emerald-800">
                    Live BLE
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Multi-Factor Attendance Verification System
                </p>
              </div>
            </div>

            {/* Middle: Hardware BLE status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Bluetooth className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hardware BLE Active</span>
            </div>

            {/* Right side: Quick Role Switcher, Docs, User Menu */}
            <div className="flex items-center gap-3">
              {/* Quick Role Switcher pills for easy testing */}
              <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium px-2 text-[11px]">Role Switch:</span>
                {(['ADMIN', 'TEACHER', 'STUDENT'] as UserRole[]).map((r) => {
                  const isActive = role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => quickSwitch(r)}
                      className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>

              {onOpenDocs && (
                <button
                  onClick={onOpenDocs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  title="View System Architecture, Database Schema, and Phase 2 BLE Roadmap"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Architecture &amp; Docs</span>
                </button>
              )}

              {/* Reset Data button */}
              <button
                onClick={resetDatabase}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Reset sample database to default state"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* User Profile / Logout */}
              {user && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="hidden lg:block text-right">
                    <div className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</div>
                    <div className="text-[11px] text-blue-600 font-medium">{user.role}</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
                    <User className="w-4 h-4" />
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Log out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

    </>
  );
};
