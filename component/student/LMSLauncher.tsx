"use client";

import { ExternalLink, BookOpen, Video, FileText, Lock } from "lucide-react";

interface LMSModule {
  id: string;
  title: string;
  status: "active" | "locked";
  progress: number;
  lessons: number;
}

const lmsModules: LMSModule[] = [
  {
    id: "1",
    title: "IT Fundamentals - Complete Course",
    status: "active",
    progress: 65,
    lessons: 45,
  },
  {
    id: "2",
    title: "Python Programming - Beginner to Advanced",
    status: "active",
    progress: 42,
    lessons: 38,
  },
  {
    id: "3",
    title: "AI & Machine Learning Essentials",
    status: "active",
    progress: 28,
    lessons: 52,
  },
  {
    id: "4",
    title: "Career Development Track",
    status: "locked",
    progress: 0,
    lessons: 24,
  },
];

export function LMSLauncher() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-gray-900 text-2xl font-bold">LMS Access</h1>
        <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <ExternalLink className="w-5 h-5" />
          Launch Full LMS Portal
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-900 mb-2 font-medium">
          Single Sign-On (SSO) Enabled
        </h3>
        <p className="text-sm text-blue-800">
          Click &quot;Launch Full LMS Portal&quot; to access all courses with
          automatic authentication. Your progress syncs automatically between
          the portal and LMS.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lmsModules.map((module) => (
          <div
            key={module.id}
            className={`bg-white rounded-lg border-2 p-6 ${
              module.status === "locked"
                ? "border-gray-200 opacity-60"
                : "border-indigo-200 hover:border-indigo-400 transition-colors"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    module.status === "locked" ? "bg-gray-200" : "bg-indigo-100"
                  }`}
                >
                  {module.status === "locked" ? (
                    <Lock className="w-6 h-6 text-gray-600" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-gray-900 font-medium mb-1">
                    {module.title}
                  </h3>
                  <p className="text-sm text-gray-600">{module.lessons} lessons</p>
                </div>
              </div>
            </div>

            {module.status === "active" && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="text-gray-900">{module.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${module.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <Video className="w-4 h-4" />
                    Continue Learning
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {module.status === "locked" && (
              <div className="text-center py-3">
                <p className="text-sm text-gray-600">
                  Complete prerequisites to unlock this module
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-gray-900 text-lg font-semibold mb-4">
          Recent LMS Activity
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-gray-900">Completed: Network Fundamentals - Module 3</p>
              <p className="text-sm text-gray-600">2 hours ago</p>
            </div>
            <span className="text-sm text-green-600">Score: 92%</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-gray-900">Started: Python Control Structures</p>
              <p className="text-sm text-gray-600">Yesterday</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-gray-900">Completed: Database Design Quiz</p>
              <p className="text-sm text-gray-600">3 days ago</p>
            </div>
            <span className="text-sm text-green-600">Score: 88%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
