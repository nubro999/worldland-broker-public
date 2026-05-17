'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBook,
    faRocket,
    faCode,
    faServer,
    faShieldAlt,
    faQuestionCircle,
    faArrowRight,
    faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import BackgroundTerminal from '@/components/BackgroundTerminal';
import AuthHeader from '@/components/AuthHeader';

const docCategories = [
    {
        id: 'quickstart',
        icon: faRocket,
        title: 'Quick Start',
        description: 'Get up and running in 5 minutes',
        links: [
            { title: 'Introduction', href: '#' },
            { title: 'Create Account', href: '#' },
            { title: 'Deploy First Instance', href: '#' },
        ],
    },
    {
        id: 'api',
        icon: faCode,
        title: 'API Reference',
        description: 'Complete API documentation',
        links: [
            { title: 'Authentication', href: '#' },
            { title: 'Instances API', href: '#' },
            { title: 'Billing API', href: '#' },
        ],
    },
    {
        id: 'infrastructure',
        icon: faServer,
        title: 'Infrastructure',
        description: 'Learn about our GPU network',
        links: [
            { title: 'GPU Types', href: '#' },
            { title: 'Regions', href: '#' },
            { title: 'Templates', href: '#' },
        ],
    },
    {
        id: 'security',
        icon: faShieldAlt,
        title: 'Security',
        description: 'Security and compliance',
        links: [
            { title: 'Data Protection', href: '#' },
            { title: 'Verification', href: '#' },
            { title: 'Best Practices', href: '#' },
        ],
    },
];

export default function DocsPage() {
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
                            <Link href="/docs" className="text-white text-sm font-medium">Docs</Link>
                            <Link href="/pricing" className="text-gray-400 hover:text-white text-sm font-medium">Pricing</Link>
                        </nav>
                        <AuthHeader />
                    </div>
                </header>

                {/* Main Content */}
                <main className="px-8 md:px-16 lg:px-24 py-12 pointer-events-auto">
                    <div className="max-w-[1400px] mx-auto">
                        {/* Page Title */}
                        <div className="text-center mb-16">
                            <h1 className="text-4xl md:text-5xl font-light mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                Documentation
                            </h1>
                            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                                Everything you need to know about deploying and managing GPU instances
                            </p>
                        </div>

                        {/* Doc Categories */}
                        <div className="grid md:grid-cols-2 gap-6 mb-12">
                            {docCategories.map((category) => (
                                <div
                                    key={category.id}
                                    className="bg-[#111111] border border-[#222222] rounded-md p-6 hover:border-red-500/30 transition-all"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-red-500/10 rounded flex items-center justify-center">
                                            <FontAwesomeIcon icon={category.icon} className="text-red-500 text-xl" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold">{category.title}</h2>
                                            <p className="text-sm text-gray-500">{category.description}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 pl-16">
                                        {category.links.map((link, index) => (
                                            <Link
                                                key={index}
                                                href={link.href}
                                                className="flex items-center justify-between py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                            >
                                                {link.title}
                                                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Help Section */}
                        <div className="bg-[#111111] border border-[#222222] rounded-md p-8 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-md flex items-center justify-center mx-auto mb-6">
                                <FontAwesomeIcon icon={faQuestionCircle} className="text-red-500 text-2xl" />
                            </div>
                            <h2 className="text-2xl font-bold mb-3">Need Help?</h2>
                            <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                                Can&apos;t find what you&apos;re looking for? Our support team is here to help.
                            </p>
                            <a
                                href="mailto:support@worldland.foundation"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all"
                            >
                                Contact Support
                                <FontAwesomeIcon icon={faExternalLinkAlt} />
                            </a>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
