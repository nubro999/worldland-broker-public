import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface MerkleBlock {
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

export async function GET() {
    try {
        // Read data.txt from project root
        const dataPath = path.join(process.cwd(), '..', 'data.txt');
        const fileContent = fs.readFileSync(dataPath, 'utf-8');

        const lines = fileContent.split('\n').filter(line => line.trim());
        const blocks: MerkleBlock[] = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        }).filter(Boolean) as MerkleBlock[];

        // Return in reverse order (newest first)
        return NextResponse.json({
            success: true,
            data: blocks.reverse(),
            total: blocks.length
        });
    } catch (error) {
        console.error('Error reading merkle data:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to read merkle data'
        }, { status: 500 });
    }
}
