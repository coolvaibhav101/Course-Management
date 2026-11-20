"use client";

import { ClassSchedule } from "@/component/student/ClassSchedule";

const CalendarPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="space-y-6">
        <h2 className="text-gray-900 text-2xl font-bold">
          Class Schedule & Deadlines
        </h2>
        <ClassSchedule />
      </div>
    </div>
  );
};

export default CalendarPage;
