"use client";

import { useEffect, useState } from "react";
import { MessageSquare, HelpCircle } from "lucide-react";
import { getStudentAnnouncements, type StudentAnnouncement } from "@/src/services/student";
import { SkeletonList } from "@/component/SkeletonLoader";

function formatAnnouncementDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export function MessagingCenter() {
  const [announcements, setAnnouncements] = useState<StudentAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getStudentAnnouncements();
        if (!cancelled) setAnnouncements(data);
      } catch (error) {
        console.error("Failed to fetch announcements:", error);
        if (!cancelled) {
          setAnnouncements([]);
          setError("Announcements could not be loaded. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchData();
    return () => { cancelled = true; };
  }, [attempt]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-gray-900 text-2xl font-bold">Messages & Support</h1>
        <SkeletonList items={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-gray-900 text-2xl font-bold">Messages & Support</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h2 className="text-gray-900 text-lg font-semibold">Inbox</h2>
          </div>

          <div className="space-y-2">
            {error ? (
              <div role="alert" className="text-red-700">
                <p>{error}</p>
                <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-2 underline">Retry</button>
              </div>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-gray-600">No announcements yet.</p>
            ) : announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`p-4 rounded-lg border ${
                  announcement.is_read === false
                    ? "border-indigo-200 bg-indigo-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-gray-900 font-medium">{announcement.title}</h3>
                  <span className="text-xs text-gray-600">{formatAnnouncementDate(announcement.created_at)}</span>
                </div>
                {announcement.sender && <p className="text-sm text-gray-600 mb-1">{announcement.sender}</p>}
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{announcement.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Help & Support */}
        <div className="self-start bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            <h2 className="text-gray-900 text-lg font-semibold">Help & Support</h2>
          </div>

          <h3 className="text-gray-900 font-medium mb-2">Academic Help</h3>
          <p className="text-sm text-gray-600 mb-3">
            Questions about course content or assignments?
          </p>
          <a
            href="tel:+919717910086"
            className="block w-full px-4 py-2 border border-gray-300 text-gray-700 text-center rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Contact Instructor
            <span className="block text-sm mt-1">+91 97179 10086</span>
          </a>
        </div>
      </div>

    </div>
  );
}
