'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import BackgroundTerminal from '@/components/BackgroundTerminal';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-900/30 border-t-red-500"></div>
          <p className="mt-4 text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Dither animated background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70 z-10 pointer-events-none" />
        <BackgroundTerminal />
      </div>

      {/* Main content */}
      <div className="relative z-20 pointer-events-none">
        {/* Header */}
        <header className="relative z-50 px-8 md:px-16 lg:px-24 py-6 pointer-events-auto">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/worldland-logo.png"
                alt="Worldland"
                width={140}
                height={40}
              />
            </Link>

            {/* Center Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/dashboard" className="text-white transition-colors text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/deploy" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                Browse GPUs
              </Link>
              <Link href="/jobs" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                Jobs
              </Link>
              <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                Pricing
              </Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">{user.email || user.name}</span>
              <button
                onClick={logout}
                className="text-sm px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all hover:scale-105"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="px-8 md:px-16 lg:px-24 py-24 text-center pointer-events-auto">
          <div className="max-w-[900px] mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light leading-[1.2] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Powering AI Without Limits.
              <br />
              Built for What&apos;s Next.
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Whether you&apos;re refining complex algorithms, processing vast datasets,
              or interfacing with end users in real-time, our GPU-as-a-Service
              solution enables the next phase of development for AI applications.
            </p>
          </div>
        </section>

        {/* Feature Cards - Top Row */}
        <section className="px-8 md:px-16 lg:px-24 pb-6 pointer-events-auto">
          <div className="max-w-[1200px] mx-auto">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Card 1 - Globally Distributed */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md p-8 hover:border-red-500/30 transition-all group">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-red-400 mb-1">Browse GPU</h3>
                    <h4 className="text-lg font-semibold text-white">Marketplace</h4>
                  </div>
                  <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Access the world&apos;s largest high-end distributed GPU network,
                  ensuring scalability and global reach.
                </p>
                <Link href="/deploy" className="text-red-400 text-sm font-semibold hover:text-red-300 transition-colors flex items-center gap-2">
                  Browse GPUs
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>

              {/* Card 2 - No Virtualization */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md p-8 hover:border-red-500/30 transition-all group">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-red-400 mb-1">My Active</h3>
                    <h4 className="text-lg font-semibold text-white">Instances</h4>
                  </div>
                  <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Our bare metal solutions eliminate performance loss, maximizing
                  resource utilization for your workloads.
                </p>
                <Link href="/jobs" className="text-red-400 text-sm font-semibold hover:text-red-300 transition-colors flex items-center gap-2">
                  View Jobs
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>

              {/* Card 3 - Flexible Configurations */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md p-8 hover:border-red-500/30 transition-all group">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-red-400 mb-1">Flexible</h3>
                    <h4 className="text-lg font-semibold text-white">Configurations</h4>
                  </div>
                  <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Choose from a variety of high-performance compute, network,
                  and storage options tailored to your specific AI needs.
                </p>
                <Link href="/jobs/create" className="text-red-400 text-sm font-semibold hover:text-red-300 transition-colors flex items-center gap-2">
                  Create Job
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards - Bottom Row */}
        <section className="px-8 md:px-16 lg:px-24 pb-24 pointer-events-auto">
          <div className="max-w-[1200px] mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Card 4 - Billing */}
              <div className="bg-[#111111] border border-[#1a1a1a] rounded-md p-8 hover:border-red-500/30 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-3">
                      Cost-Effective Scaling
                      <span className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mt-3">
                      Benefit from our unique pricing model with no hidden bandwidth
                      or storage fees, allowing you to scale confidently.
                    </p>
                    <Link href="/pricing" className="text-red-400 text-sm font-semibold hover:text-red-300 transition-colors flex items-center gap-2 mt-4">
                      View Pricing
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Card 5 - Provider */}
              <div className="bg-[#111111] border border-[#1a1a1a] rounded-md p-8 hover:border-red-500/30 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-3">
                      Become a GPU Provider
                      <span className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </span>
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mt-3">
                      24/7 support and robust SLAs ensure your AI projects run
                      smoothly around the clock. Earn passive income from rentals.
                    </p>
                    <Link href="/provider" className="text-red-400 text-sm font-semibold hover:text-red-300 transition-colors flex items-center gap-2 mt-4">
                      Register as Provider
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="px-8 md:px-16 lg:px-24 py-16 border-t border-white/5 pointer-events-auto">
          <div className="max-w-[1200px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-light text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>0</div>
                <div className="text-sm text-gray-500">Active Jobs</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-light text-red-500 mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>$0.00</div>
                <div className="text-sm text-gray-500">This Month</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-light text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>10K+</div>
                <div className="text-sm text-gray-500">Available GPUs</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-light text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>24/7</div>
                <div className="text-sm text-gray-500">Support</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
