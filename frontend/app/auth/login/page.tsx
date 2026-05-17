'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import BackgroundTerminal from '@/components/BackgroundTerminal';

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithGoogle, devLogin, isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (typeof window === 'undefined' || !GOOGLE_CLIENT_ID) return;

    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            text: 'continue_with',
            width: 280,
          }
        );
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleCallback = async (response: { credential?: string }) => {
    if (!response.credential) {
      setError('Failed to get Google credential');
      return;
    }

    setIsSigningIn(true);
    setError('');

    try {
      await loginWithGoogle(response.credential);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      {/* Background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/85 to-black/90 z-10 pointer-events-none" />
        <BackgroundTerminal />
      </div>

      <div className="relative z-20 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/worldland-logo.png" alt="Worldland" width={180} height={50} />
          </div>
          <p className="text-gray-500 text-sm">Decentralized GPU Cloud Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#111] border border-[#333] rounded-md p-8">
          <h2 className="text-2xl font-semibold mb-2 text-center">Welcome</h2>
          <p className="text-gray-500 text-sm mb-8 text-center">Sign in to access your GPU jobs</p>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {[
              { icon: '🚀', text: 'Deploy GPU containers instantly' },
              { icon: '💎', text: 'Pay-as-you-go pricing' },
              { icon: '🔐', text: 'SSH access to your containers' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a]">
                <span className="text-xl">{feature.icon}</span>
                <span className="text-sm text-gray-300">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Google Sign-In Button */}
          <div className="flex justify-center">
            {isSigningIn ? (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : GOOGLE_CLIENT_ID ? (
              <div id="google-signin-button"></div>
            ) : (
              <div className="text-center">
                <p className="text-yellow-400 text-sm mb-2">⚠️ Google OAuth not configured</p>
                <p className="text-gray-500 text-xs">Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local</p>
              </div>
            )}
          </div>

          {/* Dev Login Button - 개발 테스트용 */}
          <div className="mt-4 pt-4 border-t border-[#222]">
            <button
              onClick={() => {
                devLogin();
                router.push('/dashboard');
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              🧪 Dev Login (테스트용)
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">OAuth 없이 Pod 배포 테스트</p>
          </div>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-gray-500">
            By continuing, you agree to our{' '}
            <a href="#" className="text-red-400 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-red-400 hover:underline">Privacy Policy</a>
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Extend Window for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement | null, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}
