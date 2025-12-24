
export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TERMINATED = 'TERMINATED'
}

export enum ResourceType {
  A100 = 'NVIDIA A100',
  H100 = 'NVIDIA H100',
  L40S = 'NVIDIA L40S',
  V100 = 'NVIDIA V100'
}

export interface GPUResource {
  id: string;
  name: string;
  type: ResourceType;
  totalMemoryGB: number;
  usedMemoryGB: number;
  utilizationPercent: number;
  temperatureCelsius: number;
  nodeName: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export interface Workload {
  id: string;
  name: string;
  type: 'INTERACTIVE' | 'BATCH';
  owner: string;
  gpuRequested: number; // Decimal allowed for virtualization (e.g. 0.5)
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  logs?: string[];
}

export interface Model {
  id: string;
  name: string;
  version: string;
  framework: string;
  parameters: string;
  size: string;
  status: 'READY' | 'DEPLOYED' | 'ARCHIVED';
  updatedAt: string;
}

export interface Dataset {
  id: string;
  name: string;
  source: string;
  format: string;
  size: string;
  items: string;
  category: 'TRAIN' | 'VAL' | 'TEST';
  status: 'SYNCED' | 'PENDING' | 'ERROR';
}

export interface PlatformConfig {
  gpuSplittingEnabled: boolean;
  idleTimeoutMinutes: number;
  preemptionPolicy: 'STRICT' | 'BEST_EFFORT' | 'DISABLED';
  maxGpusPerUser: number;
}
