import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserRole } from '../../types';

export const LoginPage: React.FC<{ onOpenDocs?: () => void }> = ({ onOpenDocs }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (roleOrUser: string) => {
    if (roleOrUser === 'ADMIN') {
      setEmail('admin@college.com');
      setPassword('admin123');
    } else if (roleOrUser === 'TEACHER_CSE') {
      setEmail('teacher@college.com');
      setPassword('teacher123');
    } else if (roleOrUser === 'TEACHER_BSC') {
      setEmail('teacher.bsc@college.com');
      setPassword('teacher123');
    } else if (roleOrUser === 'STUDENT_OM') {
      setEmail('om@college.com');
      setPassword('student123');
    } else {
      setEmail('student@college.com');
      setPassword('student123');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md mb-3">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">PresenceGuard</h1>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Multi-Factor Presence Verification Attendance System
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
          <span>Physical BLE Proximity Verification</span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Institutional Email
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@college.com"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Login Quick Pick */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Project Evaluation Demo Accounts</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('ADMIN')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
              >
                <div className="text-xs font-bold text-slate-800">Admin</div>
                <div className="text-[10px] text-slate-500">Full System Control</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('TEACHER_CSE')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
              >
                <div className="text-xs font-bold text-slate-800">Teacher (CSE)</div>
                <div className="text-[10px] text-slate-500">Prof. Sharma (CS301)</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('TEACHER_BSC')}
                className="p-2 border border-emerald-200 bg-emerald-50/30 rounded-lg text-left hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
              >
                <div className="text-xs font-bold text-emerald-900">Teacher (B.Sc.)</div>
                <div className="text-[10px] text-emerald-700">Dr. Malhotra (BSC101)</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('STUDENT')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
              >
                <div className="text-xs font-bold text-slate-800">Student (CSE)</div>
                <div className="text-[10px] text-slate-500">Hemant (21CSE101)</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('STUDENT_OM')}
                className="p-2 border border-indigo-200 bg-indigo-50/30 rounded-lg text-left hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <div className="text-xs font-bold text-indigo-900">Student (B.Sc.)</div>
                <div className="text-[10px] text-indigo-700">Om (21BSC101)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Documentation Link */}
        {onOpenDocs && (
          <div className="mt-4 text-center">
            <button
              onClick={onOpenDocs}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline inline-flex items-center gap-1"
            >
              View System Architecture &amp; Phase 2 BLE Specification
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
