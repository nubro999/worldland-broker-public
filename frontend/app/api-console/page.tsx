'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

export default function ApiConsolePage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image
                src="/worldland-logo.png"
                alt="Worldland"
                width={140}
                height={40}
              />
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <span className="text-sm text-gray-400">
              <span className="text-white font-semibold">{user.email || user.name}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-12 max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">API Console</h1>
          <p className="text-gray-400">
            Integrate with k8s-proxy-server API
          </p>
        </div>

        {/* Authentication Credentials */}
        <div className="space-y-6">
          {/* JWT Token Section */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">JWT Authentication Token</h2>
                <p className="text-sm text-gray-400">
                  Use this token for authenticated API requests. Include it in the Authorization header.
                </p>
              </div>
              <span className="px-3 py-1 bg-green-600/20 text-green-400 text-xs font-medium rounded-full">
                ACTIVE
              </span>
            </div>

            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4 font-mono text-sm mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 overflow-x-auto">
                  <div className="text-gray-400 mb-2">Token:</div>
                  <div className="text-red-400 break-all">
                    {token ? `${token.slice(0, 50)}...${token.slice(-20)}` : 'No token available'}
                  </div>
                </div>
                <button
                  onClick={() => token && copyToClipboard(token)}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors shrink-0"
                  disabled={!token}
                >
                  {copiedToken ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/50 rounded-md p-4">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <div className="text-blue-400 font-medium mb-1">Usage Example</div>
                  <code className="text-blue-300 text-xs">
                    curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/v1/jobs
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* API Documentation */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">API Endpoints</h2>
            <div className="space-y-4">
              {/* Health Check */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-medium rounded">GET</span>
                  <code className="text-sm text-gray-300">/health</code>
                </div>
                <p className="text-sm text-gray-400 mb-3">Check API health status</p>
                <div className="bg-[#0a0a0a] rounded p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                  <div className="text-gray-500"># Example</div>
                  curl http://localhost:8080/health
                </div>
              </div>

              {/* List Jobs */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-medium rounded">GET</span>
                  <code className="text-sm text-gray-300">/api/v1/jobs</code>
                </div>
                <p className="text-sm text-gray-400 mb-3">List all GPU jobs for current user</p>
                <div className="bg-[#0a0a0a] rounded p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                  <div className="text-gray-500"># Example</div>
                  {`curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/v1/jobs`}
                </div>
              </div>

              {/* Create Job */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs font-medium rounded">POST</span>
                  <code className="text-sm text-gray-300">/api/v1/jobs</code>
                </div>
                <p className="text-sm text-gray-400 mb-3">Create a new GPU job</p>
                <div className="bg-[#0a0a0a] rounded p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                  <div className="text-gray-500"># Example</div>
                  {`curl -X POST http://localhost:8080/api/v1/jobs \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "gpu_type": "Tesla T4",
    "gpu_count": 1,
    "cpu_cores": "4",
    "memory_gb": "16",
    "storage_gb": "50",
    "ssh_password": "yourpassword"
  }'`}
                </div>
              </div>

              {/* Get Job */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-medium rounded">GET</span>
                  <code className="text-sm text-gray-300">/api/v1/jobs/:job_id</code>
                </div>
                <p className="text-sm text-gray-400 mb-3">Get a specific job status</p>
                <div className="bg-[#0a0a0a] rounded p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                  <div className="text-gray-500"># Example</div>
                  {`curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/v1/jobs/job-12345`}
                </div>
              </div>

              {/* Delete Job */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs font-medium rounded">DELETE</span>
                  <code className="text-sm text-gray-300">/api/v1/jobs/:job_id</code>
                </div>
                <p className="text-sm text-gray-400 mb-3">Delete a GPU job</p>
                <div className="bg-[#0a0a0a] rounded p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                  <div className="text-gray-500"># Example</div>
                  {`curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/v1/jobs/job-12345`}
                </div>
              </div>

              {/* List Providers */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-medium rounded">GET</span>
                  <code className="text-sm text-gray-300">/api/v1/providers</code>
                </div>
                <p className="text-sm text-gray-400 mb-3">List all GPU providers</p>
                <div className="bg-[#0a0a0a] rounded p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                  <div className="text-gray-500"># Example</div>
                  curl http://localhost:8080/api/v1/providers
                </div>
              </div>

              {/* Search Providers */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-medium rounded">GET</span>
                  <code className="text-sm text-gray-300">/api/v1/providers/search</code>
                </div>
                <p className="text-sm text-gray-400 mb-3">Search providers by GPU type, resources, price</p>
                <div className="bg-[#0a0a0a] rounded p-3 font-mono text-xs text-gray-300 overflow-x-auto">
                  <div className="text-gray-500"># Example</div>
                  {`curl "http://localhost:8080/api/v1/providers/search?gpu=Tesla+T4&min_ram=16000&max_price=2.0"`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
