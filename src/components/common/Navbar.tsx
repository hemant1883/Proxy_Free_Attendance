import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, LogOut, BookOpen, User, RotateCcw, Bluetooth, Menu, X, Check } from 'lucide-react';
import { UserRole } from '../../types';

interface NavbarProps {
  onOpenDocs?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDocs }) => {
  const { user, role, logout, quickSwitch, resetDatabase } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRoleSelect = (r: UserRole) => {
    quickSwitch(r);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo and Titles */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">PresenceGuard</span>
                  <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    BLE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Multi-Factor Attendance Verification System
                </p>
              </div>
            </div>

            {/* Middle: Hardware BLE status (desktop) */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Bluetooth className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hardware BLE Active</span>
            </div>

            {/* Right side: Desktop Controls */}
            <div className="hidden md:flex items-center gap-3">
              {/* Quick Role Switcher pills */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
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
                  title="View System Architecture & BLE Specifications"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>Docs</span>
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
                  <div className="text-right">
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

            {/* Mobile Right Controls: Role Badge & Hamburger */}
            <div className="flex items-center gap-2 md:hidden">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {role}
              </span>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{user?.email}</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Role Switcher */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Switch Active Role
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {(['STUDENT', 'TEACHER', 'ADMIN'] as UserRole[]).map((r) => {
                    const isActive = role === r;
                    return (
                      <button
                        key={r}
                        onClick={() => handleRoleSelect(r)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{r} Portal</span>
                        {isActive && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Utility actions */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                {onOpenDocs && (
                  <button
                    onClick={() => {
                      onOpenDocs();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg text-left"
                  >
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Architecture &amp; Docs</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    resetDatabase();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg text-left"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Reset Sample Database</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
