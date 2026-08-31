// app/component/PrivateRoute.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/hooks/reduxHooks";
import { SkeletonPage } from "./SkeletonLoader";

export default function PrivateRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const isLoggedIn = useAppSelector(
    (state: any) => state.user.value.isLoggedIn
  );

  useEffect(() => {
    const checkAuth = () => {
      // Your auth logic here
      setIsLoading(false);
    };
    checkAuth();
  }, [isLoggedIn, router]);

  if (isLoading) {
    return <SkeletonPage type="dashboard" />;
  }

  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}
