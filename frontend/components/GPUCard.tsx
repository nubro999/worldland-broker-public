interface GPU {
  id: string;
  name: string;
  price: number;
  securePrice: number;
  vram: number;
  ram: number;
  vcpu: number;
  maxInstances: number;
  availability: 'Low' | 'Medium' | 'High';
  featured: boolean;
}

interface GPUCardProps {
  gpu: GPU;
}

export default function GPUCard({ gpu }: GPUCardProps) {
  const availabilityColors = {
    Low: 'text-yellow-500',
    Medium: 'text-blue-500',
    High: 'text-red-500',
  };

  return (
    <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-5 hover:border-blue-600 transition-all cursor-pointer group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">{gpu.name}</h3>
          {gpu.featured && (
            <div className="flex items-center gap-1 text-blue-400 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>Featured</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">${gpu.price.toFixed(2)}/hr</div>
          <div className="text-sm text-red-500">{gpu.securePrice.toFixed(2)}/hr</div>
        </div>
      </div>

      {/* Specs */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{gpu.vram} GB VRAM</span>
          <span className="text-gray-400">{gpu.maxInstances} max</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{gpu.ram} GB RAM</span>
          <span>•</span>
          <span>{gpu.vcpu} vCPU</span>
        </div>
      </div>

      {/* Availability */}
      <div className={`text-sm font-medium ${availabilityColors[gpu.availability]}`}>
        {gpu.availability}
      </div>
    </div>
  );
}
