import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Course } from '../../types';
import { BookOpen, GraduationCap, CheckCircle } from 'lucide-react';

export const StudentCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await api.getCourses();
        setCourses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Registered Curricula</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Academic subjects enrolled for Semester 6 B.Tech Computer Science.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-xs text-slate-400">Loading courses...</div>
        ) : (
          courses.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {c.courseCode}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Semester {c.semester}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-2">{c.courseName}</h3>
                <p className="text-xs text-slate-500 mt-1">Department of Computer Science &amp; Engineering</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> Enrolled
                </span>
                <span className="text-slate-400 text-[11px]">B.Tech CSE</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
