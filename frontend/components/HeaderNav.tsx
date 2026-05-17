'use client';

import Link from 'next/link';
import { useState } from 'react';

interface DropdownItem {
    label: string;
    href: string;
    description?: string;
}

interface NavItemProps {
    label: string;
    href?: string;
    items?: DropdownItem[];
    external?: boolean;
}

function NavItem({ label, href, items, external }: NavItemProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!items) {
        // Simple link (no dropdown)
        if (external) {
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                >
                    {label}
                </a>
            );
        }
        return (
            <Link href={href || '/'} className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                {label}
            </Link>
        );
    }

    // Dropdown menu
    return (
        <div
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-1 py-2">
                {label}
                <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1 z-50">
                    <div className="w-64 bg-[#0a0a0a] border border-[#1a1a1a] rounded-md shadow-xl">
                        {items.map((item, index) => (
                            <Link
                                key={index}
                                href={item.href}
                                className="block px-4 py-3 hover:bg-[#111] transition-colors border-b border-[#1a1a1a] last:border-0"
                            >
                                <div className="text-sm text-white font-medium">{item.label}</div>
                                {item.description && (
                                    <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function HeaderNav() {
    const navItems: NavItemProps[] = [
        {
            label: 'Get Started',
            items: [
                { label: 'Deploy GPU', href: '/get-started', description: 'Configure and deploy GPU instances' },
                { label: 'Templates', href: '/get-started#templates', description: 'PyTorch, TensorFlow, CUDA' },
                { label: 'Pricing Plans', href: '/pricing', description: 'On-demand & reserved pricing' },
            ],
        },
        {
            label: 'Verification',
            items: [
                { label: 'GPU Verification', href: '/gpu-verification', description: 'On-chain compute audit logs' },
                { label: 'DA Layer Verification', href: '/da-verification', description: 'Data availability block logs' },
            ],
        },
        {
            label: 'Resources',
            items: [
                { label: 'Use Cases', href: '/usecases', description: 'AI Inference, Agents, Fine-tuning' },
                { label: 'Documentation', href: '/docs', description: 'API reference & guides' },
                { label: 'Pricing', href: '/pricing', description: 'GPU pricing & plans' },
            ],
        },
        {
            label: 'Ecosystem',
            items: [
                { label: 'Worldland Scan', href: 'https://scan.worldland.foundation', description: 'Block explorer' },
                { label: 'Worldland Main', href: 'https://worldland.foundation', description: 'Main network homepage' },
            ],
        },
    ];

    return (
        <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item, index) => (
                <NavItem key={index} {...item} />
            ))}
        </nav>
    );
}
