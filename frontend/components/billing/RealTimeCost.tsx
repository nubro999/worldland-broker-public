'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface RealTimeCostProps {
  pricePerSec: bigint;
  startTime: bigint;
  isActive: boolean;
  decimals?: number;
}

export default function RealTimeCost({
  pricePerSec,
  startTime,
  isActive,
  decimals = 18,
}: RealTimeCostProps) {
  const [currentCost, setCurrentCost] = useState<string>('0.0');
  const [duration, setDuration] = useState<string>('0s');

  // Price is always stored with 6 decimals (USDT standard)
  const PRICE_DECIMALS = 6;

  useEffect(() => {
    if (!isActive) {
      // If not active, calculate final cost
      const start = Number(startTime);
      const now = Math.floor(Date.now() / 1000);
      const elapsed = BigInt(now - start);
      const cost = pricePerSec * elapsed;
      setCurrentCost(
        parseFloat(ethers.formatUnits(cost, PRICE_DECIMALS)).toLocaleString('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      );
      return;
    }

    // Calculate and update cost every second
    const calculateCost = () => {
      const start = Number(startTime);
      const now = Math.floor(Date.now() / 1000);
      const elapsed = BigInt(now - start);
      const cost = pricePerSec * elapsed;

      // Format cost - use PRICE_DECIMALS since cost is in same unit as price
      setCurrentCost(
        parseFloat(ethers.formatUnits(cost, PRICE_DECIMALS)).toLocaleString('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      );

      // Format duration
      const elapsedSeconds = now - start;
      const hours = Math.floor(elapsedSeconds / 3600);
      const minutes = Math.floor((elapsedSeconds % 3600) / 60);
      const seconds = elapsedSeconds % 60;

      if (hours > 0) {
        setDuration(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setDuration(`${minutes}m ${seconds}s`);
      } else {
        setDuration(`${seconds}s`);
      }
    };

    // Initial calculation
    calculateCost();

    // Update every second
    const interval = setInterval(calculateCost, 1000);

    return () => clearInterval(interval);
  }, [pricePerSec, startTime, isActive, decimals]);

  return (
    <div className="bg-white/[0.05] backdrop-blur-md border border-white/[0.1] rounded-md p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-gray-500 rounded flex items-center justify-center shadow-lg shadow-red-500/30">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        Current Cost
      </h2>

      <div className="space-y-4">
        {/* Cost Display */}
        <div>
          <div className="text-sm text-gray-400 mb-2">Accumulated Cost</div>
          <div className="text-4xl font-black bg-gradient-to-r from-red-400 to-gray-400 bg-clip-text text-transparent">
            {currentCost} USDT
          </div>
          {isActive && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
              <span className="text-xs text-red-400 font-semibold">Live Updating</span>
            </div>
          )}
        </div>

        {/* Duration */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="text-sm text-gray-400 mb-1">Running Time</div>
          <div className="text-xl font-bold text-white">{duration}</div>
        </div>

        {/* Price Rate */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="text-sm text-gray-400 mb-1">Price Rate</div>
          <div className="text-lg font-mono text-white">
            {parseFloat(ethers.formatUnits(pricePerSec, PRICE_DECIMALS)).toLocaleString('en-US', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 6,
            })}{' '}
            USDT/s
          </div>
        </div>

        {/* Status */}
        {!isActive && (
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 mt-4">
            <p className="text-xs text-yellow-400 font-semibold">
              ⚠️ Billing session has ended. This is the final cost.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
