'use client';

import Link from "next/link";
import Image from "next/image";
import BackgroundTerminal from "@/components/BackgroundTerminal";
import HeaderNav from "@/components/HeaderNav";
import AuthHeader from "@/components/AuthHeader";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background - positioned on right side */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dark gradient overlay for left side readability - pointer-events-none to allow mouse interaction with background */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10 pointer-events-none" />
        <BackgroundTerminal />
      </div>

      {/* Main content - pointer-events-none allows background interaction, child elements with pointer-events-auto remain clickable */}
      <div className="relative z-20 pointer-events-none">
        {/* Header */}
        <header className="relative z-50 px-8 md:px-16 lg:px-24 py-6 pointer-events-auto">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/worldland-logo.png"
                alt="Worldland"
                width={140}
                height={40}
                className="relative z-10"
              />
            </Link>

            {/* Center Navigation with Dropdowns */}
            <HeaderNav />

            {/* Right Actions */}
            <AuthHeader />
          </div>
        </header>

        {/* Hero Section - Aethir Style */}
        <main className="min-h-[90vh] flex items-center px-8 md:px-16 lg:px-24">
          <div className="max-w-[1600px] mx-auto w-full">
            <div className="max-w-3xl pointer-events-auto">
              {/* Main heading with Serif font */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light leading-[1.1] mb-8" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                <span className="text-white">Verifiable GPU</span>
                <br />
                <span className="text-white">Compute Network</span>
              </h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mb-6">
                WorldLand is a native AI cloud mainnet built on <span className="text-red-500">ECCVCC</span> with post-quantum security, where node selection and block validation leverage energy contribution measured via <span className="text-red-500">Proof-of-Compute</span>—a system that captures execution traces and challenges to enable on-chain verification of GPU workloads.
              </p>
              <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mb-12">
                Merkle Tree Trace Verification • CUPTI Hardware Evidence • Random Challenge Protocol
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/get-started"
                  className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all hover:scale-105 hover:shadow-lg hover:shadow-red-500/25"
                >
                  Get Started
                </Link>
                <Link
                  href="/pricing"
                  className="px-8 py-4 bg-transparent text-white font-semibold rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* Stats Section - Below fold */}
        <section className="px-8 md:px-16 lg:px-24 py-24 border-t border-white/10 pointer-events-auto">
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              <div>
                <div className="text-4xl md:text-5xl font-light text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>10K+</div>
                <div className="text-sm text-gray-500">Active GPUs</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-light text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>99.9%</div>
                <div className="text-sm text-gray-500">Uptime Guarantee</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-light text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>&lt;30s</div>
                <div className="text-sm text-gray-500">Deploy Time</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-light text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>24/7</div>
                <div className="text-sm text-gray-500">Support</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-8 md:px-16 lg:px-24 py-24 pointer-events-auto">
          <div className="max-w-[1600px] mx-auto">
            <h2 className="text-4xl md:text-5xl font-light text-white mb-16" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Why choose us
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-md border border-white/10 hover:border-red-500/30 transition-all group">
                <div className="w-12 h-12 bg-red-500/10 rounded flex items-center justify-center mb-6 group-hover:bg-red-500/20 transition-colors">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Lightning Fast</h3>
                <p className="text-gray-500 leading-relaxed">Deploy GPU instances in seconds with our optimized infrastructure.</p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-md border border-white/10 hover:border-red-500/30 transition-all group">
                <div className="w-12 h-12 bg-red-500/10 rounded flex items-center justify-center mb-6 group-hover:bg-red-500/20 transition-colors">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Enterprise Security</h3>
                <p className="text-gray-500 leading-relaxed">Bank-grade encryption and security protocols for your workloads.</p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-md border border-white/10 hover:border-red-500/30 transition-all group">
                <div className="w-12 h-12 bg-red-500/10 rounded flex items-center justify-center mb-6 group-hover:bg-red-500/20 transition-colors">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Infinite Scale</h3>
                <p className="text-gray-500 leading-relaxed">From single GPU to thousands, scale seamlessly as you grow.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Network Stats Section */}
        <section className="px-8 md:px-16 lg:px-24 py-24 border-t border-white/10 pointer-events-auto">
          <div className="max-w-[1600px] mx-auto">
            {/* Stats Row */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-light text-red-500 mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>9.9s</div>
                <div className="text-sm text-gray-500">Average Block Time / Day</div>
              </div>
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-light text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>7,465,813</div>
                <div className="text-sm text-gray-500">Block Numbers</div>
              </div>
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-light text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>4,410</div>
                <div className="text-sm text-gray-500">Total Wallet Count</div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-6">
              <p className="text-center text-red-500 text-sm mb-8">The estimated number of mining nodes is 10^y based on difficulty.</p>
              <div className="relative h-48">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600 pr-2">
                  <span>6</span>
                  <span>4</span>
                  <span>2</span>
                  <span>0</span>
                </div>
                {/* Chart area */}
                <div className="ml-6 h-full relative">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 100">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path
                      d="M0,60 L20,55 L40,58 L60,50 L80,30 L100,28 L120,35 L140,38 L160,40 L180,42 L200,45 L220,43 L240,44 L260,42 L280,43 L300,45 L320,44 L340,46 L360,45 L380,47 L400,46 L400,100 L0,100 Z"
                      fill="url(#chartGradient)"
                    />
                    {/* Line */}
                    <path
                      d="M0,60 L20,55 L40,58 L60,50 L80,30 L100,28 L120,35 L140,38 L160,40 L180,42 L200,45 L220,43 L240,44 L260,42 L280,43 L300,45 L320,44 L340,46 L360,45 L380,47 L400,46"
                      fill="none"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
              {/* X-axis labels */}
              <div className="ml-6 mt-4 flex justify-between text-[10px] text-gray-600">
                <span>08/23M</span>
                <span>11/03M</span>
                <span>02/19M</span>
                <span>06/13M</span>
                <span>09/26M</span>
                <span>12/07M</span>
                <span>03/25M</span>
                <span>07/11M</span>
                <span>10/27M</span>
                <span>12/16M</span>
              </div>
              <div className="text-center mt-4">
                <span className="text-xs text-gray-500">—○— data</span>
              </div>
            </div>
          </div>
        </section>
        {/* Footer */}
        <footer className="px-8 md:px-16 lg:px-24 py-12 border-t border-white/10 pointer-events-auto">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-gray-500 text-sm">
              © 2024 Worldland. All rights reserved.
            </div>
            <div className="flex gap-8">
              <Link href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Privacy</Link>
              <Link href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Terms</Link>
              <Link href="#" className="text-gray-500 hover:text-white text-sm transition-colors">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
