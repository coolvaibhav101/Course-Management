// app/component/SkeletonLoader.tsx
"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "rectangular" | "circular" | "text";
  width?: string;
  height?: string;
  animation?: "pulse" | "wave" | "none";
}

// Base Skeleton component
export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  width = "100%",
  height = "auto",
  animation = "pulse",
}) => {
  const baseClasses = "bg-gray-200";

  const variantClasses = {
    rectangular: "rounded",
    circular: "rounded-full",
    text: "rounded h-4",
  };

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-shimmer",
    none: "",
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={{ width, height: variant === "text" ? "1rem" : height }}
    />
  );
};

// Card Skeleton
export const SkeletonCard: React.FC = () => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <Skeleton variant="rectangular" height="200px" />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="40%" />
    </div>
  );
};

// Table Skeleton
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" height="20px" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" height="16px" />
          ))}
        </div>
      ))}
    </div>
  );
};

// List Skeleton
interface SkeletonListProps {
  items?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ items = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton variant="circular" width="50px" height="50px" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="60%" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Dashboard Skeleton
export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="text" width="300px" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-lg p-4 space-y-3"
          >
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" height="28px" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton variant="rectangular" height="400px" />
        </div>
        <div>
          <SkeletonList items={3} />
        </div>
      </div>
    </div>
  );
};

// Page Skeleton (Full Page Loader)
interface SkeletonPageProps {
  type?: "dashboard" | "table" | "cards" | "profile" | "list";
}

export const SkeletonPage: React.FC<SkeletonPageProps> = ({
  type = "dashboard",
}) => {
  const renderContent = () => {
    switch (type) {
      case "dashboard":
        return <SkeletonDashboard />;
      case "table":
        return (
          <div className="p-6">
            <Skeleton
              variant="text"
              width="200px"
              height="32px"
              className="mb-6"
            />
            <SkeletonTable rows={8} columns={5} />
          </div>
        );
      case "cards":
        return (
          <div className="p-6">
            <Skeleton
              variant="text"
              width="200px"
              height="32px"
              className="mb-6"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        );
      case "profile":
        return (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center space-x-6 mb-8">
              <Skeleton variant="circular" width="120px" height="120px" />
              <div className="flex-1 space-y-3">
                <Skeleton variant="text" width="200px" height="28px" />
                <Skeleton variant="text" width="300px" />
                <Skeleton variant="text" width="250px" />
              </div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg p-4 space-y-2"
                >
                  <Skeleton variant="text" width="150px" />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                </div>
              ))}
            </div>
          </div>
        );
      case "list":
        return (
          <div className="p-6">
            <Skeleton
              variant="text"
              width="200px"
              height="32px"
              className="mb-6"
            />
            <SkeletonList items={8} />
          </div>
        );
      default:
        return <SkeletonDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-10 ">
      {renderContent()}
    </div>
  );
};
