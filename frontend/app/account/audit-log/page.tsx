'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHistory,
    faSignInAlt,
    faSignOutAlt,
    faServer,
    faMoneyBill,
} from '@fortawesome/free-solid-svg-icons';
import BackgroundTerminal from '@/components/BackgroundTerminal';

// Mock audit log data
const auditLogs = [
    { id: 1, action: 'Login', details: 'Logged in from Chrome on Windows', timestamp: '2024-12-16 14:32:15', icon: faSignInAlt, type: 'auth' },
    { id: 2, action: 'Instance Created', details: 'Created GPU instance #1234', timestamp: '2024-12-16 12:20:00', icon: faServer, type: 'instance' },
    { id: 3, action: 'Payment', details: 'Added $50.00 to balance', timestamp: '2024-12-15 18:45:30', icon: faMoneyBill, type: 'billing' },
    { id: 4, action: 'Login', details: 'Logged in from Safari on macOS', timestamp: '2024-12-15 09:12:45', icon: faSignInAlt, type: 'auth' },
    { id: 5, action: 'Instance Stopped', details: 'Stopped GPU instance #1233', timestamp: '2024-12-14 22:30:00', icon: faServer, type: 'instance' },
    { id: 6, action: 'Logout', details: 'Logged out', timestamp: '2024-12-14 18:00:00', icon: faSignOutAlt, type: 'auth' },
];

export default function AuditLogPage() {
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

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'auth': return 'bg-blue-500/20 text-blue-400';
            case 'instance': return 'bg-green-500/20 text-green-400';
            case 'billing': return 'bg-yellow-500/20 text-yellow-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

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
                    <div className="max-w-[1000px] mx-auto">
                        {/* Page Title */}
                        <div className="mb-12">
                            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                                <FontAwesomeIcon icon={faHistory} className="text-red-500" />
                                Audit Log
                            </h1>
                            <p className="text-gray-400">Your account activity history</p>
                        </div>

                        {/* Audit Log List */}
                        <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
                            {auditLogs.map((log, index) => (
                                <div
                                    key={log.id}
                                    className={`p-6 flex items-center gap-4 ${index !== auditLogs.length - 1 ? 'border-b border-[#222]' : ''} hover:bg-[#1a1a1a] transition-colors`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(log.type)}`}>
                                        <FontAwesomeIcon icon={log.icon} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">{log.action}</div>
                                        <div className="text-sm text-gray-500">{log.details}</div>
                                    </div>
                                    <div className="text-sm text-gray-500">{log.timestamp}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
