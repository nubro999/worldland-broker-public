'use client';

import { useState } from 'react';

export default function FilterBar() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const filters = [
    { id: 'gpu', label: 'GPU', icon: '⚡' },
    { id: 'cloud', label: 'Secure Cloud', icon: '☁' },
    { id: 'network', label: 'Network Volume', icon: '💾' },
    { id: 'region', label: 'Any Region', icon: '🌐' },
  ];

  return (
    <div className="flex items-center gap-4 mb-6 flex-wrap">
      {filters.map((filter) => (
        <button
          key={filter.id}
          className="bg-[#1a1a1a] border border-gray-800 rounded-md px-4 py-2 flex items-center gap-2 hover:bg-[#252525] transition-colors"
          onClick={() => setOpenDropdown(openDropdown === filter.id ? null : filter.id)}
        >
          <span>{filter.icon}</span>
          <span className="text-sm">{filter.label}</span>
          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ))}

      <label className="flex items-center gap-2 text-sm text-gray-400">
        <input type="checkbox" className="w-4 h-4 rounded" />
        <span>Global Networking</span>
      </label>

      <button className="bg-[#1a1a1a] border border-gray-800 rounded-md px-4 py-2 flex items-center gap-2 hover:bg-[#252525] transition-colors text-sm">
        <span>Additional Filters</span>
        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
