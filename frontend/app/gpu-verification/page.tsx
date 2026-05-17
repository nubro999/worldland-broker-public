'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheckCircle,
    faClock,
    faShieldAlt,
    faExternalLinkAlt,
    faCopy,
    faTimes,
    faCube,
    faLink,
    faDatabase,
    faBolt,
    faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';
import BackgroundTerminal from '@/components/BackgroundTerminal';

interface MerkleBlock {
    seq: number;
    timestamp: number;
    merkle_root: string;
    prev_hash: string;
    chain_hash: string;
    hardware_summary: {
        avg_power_watts: number;
    };
    da_info: {
        file: string;
        offset: number;
        size: number;
        count: number;
    };
}

const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const formatRelativeTime = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const truncateHash = (hash: string, start = 8, end = 6) => {
    if (hash.length <= start + end) return hash;
    return `${hash.slice(0, start)}...${hash.slice(-end)}`;
};

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
};

export default function GPUVerificationPage() {
    const [allBlocks, setAllBlocks] = useState<MerkleBlock[]>([]);
    const [visibleBlocks, setVisibleBlocks] = useState<MerkleBlock[]>([]);
    const [selectedBlock, setSelectedBlock] = useState<MerkleBlock | null>(null);
    const [loading, setLoading] = useState(true);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(true);
    const [newBlockId, setNewBlockId] = useState<number | null>(null);
    const streamIndexRef = useRef(0);

    // Fetch all blocks
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/merkle-data');
                const result = await response.json();
                if (result.success) {
                    // Reverse to show oldest first for streaming effect
                    setAllBlocks(result.data.reverse());
                }
            } catch (error) {
                console.error('Failed to fetch merkle data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Stream blocks one by one
    useEffect(() => {
        if (loading || allBlocks.length === 0) return;

        // Initially show first 5 blocks quickly
        const initialBlocks = allBlocks.slice(0, 5);
        setVisibleBlocks(initialBlocks.reverse());
        streamIndexRef.current = 5;

        // Then stream remaining blocks
        const interval = setInterval(() => {
            if (streamIndexRef.current >= allBlocks.length) {
                // Loop back: restart streaming
                streamIndexRef.current = 0;
                setVisibleBlocks([]);
                return;
            }

            const newBlock = allBlocks[streamIndexRef.current];
            setNewBlockId(newBlock.seq);
            setVisibleBlocks(prev => [newBlock, ...prev].slice(0, 50));
            streamIndexRef.current++;

            // Clear highlight after animation
            setTimeout(() => setNewBlockId(null), 1500);
        }, 2000 + Math.random() * 1500); // 2-3.5초 간격

        return () => clearInterval(interval);
    }, [loading, allBlocks]);

    const handleCopy = (text: string, field: string) => {
        copyToClipboard(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const totalBlocks = allBlocks.length;
    const latestBlock = visibleBlocks[0];

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
                                <Link href="/gpu-verification" className="text-white">GPU Verify</Link>
                                <Link href="/da-verification" className="text-gray-500 hover:text-white">DA Verify</Link>
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
                    <div className="max-w-[1200px] mx-auto">
                        {/* Title */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-medium mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                GPU Compute Verification
                            </h1>
                            <p className="text-sm text-gray-500">Merkle Root based on-chain audit logs for GPU compute layer</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-500/10 rounded flex items-center justify-center">
                                        <FontAwesomeIcon icon={faLayerGroup} className="text-red-500" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">{visibleBlocks.length}</div>
                                        <div className="text-xs text-gray-500">Verified Blocks</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500/10 rounded flex items-center justify-center">
                                        <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">#{latestBlock?.seq ?? 0}</div>
                                        <div className="text-xs text-gray-500">Latest Sequence</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#111] rounded flex items-center justify-center">
                                        <FontAwesomeIcon icon={faShieldAlt} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-mono text-red-400 truncate max-w-[180px]">
                                            {latestBlock?.merkle_root ? `0x${truncateHash(latestBlock.merkle_root)}` : '-'}
                                        </div>
                                        <div className="text-xs text-gray-500">Latest Merkle Root</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Blocks List */}
                        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
                                <div className="flex items-center gap-3">
                                    <FontAwesomeIcon icon={faCube} className="text-red-500" />
                                    <span className="font-medium">Merkle Root Blocks</span>
                                    <span className="flex items-center gap-1.5 text-xs">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-green-400">Live</span>
                                    </span>
                                </div>
                                <a href="https://scan.worldland.foundation/txs" target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                                    Worldland Scan <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
                                </a>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center h-64 text-gray-500">
                                    <div className="animate-spin w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full mr-2"></div>
                                    Loading blocks...
                                </div>
                            ) : (
                                <div className="divide-y divide-[#111] max-h-[500px] overflow-y-auto">
                                    {visibleBlocks.map((block) => (
                                        <div
                                            key={block.seq}
                                            onClick={() => setSelectedBlock(block)}
                                            className={`px-6 py-4 hover:bg-[#111] cursor-pointer transition-all duration-500 ${newBlockId === block.seq
                                                    ? 'bg-red-500/10 animate-pulse border-l-2 border-l-red-500'
                                                    : ''
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    {/* Block Number */}
                                                    <div className={`w-12 h-12 border rounded flex items-center justify-center transition-all ${newBlockId === block.seq
                                                            ? 'bg-red-500/20 border-red-500'
                                                            : 'bg-[#111] border-[#222]'
                                                        }`}>
                                                        <span className="text-sm font-medium text-red-400">#{block.seq}</span>
                                                    </div>

                                                    {/* Block Info */}
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs text-gray-500">Merkle Root</span>
                                                            <span className="font-mono text-sm text-red-400">
                                                                0x{truncateHash(block.merkle_root, 10, 8)}
                                                            </span>
                                                            {newBlockId === block.seq && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded animate-pulse">
                                                                    NEW
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <FontAwesomeIcon icon={faLink} className="text-[10px]" />
                                                                0x{truncateHash(block.chain_hash, 6, 4)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <FontAwesomeIcon icon={faDatabase} className="text-[10px]" />
                                                                {block.da_info.count} leaves
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Time & Status */}
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-400 mb-1">
                                                        {newBlockId === block.seq ? 'Just now' : formatRelativeTime(block.timestamp)}
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${newBlockId === block.seq
                                                            ? 'bg-green-500/20 text-green-400 border-green-500/30 animate-pulse'
                                                            : 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        }`}>
                                                        <FontAwesomeIcon icon={faCheckCircle} className="text-[8px]" />
                                                        Verified
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Detail Modal */}
            {selectedBlock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedBlock(null)} />
                    <div className="relative bg-[#0a0a0a] border border-[#1a1a1a] rounded-md w-full max-w-2xl max-h-[90vh] overflow-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-red-500/10 flex items-center justify-center">
                                    <FontAwesomeIcon icon={faCube} className="text-red-500" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">Block #{selectedBlock.seq}</h2>
                                    <p className="text-xs text-gray-500">Merkle Root Details</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedBlock(null)}
                                className="w-8 h-8 rounded hover:bg-[#1a1a1a] flex items-center justify-center transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-4">
                            {/* Merkle Root */}
                            <div className="bg-[#111] border border-[#222] rounded p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-500 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faShieldAlt} className="text-red-500" />
                                        Merkle Root
                                    </span>
                                    <button
                                        onClick={() => handleCopy(selectedBlock.merkle_root, 'merkle')}
                                        className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                                    >
                                        <FontAwesomeIcon icon={faCopy} />
                                        {copiedField === 'merkle' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <code className="text-sm font-mono text-red-400 break-all">
                                    0x{selectedBlock.merkle_root}
                                </code>
                            </div>

                            {/* Chain Hash */}
                            <div className="bg-[#111] border border-[#222] rounded p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-500 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faLink} className="text-gray-400" />
                                        Chain Hash
                                    </span>
                                    <button
                                        onClick={() => handleCopy(selectedBlock.chain_hash, 'chain')}
                                        className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                                    >
                                        <FontAwesomeIcon icon={faCopy} />
                                        {copiedField === 'chain' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <code className="text-sm font-mono text-gray-400 break-all">
                                    0x{selectedBlock.chain_hash}
                                </code>
                            </div>

                            {/* Previous Hash */}
                            <div className="bg-[#111] border border-[#222] rounded p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-500 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faCube} className="text-gray-500" />
                                        Previous Hash
                                    </span>
                                    <button
                                        onClick={() => handleCopy(selectedBlock.prev_hash, 'prev')}
                                        className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                                    >
                                        <FontAwesomeIcon icon={faCopy} />
                                        {copiedField === 'prev' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <code className="text-sm font-mono text-gray-500 break-all">
                                    0x{selectedBlock.prev_hash}
                                </code>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#111] border border-[#222] rounded p-4">
                                    <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faClock} className="text-gray-400" />
                                        Timestamp
                                    </div>
                                    <div className="text-sm">{formatTime(selectedBlock.timestamp)}</div>
                                    <div className="text-xs text-gray-500 mt-1">{formatRelativeTime(selectedBlock.timestamp)}</div>
                                </div>
                                <div className="bg-[#111] border border-[#222] rounded p-4">
                                    <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faBolt} className="text-gray-400" />
                                        Avg Power
                                    </div>
                                    <div className="text-sm">{selectedBlock.hardware_summary.avg_power_watts} W</div>
                                </div>
                            </div>

                            {/* DA Info */}
                            <div className="bg-[#111] border border-[#222] rounded p-4">
                                <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faDatabase} className="text-red-500" />
                                    Data Availability Info
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <div className="text-gray-500 text-xs mb-1">File</div>
                                        <div className="font-mono text-xs truncate">{selectedBlock.da_info.file}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs mb-1">Offset</div>
                                        <div className="font-mono">{selectedBlock.da_info.offset.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs mb-1">Size</div>
                                        <div className="font-mono">{selectedBlock.da_info.size.toLocaleString()} bytes</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs mb-1">Leaf Count</div>
                                        <div className="font-mono">{selectedBlock.da_info.count}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-[#222]">
                                <a
                                    href={`https://scan.worldland.foundation/tx/0x${selectedBlock.chain_hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 rounded font-medium transition-colors"
                                >
                                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                                    View on Worldland Scan
                                </a>
                                <button
                                    onClick={() => handleCopy(JSON.stringify(selectedBlock, null, 2), 'json')}
                                    className="px-4 py-3 bg-[#111] border border-[#222] hover:bg-[#1a1a1a] rounded font-medium transition-colors"
                                >
                                    {copiedField === 'json' ? 'Copied!' : 'Copy JSON'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
