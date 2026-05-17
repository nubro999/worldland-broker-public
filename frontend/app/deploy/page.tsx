'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiClient, Provider } from '@/lib/api-client';

// GPU 디스플레이용 타입
interface GPUDisplay {
  id: string;
  name: string;
  vram: string;
  price: string;
  pricePerHour: number;
  availability: string;
  availableCount: number;
  totalCount: number;
  performance: string;
  providerId: string;
  image: string;
}

// GPU 이미지 매핑 (실제 이미지가 없을 경우 기본 이미지 사용)
const GPU_IMAGES: Record<string, string> = {
  'Tesla T4': 'https://images.unsplash.com/photo-1591489378430-ef2d4c585f41?w=400&h=300&fit=crop',
  'RTX 4090': 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&h=300&fit=crop',
  'RTX 4080': 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=300&fit=crop',
  'A100': 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop',
  'H100': 'https://images.unsplash.com/photo-1640955014216-75201056c829?w=400&h=300&fit=crop',
  'A40': 'https://images.unsplash.com/photo-1623282033815-40b05d96c903?w=400&h=300&fit=crop',
  'default': 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&h=300&fit=crop',
};

function getGPUImage(gpuName: string): string {
  for (const [key, url] of Object.entries(GPU_IMAGES)) {
    if (gpuName.toLowerCase().includes(key.toLowerCase())) {
      return url;
    }
  }
  return GPU_IMAGES['default'];
}

// Provider에서 GPU 디스플레이 데이터 변환
function providerToGPUDisplay(provider: Provider): GPUDisplay[] {
  const gpus: GPUDisplay[] = [];
  
  if (provider.Spec.gpus && provider.Spec.gpus.length > 0) {
    const gpu = provider.Spec.gpus[0];
    const vramGB = Math.round(gpu.memory_mb / 1024);
    const totalGpus = provider.Spec.total_gpus || provider.Spec.gpus.length;
    const availableGpus = provider.Capacity.gpu_count || 0;
    
    gpus.push({
      id: `${provider.ProviderID}-${gpu.name}`,
      name: gpu.name,
      vram: `${vramGB}GB`,
      pricePerHour: provider.Capacity.gpu_price_per_hour || 0.5,
      price: `$${(provider.Capacity.gpu_price_per_hour || 0.5).toFixed(2)}/hr`,
      availability: `${availableGpus} / ${totalGpus} available`,
      availableCount: availableGpus,
      totalCount: totalGpus,
      performance: gpu.driver_ver ? `Driver: ${gpu.driver_ver}` : 'N/A',
      providerId: provider.ProviderID,
      image: getGPUImage(gpu.name),
    });
  }
  
  return gpus;
}

export default function DeployPodPage() {
  const [gpus, setGpus] = useState<GPUDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGPUs() {
      try {
        setLoading(true);
        const response = await apiClient.listProviders();
        
        // Provider 목록에서 GPU 정보 추출
        const gpuList: GPUDisplay[] = [];
        for (const provider of response.providers || []) {
          if (provider.Status === 'available' || provider.Status === 'joined') {
            gpuList.push(...providerToGPUDisplay(provider));
          }
        }
        
        setGpus(gpuList);
      } catch (err) {
        console.error('Failed to fetch GPUs:', err);
        setError('GPU 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchGPUs();
  }, []);

  const handleRentClick = (gpu: GPUDisplay) => {
    // Job 생성 페이지로 이동하거나 모달 표시
    window.location.href = `/jobs/create?provider=${gpu.providerId}&gpu=${encodeURIComponent(gpu.name)}`;
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background gradient - Red theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/5 via-black to-gray-900/5"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/8 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-600/8 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 right-1/3 w-96 h-96 bg-red-600/6 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.01]"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 bg-black/20 backdrop-blur-xl border-b border-white/[0.06] px-8 md:px-12 py-6 sticky top-0">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image
                src="/worldland-logo.png"
                alt="Worldland"
                width={140}
                height={40}
                className="relative z-10"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/5">
                Dashboard
              </Link>
              <Link href="/instances" className="text-gray-400 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/5">
                Instances
              </Link>
              <Link href="/billing" className="text-gray-400 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/5">
                Billing
              </Link>
              <Link href="/deploy" className="text-white font-semibold px-4 py-2 rounded-lg bg-white/10">
                Deploy
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">
              Balance: <span className="text-white font-bold">0.00 ETH</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 py-12 md:py-16">
        <div className="max-w-[1400px] mx-auto px-16 md:px-24">
          {/* Header */}
          <div className="mb-16 fade-in-up">
            <h1 className="text-3xl md:text-4xl font-black mb-3 text-white">Browse GPU Marketplace</h1>
            <p className="text-gray-400 text-lg">
              Rent high-performance GPUs for your AI/ML workloads. Pay only for what you use.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-12 fade-in-up animation-delay-200">
            <button className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-white rounded-lg text-sm font-semibold hover:bg-red-500/30 transition-all">
              All GPUs
            </button>
            <button className="px-4 py-2 bg-white/[0.02] border border-white/[0.06] text-gray-400 rounded-lg text-sm font-medium hover:bg-white/[0.08] hover:text-white transition-all">
              NVIDIA
            </button>
            <button className="px-4 py-2 bg-white/[0.02] border border-white/[0.06] text-gray-400 rounded-lg text-sm font-medium hover:bg-white/[0.08] hover:text-white transition-all">
              Available Only
            </button>
            <div className="ml-auto flex items-center gap-2">
              {loading ? (
                <span className="text-sm text-gray-500">Loading...</span>
              ) : (
                <span className="text-sm text-gray-500">{gpus.length} GPU types available</span>
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/[0.05] rounded-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-800"></div>
                  <div className="p-5 space-y-3">
                    <div className="h-6 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && gpus.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">현재 사용 가능한 GPU가 없습니다.</p>
              <Link 
                href="/docs"
                className="text-red-400 hover:text-red-300 underline"
              >
                Provider로 참여하기
              </Link>
            </div>
          )}

          {/* GPU Grid */}
          {!loading && !error && gpus.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fade-in-up animation-delay-400">
              {gpus.map((gpu) => (
                <div
                  key={gpu.id}
                  className="group relative bg-white/[0.05] backdrop-blur-md border border-white/[0.1] rounded-md overflow-hidden hover:border-red-500/50 transition-all hover:scale-[1.02]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  {/* GPU Image */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
                    <Image
                      src={gpu.image}
                      alt={gpu.name}
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                    />
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 backdrop-blur-md border text-xs font-bold rounded-full ${
                        gpu.availableCount > 0 
                          ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                          : 'bg-red-500/20 border-red-500/30 text-red-400'
                      }`}>
                        {gpu.availability}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="relative p-5">
                    {/* GPU Name */}
                    <h3 className="text-lg font-bold text-white mb-3">{gpu.name}</h3>

                    {/* Specs */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">VRAM</span>
                        <span className="text-white font-semibold">{gpu.vram}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Status</span>
                        <span className="text-white font-semibold">{gpu.performance}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-4 pt-4 border-t border-white/[0.06]">
                      <span className="text-gray-500 text-sm">Price</span>
                      <span className="text-2xl font-black text-red-500">
                        {gpu.price}
                      </span>
                    </div>

                    {/* Rent Button */}
                    <button 
                      onClick={() => handleRentClick(gpu)}
                      disabled={gpu.availableCount === 0}
                      className={`w-full py-3 font-bold rounded transition-all shadow-lg ${
                        gpu.availableCount > 0
                          ? 'bg-red-500 hover:bg-red-600 text-white hover:scale-105 hover:shadow-red-500/25'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {gpu.availableCount > 0 ? 'Rent Now' : 'Not Available'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
