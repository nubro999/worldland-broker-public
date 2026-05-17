'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect instances to jobs
export default function InstancesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/jobs');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-gray-500">Redirecting to Jobs...</div>
    </div>
  );
}
