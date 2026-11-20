"use client";

import { useEffect, useState } from "react";
import { Calendar, Video, Clock } from "lucide-react";
import { getCalendarEvents, CalendarEvent } from "@/src/services/student";
import { SkeletonList } from "@/component/SkeletonLoader";

interface ClassScheduleProps {
  compact?: boolean;
}

const defaultClasses: CalendarEvent[] = [
  {
    id: "1",
    title: "IT Fundamentals - Introduction to Networking",
    type: "instructor-led",
    date: "2024-12-12",
    time: "10:00 AM - 12:00 PM",
    instructor: "Dr. Sarah Johnson",
    zoom_link: "#",
  },
  {
    id: "2",
    title: "Python Programming - Control Flow",
    type: "instructor-led",
    date: "2024-12-13",
    time: "2:00 PM - 4:00 PM",
    instructor: "Prof. Michael Chen",
    zoom_link: "#",
  },
  {
    id: "3",
    title: "AI Fundamentals - Machine Learning Basics",
    type: "self-paced",
    date: "2024-12-14",
    time: "Self-paced",
    instructor: "Online Module",
  },
];

export function ClassSchedule({ compact = false }: ClassScheduleProps) {
  const [classes, setClasses] = useState<CalendarEvent[]>(defaultClasses);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCalendarEvents();
        if (data.length) setClasses(data);
      } catch (error) {
        console.error("Failed to fetch calendar events:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const displayClasses = compact ? classes.slice(0, 2) : classes;

  if (loading) {
    return <SkeletonList items={3} />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-indigo-600" />
        <h2 className="text-gray-900 text-lg font-semibold">Class Schedule</h2>
      </div>

      <div className="space-y-4">
        {displayClasses.map((classItem) => (
          <div
            key={classItem.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-gray-900 font-medium mb-1">
                  {classItem.title}
                </h3>
                <p className="text-sm text-gray-600">{classItem.instructor}</p>
              </div>
              {classItem.type === "instructor-led" && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Live Session
                </span>
              )}
              {classItem.type === "self-paced" && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Self-Paced
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(classItem.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {classItem.time}
              </div>
            </div>

            {classItem.zoom_link && (
              <button className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                <Video className="w-4 h-4" />
                Join Zoom Session
              </button>
            )}
          </div>
        ))}
      </div>

      {!compact && (
        <button className="mt-4 w-full py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
          View Full Calendar
        </button>
      )}
    </div>
  );
}
