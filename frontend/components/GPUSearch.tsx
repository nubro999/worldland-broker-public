'use client';

interface GPUSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

export default function GPUSearch({ searchTerm, onSearchChange, sortBy, onSortChange }: GPUSearchProps) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Search for a GPU"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-gray-800 rounded-md px-4 py-3 pr-10 text-sm focus:outline-none focus:border-blue-600 transition-colors"
        />
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <button className="bg-[#1a1a1a] border border-gray-800 rounded-md px-4 py-3 flex items-center gap-2 hover:bg-[#252525] transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="bg-transparent text-sm focus:outline-none cursor-pointer"
        >
          <option value="vRAM">vRAM</option>
          <option value="price">Price</option>
          <option value="performance">Performance</option>
        </select>
      </button>
    </div>
  );
}
