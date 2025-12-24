
import React, { useState } from 'react';
import { MOCK_WORKLOADS, STATUS_COLORS } from '../constants';
import { JobStatus, Workload } from '../types';
import { Rocket, Clock, Search, ChevronRight, Filter, Download, Box, Layers, Cpu, BrainCircuit } from 'lucide-react';

const BatchJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Workload[]>(MOCK_WORKLOADS.filter(w => w.type === 'BATCH'));

  // Extended mock data to show framework diversity
  const trainingScenarios = [
    { id: 'scen-1', name: 'Llama-3-70B Finetuning', framework: 'PyTorch / DeepSpeed', precision: 'bf16', scale: 'Multi-Node' },
    { id: 'scen-2', name: 'ResNet-50 CV Train', framework: 'TensorFlow', precision: 'fp32', scale: 'Single-GPU' },
    { id: 'scen-3', name: 'BERT Distillation', framework: 'HuggingFace Transformers', precision: 'fp16', scale: 'Multi-GPU' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Model Training & Batch Processing</h1>
          <p className="text-slate-400">Optimized pipelines for LLMs (Transformers) and traditional Deep Learning.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all">
            <Rocket size={18} />
            New Training Job
          </button>
        </div>
      </div>

      {/* Quick Launch Templates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trainingScenarios.map((scen) => (
          <div key={scen.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl hover:border-indigo-500/50 transition-all cursor-pointer group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <BrainCircuit size={18} />
              </div>
              <h4 className="font-bold text-slate-200 text-sm">{scen.name}</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{scen.framework}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{scen.scale}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/20 border border-slate-800 rounded-3xl p-1">
        <div className="grid grid-cols-1 gap-1">
          {jobs.map((job) => (
            <div key={job.id} className="bg-slate-900/40 border-b border-slate-800/50 last:border-0 p-6 hover:bg-slate-800/20 transition-all group">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400 border border-slate-700 group-hover:border-indigo-500/30 transition-colors">
                    <Layers size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{job.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[job.status]}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Box size={14} className="text-slate-600" />
                        <span>Framework: <span className="text-slate-300 font-medium">Transformers (Flash-Attn v2)</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Cpu size={14} className="text-slate-600" />
                        <span>GPUs: <span className="text-slate-300 font-medium">{job.gpuRequested}x H100</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Total Throughput</p>
                    <div className="text-sm font-mono text-emerald-400">
                      1,240 tokens/sec
                    </div>
                  </div>
                  
                  <div className="h-10 w-px bg-slate-800 hidden lg:block"></div>

                  <div className="flex items-center gap-2">
                    <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all" title="View Training Curves">
                      <Search size={20} />
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all" title="Export Checkpoint">
                      <Download size={20} />
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {job.status === JobStatus.RUNNING && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-tighter">Epoch 4 / 10 | Step 4,200</span>
                      <span className="font-mono text-indigo-400">Loss: 0.231</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-500 h-full rounded-full transition-all duration-1000" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                      <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">VRAM Efficiency</p>
                      <p className="text-sm text-slate-300 font-mono">92% (Activation Checkpointing ON)</p>
                    </div>
                    <div className="flex-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                      <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Compute Utilization</p>
                      <p className="text-sm text-slate-300 font-mono">312 TFLOPS (FP16)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BatchJobs;
