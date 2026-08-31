"use client";
import React from "react";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Megaphone,
  Users,
  BarChart3,
  Settings,
  PlusCircle,
  Download,
  TrendingUp,
  Award,
} from "lucide-react";
const page = () => {
  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-gray-900">Announcements</h2>
          <button
            onClick={() => {
              // setCurrentView("create-announcement")
            }}
            className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Create Announcement
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-gray-900 mb-1">Welcome to Spring 2025!</h3>
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                  All Students
                </span>
              </div>
              <span className="text-gray-600">Dec 10, 2024</span>
            </div>
            <p className="text-gray-700">
              Classes begin January 26, 2025. Please review your course schedule
              and prepare for the semester.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-gray-900 mb-1">
                  Tech Academy - New Course Available
                </h3>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                  Tech Academy
                </span>
              </div>
              <span className="text-gray-600">Dec 8, 2024</span>
            </div>
            <p className="text-gray-700">
              A new Python programming course is now available for enrollment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
