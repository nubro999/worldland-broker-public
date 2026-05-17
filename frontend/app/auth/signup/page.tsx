'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to login page - we use Google OAuth only
export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-gray-500">Redirecting to login...</div>
    </div>
  );
}
