"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  FileText,
  Clock,
  CheckCircle,
} from "lucide-react";
import { getAssignments, Assignment } from "@/src/services/student";
import { SkeletonList } from "@/component/SkeletonLoader";

interface AssignmentsListProps {
  compact?: boolean;
}

const defaultAssignments: Assignment[] = [
  {
    id: "1",
    title: "Network Topology Design Assignment",
    course: "IT Fundamentals",
    due_date: "2024-12-15",
    status: "pending",
  },
  {
    id: "2",
    title: "Python Control Flow Exercise",
    course: "Python Programming",
    due_date: "2024-12-16",
    status: "pending",
  },
  {
    id: "3",
    title: "Database Schema Design",
    course: "IT Fundamentals",
    due_date: "2024-12-10",
    status: "submitted",
    grade: "Pending Review",
  },
  {
    id: "4",
    title: "Introduction to Linux Commands",
    course: "IT Fundamentals",
    due_date: "2024-12-05",
    status: "graded",
    grade: "95/100",
  },
];

export function AssignmentsList({ compact = false }: AssignmentsListProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(defaultAssignments);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAssignments();
        if (data.length) setAssignments(data);
      } catch (error) {
        console.error("Failed to fetch assignments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const displayAssignments = compact ? assignments.slice(0, 3) : assignments;

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return <SkeletonList items={3} />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-5 h-5 text-indigo-600" />
        <h2 className="text-gray-900 text-lg font-semibold">Assignments</h2>
      </div>

      <div className="space-y-3">
        {displayAssignments.map((assignment) => {
          const daysUntil = getDaysUntilDue(assignment.due_date);

          return (
            <div
              key={assignment.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-gray-900 font-medium mb-1">
                    {assignment.title}
                  </h3>
                  <p className="text-sm text-gray-600">{assignment.course}</p>
                </div>

                {assignment.status === "pending" && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    Pending
                  </span>
                )}
                {assignment.status === "submitted" && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Submitted
                  </span>
                )}
                {assignment.status === "graded" && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Graded
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-4 h-4" />
                  Due:{" "}
                  {new Date(assignment.due_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  {assignment.status === "pending" && daysUntil >= 0 && (
                    <span
                      className={`ml-2 ${
                        daysUntil <= 2 ? "text-red-600" : "text-gray-600"
                      }`}
                    >
                      ({daysUntil} {daysUntil === 1 ? "day" : "days"} left)
                    </span>
                  )}
                </div>

                {assignment.grade && (
                  <div className="flex items-center gap-1 text-gray-700">
                    <CheckCircle className="w-4 h-4" />
                    {assignment.grade}
                  </div>
                )}
              </div>

              {assignment.status === "pending" && (
                <button className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                  <FileText className="w-4 h-4" />
                  Submit Assignment
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!compact && (
        <button className="mt-4 w-full py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
          View All Assignments
        </button>
      )}
    </div>
  );
}
