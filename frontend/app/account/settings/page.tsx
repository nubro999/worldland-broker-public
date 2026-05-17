'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faBell,
    faKey,
    faSave,
} from '@fortawesome/free-solid-svg-icons';
import BackgroundTerminal from '@/components/BackgroundTerminal';

export default function SettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-900/30 border-t-red-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/85 to-black/90 z-10 pointer-events-none" />
                <BackgroundTerminal />
            </div>

            {/* Content */}
            <div className="relative z-20 pointer-events-none">
                {/* Header */}
                <header className="relative z-50 px-8 md:px-16 lg:px-24 py-6 pointer-events-auto">
                    <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                        <Link href="/" className="flex items-center">
                            <Image src="/worldland-logo.png" alt="Worldland" width={140} height={40} />
                        </Link>
                        <nav className="hidden md:flex items-center gap-6">
                            <Link href="/get-started" className="text-gray-400 hover:text-white text-sm font-medium">Get Started</Link>
                            <Link href="/gpu-verification" className="text-gray-400 hover:text-white text-sm font-medium">GPU Verify</Link>
                            <Link href="/da-verification" className="text-gray-400 hover:text-white text-sm font-medium">DA Verify</Link>
                            <Link href="/usecases" className="text-gray-400 hover:text-white text-sm font-medium">Usecases</Link>
                            <Link href="/docs" className="text-gray-400 hover:text-white text-sm font-medium">Docs</Link>
                            <Link href="/pricing" className="text-gray-400 hover:text-white text-sm font-medium">Pricing</Link>
                        </nav>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400">{user.email || user.name}</span>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="px-8 md:px-16 lg:px-24 py-12 pointer-events-auto">
                    <div className="max-w-[800px] mx-auto">
                        {/* Page Title */}
                        <div className="mb-12">
                            <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
                            <p className="text-gray-400">Manage your profile and preferences</p>
                        </div>

                        {/* Settings Sections */}
                        <div className="space-y-6">
                            {/* Profile Section */}
                            <div className="bg-[#111111] border border-[#222222] rounded-md p-6">
                                <h2 className="text-lg font-bold mb-6 flex items-center gap-3">
                                    <FontAwesomeIcon icon={faUser} className="text-red-500" />
                                    Profile
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Username</label>
                                        <input
                                            type="text"
                                            defaultValue={user.email || user.name}
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Email</label>
                                        <input
                                            type="email"
                                            defaultValue=""
                                            placeholder="email@example.com"
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Notifications */}
                            <div className="bg-[#111111] border border-[#222222] rounded-md p-6">
                                <h2 className="text-lg font-bold mb-6 flex items-center gap-3">
                                    <FontAwesomeIcon icon={faBell} className="text-red-500" />
                                    Notifications
                                </h2>
                                <div className="space-y-4">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm">Email notifications</span>
                                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-red-500" />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm">Instance alerts</span>
                                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-red-500" />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm">Billing reminders</span>
                                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-red-500" />
                                    </label>
                                </div>
                            </div>

                            {/* Security */}
                            <div className="bg-[#111111] border border-[#222222] rounded-md p-6">
                                <h2 className="text-lg font-bold mb-6 flex items-center gap-3">
                                    <FontAwesomeIcon icon={faKey} className="text-red-500" />
                                    Security
                                </h2>
                                <button className="px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-sm hover:bg-[#222] transition-all">
                                    Change Password
                                </button>
                            </div>

                            {/* Save Button */}
                            <button className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded transition-all flex items-center justify-center gap-2">
                                <FontAwesomeIcon icon={faSave} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
