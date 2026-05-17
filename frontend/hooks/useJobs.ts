'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, Job, CreateJobRequest, Provider, GPUAvailability } from '@/lib/api-client';
import { useAuth } from './useAuth';

export function useJobs() {
  const { isAuthenticated } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's jobs
  const fetchJobs = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.listJobs();
      setJobs(data.jobs || []);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Create new job
  const createJob = useCallback(
    async (data: CreateJobRequest) => {
      try {
        setLoading(true);
        setError(null);
        const job = await apiClient.createJob(data);
        await fetchJobs();
        return job;
      } catch (err: any) {
        console.error('Error creating job:', err);
        setError(err.message || 'Failed to create job');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchJobs]
  );

  // Delete job
  const deleteJob = useCallback(
    async (jobId: string) => {
      try {
        setLoading(true);
        setError(null);
        await apiClient.deleteJob(jobId);
        await fetchJobs();
      } catch (err: any) {
        console.error('Error deleting job:', err);
        setError(err.message || 'Failed to delete job');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchJobs]
  );

  // Get single job
  const getJob = useCallback(async (jobId: string) => {
    try {
      setLoading(true);
      setError(null);
      const job = await apiClient.getJob(jobId);
      return job;
    } catch (err: any) {
      console.error('Error fetching job:', err);
      setError(err.message || 'Failed to fetch job');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchJobs();
    }
  }, [isAuthenticated, fetchJobs]);

  // Polling every 5 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      fetchJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchJobs]);

  return {
    jobs,
    loading,
    error,
    createJob,
    deleteJob,
    getJob,
    refetch: fetchJobs,
  };
}

// Provider 조회 hook
export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [gpuAvailability, setGpuAvailability] = useState<GPUAvailability[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.listProviders();
      setProviders(data.providers || []);
    } catch (err: any) {
      console.error('Error fetching providers:', err);
      setError(err.message || 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  }, []);

  // 실시간 GPU 가용성 조회
  const fetchGPUAvailability = useCallback(async () => {
    try {
      const data = await apiClient.getGPUAvailability();
      setGpuAvailability(data.providers || []);
      setTotalAvailable(data.total_available || 0);
    } catch (err: any) {
      console.error('Error fetching GPU availability:', err);
      // 에러 시 fallback - provider의 캐시 데이터 사용
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchProviders();
    fetchGPUAvailability();
  }, [fetchProviders, fetchGPUAvailability]);

  // 3초마다 GPU 가용성 폴링
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGPUAvailability();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchGPUAvailability]);

  // GPU 타입 목록 추출
  const gpuTypes = [...new Set(
    providers
      .flatMap(p => p.Spec?.gpus?.map(g => g.name) || [])
      .filter(Boolean)
  )];

  // 특정 GPU 타입의 가용성 조회
  const getAvailabilityByType = useCallback((gpuType: string) => {
    return gpuAvailability.find(a => a.gpu_type === gpuType);
  }, [gpuAvailability]);

  // 특정 GPU 타입이 생성 가능한지 확인
  const canCreateJob = useCallback((gpuType: string, gpuCount: number = 1): boolean => {
    const availability = gpuAvailability.find(a => a.gpu_type === gpuType);
    if (!availability) return false;
    return availability.available_gpus >= gpuCount;
  }, [gpuAvailability]);

  return {
    providers,
    gpuTypes,
    gpuAvailability,
    totalAvailable,
    loading,
    error,
    refetch: fetchProviders,
    refreshAvailability: fetchGPUAvailability,
    getAvailabilityByType,
    canCreateJob,
  };
}
