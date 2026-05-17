'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrochip, faArrowRight, faArrowLeft, faCheck,
} from '@fortawesome/free-solid-svg-icons';
import BackgroundTerminal from '@/components/BackgroundTerminal';
import { useAuth } from '@/hooks/useAuth';
import { useJobs, useProviders } from '@/hooks/useJobs';

// Docker 이미지 템플릿
const templates = [
  { id: 'pytorch', name: 'PyTorch', description: 'Deep learning', image: 'pytorch/pytorch:latest' },
  { id: 'tensorflow', name: 'TensorFlow', description: 'ML platform', image: 'tensorflow/tensorflow:latest-gpu' },
  { id: 'ubuntu', name: 'Ubuntu', description: 'Linux env', image: 'ubuntu:22.04' },
  { id: 'cuda', name: 'CUDA Base', description: 'NVIDIA CUDA', image: 'nvidia/cuda:12.0-runtime' },
];

export default function CreateJobPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { createJob, loading: jobLoading } = useJobs();
  const { providers, gpuTypes, gpuAvailability, canCreateJob, getAvailabilityByType, loading: providerLoading } = useProviders();

  // Form state
  const [selectedGpuType, setSelectedGpuType] = useState('');
  const [gpuCount, setGpuCount] = useState(1);
  const [cpuCores, setCpuCores] = useState('4');
  const [memoryGb, setMemoryGb] = useState('16');
  const [storageGb, setStorageGb] = useState('50');
  const [sshPassword, setSshPassword] = useState('');
  const [durationHours, setDurationHours] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState('pytorch');
  const [error, setError] = useState('');

  // 선택된 GPU 타입의 Provider 찾기
  const selectedProvider = providers.find(p =>
    p.Spec?.gpus?.some(g => g.name === selectedGpuType)
  );

  // 선택된 GPU의 가용성 정보
  const selectedGpuAvailability = getAvailabilityByType(selectedGpuType);
  const isGpuAvailable = canCreateJob(selectedGpuType, gpuCount);

  // 예상 가격 계산
  const estimatedPrice = selectedProvider
    ? (selectedProvider.Capacity.gpu_price_per_hour * gpuCount * durationHours)
    : 0;

  // 인증 체크
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // 첫 번째 GPU 타입 자동 선택
  useEffect(() => {
    if (gpuTypes.length > 0 && !selectedGpuType) {
      setSelectedGpuType(gpuTypes[0]);
    }
  }, [gpuTypes, selectedGpuType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedGpuType) {
      setError('GPU 타입을 선택해주세요');
      return;
    }

    if (!sshPassword || sshPassword.length < 6) {
      setError('SSH 비밀번호는 6자 이상이어야 합니다');
      return;
    }

    // Build checkout URL with all job configuration
    const template = templates.find(t => t.id === selectedTemplate);
    const params = new URLSearchParams({
      gpu_type: selectedGpuType,
      gpu_count: gpuCount.toString(),
      cpu_cores: cpuCores,
      memory_gb: memoryGb,
      storage_gb: storageGb,
      ssh_password: sshPassword,
      duration: durationHours.toString(),
      image: template?.image || 'pytorch/pytorch:latest',
    });

    router.push(`/jobs/checkout?${params.toString()}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  const loading = jobLoading || providerLoading;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/85 to-black/90 z-10 pointer-events-none" />
        <BackgroundTerminal />
      </div>

      <div className="relative z-20">
        {/* Header */}
        <header className="px-8 py-4 border-b border-[#111]">
          <div className="max-w-[1000px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/"><Image src="/worldland-logo.png" alt="Worldland" width={120} height={32} /></Link>
              <Link href="/jobs" className="text-gray-500 hover:text-white text-sm flex items-center gap-2">
                <FontAwesomeIcon icon={faArrowLeft} className="text-xs" /> Back to Jobs
              </Link>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">{user.email || user.name}</span>
              <button onClick={logout} className="text-gray-500 hover:text-white">Logout</button>
            </div>
          </div>
        </header>

        <main className="px-8 py-8">
          <div className="max-w-[800px] mx-auto">
            {/* Title */}
            <div className="mb-8">
              <h1 className="text-2xl font-medium mb-2">Create GPU Job</h1>
              <p className="text-sm text-gray-500">Configure and deploy a new GPU container</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* GPU Selection */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-4">GPU Configuration</h3>
                
                {/* GPU Type */}
                <div className="mb-4">
                  <label className="text-xs text-gray-500 mb-2 block">GPU Type</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {gpuTypes.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        {providerLoading ? 'Loading providers...' : 'No GPU providers available'}
                      </div>
                    ) : (
                      gpuTypes.map(gpuType => {
                        const availability = getAvailabilityByType(gpuType);
                        const available = availability?.available_gpus || 0;
                        const isAvailable = available > 0;
                        const source = availability?.source || 'unknown';
                        
                        return (
                          <button
                            key={gpuType}
                            type="button"
                            onClick={() => setSelectedGpuType(gpuType)}
                            className={`p-4 rounded border text-left transition-all relative ${
                              selectedGpuType === gpuType
                                ? 'border-red-500 bg-red-500/10'
                                : isAvailable 
                                  ? 'border-[#222] hover:border-[#333]'
                                  : 'border-[#222] opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                selectedGpuType === gpuType ? 'bg-red-500' : 'bg-[#111]'
                              }`}>
                                <FontAwesomeIcon
                                  icon={selectedGpuType === gpuType ? faCheck : faMicrochip}
                                  className={`text-xs ${selectedGpuType === gpuType ? 'text-white' : 'text-gray-500'}`}
                                />
                              </div>
                              <span className="font-medium text-sm">{gpuType}</span>
                            </div>
                            
                            {/* 가용성 상태 표시 */}
                            <div className="mt-2 flex items-center justify-between">
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                isAvailable 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {isAvailable ? `${available} Available` : 'Unavailable'}
                              </span>
                              {availability && (
                                <span className={`text-[10px] ${
                                  source === 'cluster' ? 'text-green-600' : 'text-yellow-600'
                                }`}>
                                  {source === 'cluster' ? '● Live' : '○ Cached'}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* GPU Count */}
                <div className="mb-4">
                  <label className="text-xs text-gray-500 mb-2 block">GPU Count: {gpuCount}</label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={gpuCount}
                    onChange={e => setGpuCount(+e.target.value)}
                    className="w-full accent-red-500"
                  />
                </div>
              </div>

              {/* Resources */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Resources</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">CPU Cores</label>
                    <select
                      value={cpuCores}
                      onChange={e => setCpuCores(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm"
                    >
                      <option value="2">2 Cores</option>
                      <option value="4">4 Cores</option>
                      <option value="8">8 Cores</option>
                      <option value="16">16 Cores</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">Memory</label>
                    <select
                      value={memoryGb}
                      onChange={e => setMemoryGb(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm"
                    >
                      <option value="8">8 GB</option>
                      <option value="16">16 GB</option>
                      <option value="32">32 GB</option>
                      <option value="64">64 GB</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">Storage</label>
                    <select
                      value={storageGb}
                      onChange={e => setStorageGb(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm"
                    >
                      <option value="20">20 GB</option>
                      <option value="50">50 GB</option>
                      <option value="100">100 GB</option>
                      <option value="200">200 GB</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Template & Duration */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-4">Environment</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">Template</label>
                    <select
                      value={selectedTemplate}
                      onChange={e => setSelectedTemplate(e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm"
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} - {t.description}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">Duration (hours)</label>
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={durationHours}
                      onChange={e => setDurationHours(+e.target.value)}
                      className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* SSH Password */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">SSH Password *</label>
                  <input
                    type="password"
                    value={sshPassword}
                    onChange={e => setSshPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">Use this password to SSH into your container</p>
                </div>
              </div>

              {/* Price Summary */}
              {selectedProvider && (
                <div className={`border rounded-md p-4 ${
                  isGpuAvailable 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Estimated Cost</span>
                    <span className={`text-xl font-bold ${isGpuAvailable ? 'text-red-400' : 'text-yellow-400'}`}>
                      ${estimatedPrice.toFixed(2)} / {durationHours}hr
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {gpuCount}x {selectedGpuType} × ${selectedProvider.Capacity.gpu_price_per_hour}/hr × {durationHours}hr
                  </p>
                  
                  {/* GPU 가용성 경고 */}
                  {!isGpuAvailable && selectedGpuAvailability && (
                    <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-sm">
                      ⚠️ Requested {gpuCount} GPU(s) but only {selectedGpuAvailability.available_gpus} available.
                      {selectedGpuAvailability.source === 'cluster' 
                        ? ' (Real-time from cluster)' 
                        : ' (Cached data)'
                      }
                    </div>
                  )}
                  
                  {/* 클러스터 오프라인 경고 */}
                  {selectedGpuAvailability && !selectedGpuAvailability.cluster_online && (
                    <div className="mt-2 text-xs text-yellow-600">
                      ⚡ Cluster status unavailable - using cached availability data
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-red-400 text-sm p-4 bg-red-500/10 border border-red-500/30 rounded">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-between pt-4">
                <Link href="/jobs" className="px-6 py-2 text-gray-400 hover:text-white flex items-center gap-2">
                  <FontAwesomeIcon icon={faArrowLeft} /> Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || !selectedGpuType || !isGpuAvailable}
                  className={`px-8 py-3 rounded font-medium flex items-center gap-2 ${
                    !isGpuAvailable && selectedGpuType
                      ? 'bg-yellow-600 hover:bg-yellow-700 cursor-not-allowed'
                      : 'bg-red-500 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed'
                  }`}
                  title={!isGpuAvailable ? 'GPU not available' : ''}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Loading...
                    </>
                  ) : !isGpuAvailable && selectedGpuType ? (
                    <>
                      GPU Unavailable
                    </>
                  ) : (
                    <>
                      Proceed to Checkout <FontAwesomeIcon icon={faArrowRight} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
