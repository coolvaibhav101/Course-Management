"use client";

import { Info, X } from "lucide-react";
import { useState } from "react";

interface WelcomeBannerProps {
  userName: string;
}

export function WelcomeBanner({ userName }: WelcomeBannerProps) {
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h1 className="text-gray-900 text-2xl font-bold mb-2">
          Welcome back, {userName}!
        </h1>
        <p className="text-gray-600">
          You have 3 upcoming classes this week and 2 pending assignments.
        </p>
      </div>

      {showAnnouncement && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-blue-900">
              <strong>Announcement:</strong> New IT Fundamentals module now
              available in the LMS. Official class start date is January 26,
              2025.
            </p>
          </div>
          <button
            onClick={() => setShowAnnouncement(false)}
            className="text-blue-600 hover:bg-blue-100 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
