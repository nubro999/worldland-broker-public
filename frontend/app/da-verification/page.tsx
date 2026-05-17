'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDatabase,
    faExternalLinkAlt,
    faCheckCircle,
    faCubes,
    faNetworkWired,
} from '@fortawesome/free-solid-svg-icons';
import BackgroundTerminal from '@/components/BackgroundTerminal';

// Generate random hash
const generateHash = () => {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
};

interface BlockEntry {
    id: number;
    blockNumber: number;
    txCount: number;
    dataHash: string;
    timestamp: string;
}

export default function DAVerificationPage() {
    const [entries, setEntries] = useState<BlockEntry[]>([]);
    const [latestBlock, setLatestBlock] = useState(1248923);
    const [totalData, setTotalData] = useState(2.4);
    const [availability, setAvailability] = useState(99.9);
    const idRef = useRef(0);

    // Add new block every 3-5 seconds
    useEffect(() => {
        const addEntry = () => {
            const newEntry: BlockEntry = {
                id: idRef.current++,
                blockNumber: latestBlock + idRef.current,
                txCount: Math.floor(Math.random() * 50) + 20,
                dataHash: generateHash().slice(0, 18) + '...',
                timestamp: new Date().toLocaleTimeString(),
            };

            setEntries(prev => [newEntry, ...prev].slice(0, 50));
            setLatestBlock(prev => prev + 1);
            setTotalData(prev => +(prev + 0.001).toFixed(3));
        };

        // Add initial entries
        for (let i = 0; i < 10; i++) {
            addEntry();
        }

        const interval = setInterval(addEntry, Math.random() * 2000 + 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/85 to-black/90 z-10 pointer-events-none" />
                <BackgroundTerminal />
            </div>

            <div className="relative z-20">
                {/* Header */}
                <header className="px-8 py-4 border-b border-[#111]">
                    <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <Link href="/"><Image src="/worldland-logo.png" alt="Worldland" width={120} height={32} /></Link>
                            <nav className="hidden md:flex items-center gap-6 text-sm">
                                <Link href="/get-started" className="text-gray-500 hover:text-white">Get Started</Link>
                                <Link href="/gpu-verification" className="text-gray-500 hover:text-white">GPU Verify</Link>
                                <Link href="/da-verification" className="text-white">DA Verify</Link>
                                <Link href="/usecases" className="text-gray-500 hover:text-white">Usecases</Link>
                                <Link href="/docs" className="text-gray-500 hover:text-white">Docs</Link>
                                <Link href="/pricing" className="text-gray-500 hover:text-white">Pricing</Link>
                            </nav>
                        </div>
                        <Link href="/auth/signup" className="text-xs px-4 py-2 bg-red-500 hover:bg-red-600 rounded-full font-medium">Sign Up</Link>
                    </div>
                </header>

                {/* Main */}
                <main className="px-8 py-8">
                    <div className="max-w-[1400px] mx-auto">
                        {/* Title */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-medium mb-2">DA Layer Verification</h1>
                            <p className="text-sm text-gray-500">Data Availability Layer block logs and verification</p>
                        </div>

                        {/* Stats */}
                        <div className="grid md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 flex items-center gap-4">
                                <FontAwesomeIcon icon={faCubes} className="text-red-500" />
                                <div>
                                    <div className="text-xl font-medium font-mono">{latestBlock.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">Latest Block</div>
                                </div>
                            </div>
                            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 flex items-center gap-4">
                                <FontAwesomeIcon icon={faDatabase} className="text-gray-500" />
                                <div>
                                    <div className="text-xl font-medium">{totalData} TB</div>
                                    <div className="text-xs text-gray-500">Total Data</div>
                                </div>
                            </div>
                            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 flex items-center gap-4">
                                <FontAwesomeIcon icon={faNetworkWired} className="text-gray-500" />
                                <div>
                                    <div className="text-xl font-medium">{availability}%</div>
                                    <div className="text-xs text-gray-500">Availability</div>
                                </div>
                            </div>
                        </div>

                        {/* Live Feed */}
                        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                                <div className="flex items-center gap-3">
                                    <FontAwesomeIcon icon={faDatabase} className="text-gray-500" />
                                    <span className="text-sm font-medium">DA Layer Block Log</span>
                                    <span className="flex items-center gap-1 text-xs text-red-500">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                        Live
                                    </span>
                                </div>
                                <a href="https://scan.worldland.foundation/txs" target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                                    Worldland Scan <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
                                </a>
                            </div>

                            <div className="h-[500px] overflow-y-auto">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-[#0a0a0a]">
                                        <tr className="border-b border-[#1a1a1a] text-xs text-gray-500">
                                            <th className="text-left py-3 px-4 font-medium">Block</th>
                                            <th className="text-left py-3 px-4 font-medium">TX Count</th>
                                            <th className="text-left py-3 px-4 font-medium">Data Hash</th>
                                            <th className="text-left py-3 px-4 font-medium">Time</th>
                                            <th className="text-left py-3 px-4 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entries.map((entry, index) => (
                                            <tr key={entry.id}
                                                className={`border-b border-[#111] text-xs hover:bg-[#111] transition-all ${index === 0 ? 'animate-pulse bg-red-500/5' : ''
                                                    }`}>
                                                <td className="py-3 px-4 font-mono text-red-400">#{entry.blockNumber}</td>
                                                <td className="py-3 px-4 text-gray-400">{entry.txCount}</td>
                                                <td className="py-3 px-4 font-mono text-gray-500">{entry.dataHash}</td>
                                                <td className="py-3 px-4 text-gray-500">{entry.timestamp}</td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400">
                                                        <FontAwesomeIcon icon={faCheckCircle} className="text-[8px]" />
                                                        Confirmed
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
