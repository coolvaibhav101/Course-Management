"use client";

import { useEffect, useState } from "react";
import { MessageSquare, HelpCircle } from "lucide-react";
import { getStudentMessages, Message } from "@/src/services/student";
import { SkeletonList } from "@/component/SkeletonLoader";

const defaultMessages: Message[] = [
  {
    id: "1",
    from: "Dr. Sarah Johnson",
    subject: "Network Assignment Feedback",
    preview:
      "Great work on your topology design! I have a few suggestions...",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "2",
    from: "Support Team",
    subject: "LMS Access Confirmation",
    preview: "Your LMS account has been successfully activated.",
    time: "Yesterday",
    read: true,
  },
  {
    id: "3",
    from: "Prof. Michael Chen",
    subject: "Upcoming Python Session",
    preview:
      "Reminder: Our live session on control flow starts tomorrow at 2 PM.",
    time: "2 days ago",
    read: true,
  },
];

export function MessagingCenter() {
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getStudentMessages();
        if (data.length) setMessages(data);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  message.read
                    ? "border-gray-200 hover:border-gray-300"
                    : "border-indigo-200 bg-indigo-50 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-gray-900 font-medium">{message.subject}</h3>
                  <span className="text-xs text-gray-600">{message.time}</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{message.from}</p>
                <p className="text-sm text-gray-600">{message.preview}</p>
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
