
import React from 'react';
import { LayoutDashboard, Rocket, Terminal, Settings, Box, Database, FolderTree } from 'lucide-react';
import { ResourceType, JobStatus, GPUResource, Workload, Model, Dataset } from './types';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'sandboxes', label: 'Sandboxes', icon: <Terminal size={20} /> },
  { id: 'jobs', label: 'Batch Jobs', icon: <Rocket size={20} /> },
  { id: 'models', label: 'Models', icon: <Box size={20} /> },
  { id: 'datasets', label: 'Datasets', icon: <Database size={20} /> },
  { id: 'files', label: 'Files & Artifacts', icon: <FolderTree size={20} /> },
  { id: 'admin', label: 'Admin Panel', icon: <Settings size={20} /> },
];

export const MOCK_GPUS: GPUResource[] = [
  { id: 'gpu-001', name: 'GPU 0', type: ResourceType.H100, totalMemoryGB: 80, usedMemoryGB: 45, utilizationPercent: 62, temperatureCelsius: 58, nodeName: 'k8s-worker-01', status: 'HEALTHY' },
  { id: 'gpu-002', name: 'GPU 1', type: ResourceType.H100, totalMemoryGB: 80, usedMemoryGB: 78, utilizationPercent: 98, temperatureCelsius: 74, nodeName: 'k8s-worker-01', status: 'WARNING' },
  { id: 'gpu-003', name: 'GPU 0', type: ResourceType.A100, totalMemoryGB: 40, usedMemoryGB: 0, utilizationPercent: 0, temperatureCelsius: 32, nodeName: 'k8s-worker-02', status: 'HEALTHY' },
  { id: 'gpu-004', name: 'GPU 1', type: ResourceType.A100, totalMemoryGB: 40, usedMemoryGB: 12, utilizationPercent: 25, temperatureCelsius: 45, nodeName: 'k8s-worker-02', status: 'HEALTHY' },
];

export const MOCK_WORKLOADS: Workload[] = [
  { id: 'wl-101', name: 'jupyter-lab-research-01', type: 'INTERACTIVE', owner: 'dr_chen', gpuRequested: 0.25, status: JobStatus.RUNNING, createdAt: '2023-10-25T10:00:00Z', updatedAt: '2023-10-25T10:00:00Z', logs: ['Starting JupyterLab...', 'Mounted PVC /data/models', 'Kernel initialized'] },
  { id: 'wl-102', name: 'bert-large-finetuning', type: 'BATCH', owner: 'ai_eng_sarah', gpuRequested: 1, status: JobStatus.RUNNING, createdAt: '2023-10-25T08:30:00Z', updatedAt: '2023-10-25T11:45:00Z', logs: ['Epoch 1: loss=0.45', 'Epoch 2: loss=0.32', 'Checkpoint saved'] },
  { id: 'wl-103', name: 'pytorch-debug-session', type: 'INTERACTIVE', owner: 'ai_eng_sarah', gpuRequested: 0.5, status: JobStatus.PENDING, createdAt: '2023-10-25T12:00:00Z', updatedAt: '2023-10-25T12:00:00Z' },
  { id: 'wl-104', name: 'data-proc-spark-gpu', type: 'BATCH', owner: 'data_ops', gpuRequested: 2, status: JobStatus.COMPLETED, createdAt: '2023-10-24T22:00:00Z', updatedAt: '2023-10-25T02:00:00Z' },
];

export const MOCK_MODELS: Model[] = [
  { id: 'm-001', name: 'Llama-3-8B-Instruct', version: 'v1.2', framework: 'PyTorch / Transformers', parameters: '8B', size: '14.9 GB', status: 'DEPLOYED', updatedAt: '2023-10-26 14:20' },
  { id: 'm-002', name: 'Stable-Diffusion-XL-Base', version: 'v1.0', framework: 'Diffusers', parameters: '6.6B', size: '12.5 GB', status: 'READY', updatedAt: '2023-10-24 09:15' },
  { id: 'm-003', name: 'Mistral-7B-v0.1', version: 'v1.0', framework: 'Transformers', parameters: '7B', size: '13.2 GB', status: 'ARCHIVED', updatedAt: '2023-10-20 18:45' },
  { id: 'm-004', name: 'ResNet-50-Classifier', version: 'v2.4', framework: 'TensorFlow', parameters: '25.6M', size: '98 MB', status: 'READY', updatedAt: '2023-10-25 11:30' },
];

export const MOCK_DATASETS: Dataset[] = [
  { id: 'd-001', name: 'WikiText-103-Pretrain', source: 'S3://llm-data-bucket', format: 'Parquet', size: '540 MB', items: '103M Tokens', category: 'TRAIN', status: 'SYNCED' },
  { id: 'd-002', name: 'ImageNet-1K-Val', source: 'PVC://k8s-storage-01', format: 'WebP', size: '6.4 GB', items: '50k images', category: 'VAL', status: 'SYNCED' },
  { id: 'd-003', name: 'Instruction-Tuning-Internal', source: 'NFS://nas-04', format: 'JSONL', size: '1.2 GB', items: '250k samples', category: 'TRAIN', status: 'PENDING' },
];

export const STATUS_COLORS = {
  [JobStatus.RUNNING]: 'text-green-400 bg-green-400/10 border-green-400/20',
  [JobStatus.PENDING]: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  [JobStatus.COMPLETED]: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  [JobStatus.FAILED]: 'text-red-400 bg-red-400/10 border-red-400/20',
  [JobStatus.TERMINATED]: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};
