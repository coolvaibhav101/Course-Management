"use client";

import { useEffect, useState } from "react";
import { Award, Download } from "lucide-react";
import { getCertificates, Certificate } from "@/src/services/student";
import { SkeletonCard } from "@/component/SkeletonLoader";

const defaultCertificates: Certificate[] = [
  { id: "1", name: "AI basic course", earned_date: "2025-08-10" },
  { id: "2", name: "Generative AI fundamentals", earned_date: "2025-09-01" },
];

const CertificationsPage = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCertificates();
        setCertificates(data.length ? data : defaultCertificates);
      } catch (error) {
        console.error("Failed to fetch certificates:", error);
        setCertificates(defaultCertificates);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="space-y-6">
        <h2 className="text-gray-900 text-2xl font-bold">My Certifications</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 font-medium">No certifications yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-8 border-2 border-purple-200"
              >
                <Award className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="text-gray-900 text-lg font-semibold mb-2">
                  {cert.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  Earned:{" "}
                  {new Date(cert.earned_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Certificate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificationsPage;
