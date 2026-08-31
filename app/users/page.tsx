import React from "react";

const page = () => {
  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="space-y-6">
        <h2 className="text-gray-900">Users & Progress</h2>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search students..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option>All Organizations</option>
              <option>Tech Academy</option>
              <option>Business Institute</option>
              <option>Creative School</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-700">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-gray-700">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-gray-700">
                  Courses Enrolled
                </th>
                <th className="px-6 py-3 text-left text-gray-700">
                  Avg Progress
                </th>
                <th className="px-6 py-3 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-900">Hannah Martinez</td>
                <td className="px-6 py-4 text-gray-700">Tech Academy</td>
                <td className="px-6 py-4 text-gray-700">3</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: "65%" }}
                      ></div>
                    </div>
                    <span className="text-gray-700">65%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button className="text-purple-600 hover:text-purple-800">
                    View Details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default page;
