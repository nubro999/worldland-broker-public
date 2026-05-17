'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function AuthHeader() {
    const { user, isLoading, logout } = useAuth();

    // 로딩 중일 때는 빈 상태 표시 (깜빡임 방지)
    if (isLoading) {
        return (
            <div className="flex items-center gap-4">
                <div className="w-16 h-4 bg-[#222] rounded animate-pulse" />
            </div>
        );
    }

    // 로그인된 경우
    if (user) {
        return (
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Dashboard
                </Link>
                <span className="text-sm text-gray-500">{user.email || user.name}</span>
                <button
                    onClick={logout}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Logout
                </button>
            </div>
        );
    }

    // 로그인되지 않은 경우
    return (
        <div className="flex items-center gap-4">
            <Link
                href="/auth/login"
                className="text-sm text-gray-400 hover:text-white font-medium transition-colors"
            >
                Login
            </Link>
            <Link
                href="/auth/signup"
                className="text-sm px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all hover:scale-105"
            >
                Sign Up
            </Link>
        </div>
    );
}
