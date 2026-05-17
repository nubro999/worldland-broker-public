/**
 * API Client for k8s-proxy-server
 * 백엔드 API에 맞게 조정됨
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// User 타입
export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

// 로그인 응답
export interface LoginResponse {
  token: string;
  user: User;
}

// Job 상태 타입
export type JobStatus = 'creating' | 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown';

// 리소스 제안
export interface ResourceSuggestion {
  action: string;
  recommended_memory?: string;
  recommended_cpu?: string;
  message: string;
}

// Job 타입 (백엔드 GPUJobResponse와 일치)
export interface Job {
  job_id: string;
  provider_id?: string;
  status: JobStatus;
  
  // 할당된 리소스
  gpu_count?: number;
  gpu_model?: string;
  cpu_cores?: string;
  memory_gb?: string;
  storage_gb?: string;
  
  // SSH 접속 정보
  ssh_host: string;
  ssh_port: number;
  ssh_user: string;
  ssh_password?: string;
  
  // 가격 및 만료
  price_per_hour?: number;
  expires_at?: string;
  message?: string;
  
  // 실패 정보
  failure_reason?: string;
  failure_message?: string;
  suggestion?: ResourceSuggestion;
}

// Job 생성 요청
export interface CreateJobRequest {
  provider_id?: string;
  gpu_type?: string;
  job_name?: string;
  gpu_count?: number;
  cpu_cores?: string;
  memory_gb?: string;
  storage_gb?: string;
  ssh_password: string;
  duration_hours?: number;
  image?: string;
}

// Job 목록 응답
export interface JobListResponse {
  jobs: Job[];
  count: number;
}

// Provider 타입
export interface GPUInfo {
  index: number;
  name: string;
  memory_mb: number;
  driver_ver?: string;
}

export interface Provider {
  ProviderID: string;
  WalletAddr?: string;
  NodeName?: string;
  Status: 'pending' | 'approved' | 'joined' | 'available' | 'busy' | 'offline';
  
  Spec: {
    hostname: string;
    os: string;
    cpu_model: string;
    cpu_cores: number;
    total_memory_mb: number;
    gpus: GPUInfo[];
    total_gpus: number;
    total_disk_gb: number;
    available_disk_gb: number;
    public_ip: string;
    private_ip: string;
  };
  
  Capacity: {
    gpu_count: number;
    cpu_cores: number;
    memory_mb: number;
    gpu_price_per_hour: number;
    cpu_price_per_hour: number;
  };
  
  LastHeartbeat: string;
  RegisteredAt: string;
}

export interface ProviderListResponse {
  providers: Provider[];
  count: number;
}

// GPU 가용성 정보
export interface GPUAvailability {
  provider_id: string;
  gpu_type: string;
  total_gpus: number;
  available_gpus: number;
  source: 'cluster' | 'cache';
  cluster_online: boolean;
  can_create_job: boolean;
  price_per_hour: number;
}

export interface GPUAvailabilityResponse {
  providers: GPUAvailability[];
  total_gpus: number;
  total_available: number;
  count: number;
}

export interface ProviderSearchFilter {
  status?: string;
  gpu?: string;
  min_ram?: number;
  min_cpu?: number;
  min_disk?: number;
  max_price?: number;
  limit?: number;
}

// API Client
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // 브라우저 환경에서 토큰 로드
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    // 204 No Content 처리
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ==================== Health Check ====================
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health');
  }

  // ==================== Auth APIs ====================
  async loginWithGoogle(idToken: string): Promise<LoginResponse> {
    return this.request('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
  }

  async refreshToken(): Promise<LoginResponse> {
    return this.request('/api/v1/auth/refresh', {
      method: 'POST',
    });
  }

  async logout(): Promise<void> {
    return this.request('/api/v1/auth/logout', {
      method: 'POST',
    });
  }

  async getMe(): Promise<User> {
    return this.request('/api/v1/users/me');
  }

  // ==================== Job APIs ====================
  async createJob(data: CreateJobRequest): Promise<Job> {
    return this.request('/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getJob(jobId: string): Promise<Job> {
    return this.request(`/api/v1/jobs/${jobId}`);
  }

  async listJobs(): Promise<JobListResponse> {
    return this.request('/api/v1/jobs');
  }

  async deleteJob(jobId: string): Promise<void> {
    return this.request(`/api/v1/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  // ==================== Provider APIs ====================
  async listProviders(): Promise<ProviderListResponse> {
    return this.request('/api/v1/providers');
  }

  async getProvider(providerId: string): Promise<Provider> {
    return this.request(`/api/v1/providers/${providerId}`);
  }

  async searchProviders(filter: ProviderSearchFilter): Promise<ProviderListResponse> {
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.gpu) params.append('gpu', filter.gpu);
    if (filter.min_ram) params.append('min_ram', filter.min_ram.toString());
    if (filter.min_cpu) params.append('min_cpu', filter.min_cpu.toString());
    if (filter.min_disk) params.append('min_disk', filter.min_disk.toString());
    if (filter.max_price) params.append('max_price', filter.max_price.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());
    
    return this.request(`/api/v1/providers/search?${params.toString()}`);
  }

  // 실시간 GPU 가용성 조회
  async getGPUAvailability(gpuType?: string): Promise<GPUAvailabilityResponse> {
    const params = gpuType ? `?gpu_type=${encodeURIComponent(gpuType)}` : '';
    return this.request(`/api/v1/providers/gpu-availability${params}`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

export default apiClient;
