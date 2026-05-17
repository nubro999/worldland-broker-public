export interface GPU {
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

export const GPU_DATA: GPU[] = [
  {
    id: 'rtx-5090',
    name: 'RTX 5090',
    price: 0.89,
    securePrice: 0.76,
    vram: 32,
    ram: 92,
    vcpu: 15,
    maxInstances: 7,
    availability: 'Medium',
    featured: true,
  },
  {
    id: 'a40',
    name: 'A40',
    price: 0.4,
    securePrice: 0.2,
    vram: 48,
    ram: 50,
    vcpu: 9,
    maxInstances: 4,
    availability: 'Low',
    featured: true,
  },
  {
    id: 'h200-sxm',
    name: 'H200 SXM',
    price: 3.59,
    securePrice: 3.05,
    vram: 141,
    ram: 221,
    vcpu: 12,
    maxInstances: 8,
    availability: 'High',
    featured: true,
  },
  {
    id: 'b200',
    name: 'B200',
    price: 5.69,
    securePrice: 0,
    vram: 180,
    ram: 180,
    vcpu: 28,
    maxInstances: 8,
    availability: 'Medium',
    featured: true,
  },
  // Additional GPUs (not featured)
  {
    id: 'rtx-4090',
    name: 'RTX 4090',
    price: 0.69,
    securePrice: 0.56,
    vram: 24,
    ram: 64,
    vcpu: 12,
    maxInstances: 10,
    availability: 'High',
    featured: false,
  },
  {
    id: 'a100',
    name: 'A100',
    price: 1.89,
    securePrice: 1.5,
    vram: 80,
    ram: 128,
    vcpu: 16,
    maxInstances: 6,
    availability: 'Medium',
    featured: false,
  },
  {
    id: 'h100',
    name: 'H100',
    price: 2.99,
    securePrice: 2.5,
    vram: 80,
    ram: 256,
    vcpu: 20,
    maxInstances: 4,
    availability: 'Low',
    featured: false,
  },
];
