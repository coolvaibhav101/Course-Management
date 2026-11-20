"use client";

import { useAuth } from "@/src/hooks/useAuth";
import { normalizeRole, roleKeys, RoleKey } from "@/src/constants/roleKeys";
import { OrgReports } from "@/component/OrgReports";
import { ProgressDashboard } from "@/component/student/ProgressDashboard";
import { SkeletonDashboard } from "@/component/SkeletonLoader";

const ReportsPage = () => {
  const { user, isLoading } = useAuth();
  const role: RoleKey = normalizeRole(user?.role);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-8">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {role === roleKeys.SUPER_ADMIN && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <h2 className="text-gray-900 text-2xl font-bold mb-2">
            Platform Reports
          </h2>
          <p className="text-gray-600">
            Platform-wide reporting will be available here.
          </p>
        </div>
      )}
      {role === roleKeys.ORG_ADMIN && <OrgReports />}
      {role === roleKeys.STUDENT && <ProgressDashboard />}
    </div>
  );
};

export default ReportsPage;
