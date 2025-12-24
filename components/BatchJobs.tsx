
import React, { useState } from 'react';
import { MOCK_WORKLOADS, STATUS_COLORS, MOCK_MODELS, MOCK_DATASETS } from '../constants';
import { JobStatus, Workload, ResourceType } from '../types';
import { Rocket, Clock, Search, ChevronRight, Filter, Download, Box, Layers, Cpu, BrainCircuit, Plus, X, GitBranch, Monitor, Database, Settings2, Terminal, Timer } from 'lucide-react';

const BatchJobs: React.FC = () => {
  const [jobs, setJobs] = useState<Workload[]>(MOCK_WORKLOADS.filter(w => w.type === 'BATCH').map(j => ({ ...j, timeoutMinutes: 240 })));
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sourceType: 'git' as 'git' | 'image',
    gitRepo: '',
    gitBranch: 'main',
    entrypoint: 'train.py',
    imageUri: '',
    imageCommand: '',
    modelId: '',
    datasetId: '',
    gpuType: ResourceType.H100,
    gpuCount: 1,
    priority: 'Normal',
    timeoutMinutes: 240 // Default 4 hours
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: Workload = {
      id: `wl-batch-${Math.floor(Math.random() * 1000)}`,
      name: formData.name || 'new-training-job',
      type: 'BATCH',
      owner: 'Admin User',
      gpuRequested: formData.gpuCount,
      status: JobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeoutMinutes: formData.timeoutMinutes,
      logs: ['Job queued...', 'Validating manifest...', 'Pulling workspace source...']
    };
    setJobs([newJob, ...jobs]);
    setIsCreateModalOpen(false);
  };

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Model Training & Batch Processing</h1>
          <p className="text-slate-400 mt-1">Scale your Transformer workloads across H100/A100 clusters.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5"
          >
            <Plus size={18} />
            New Training Job
          </button>
        </div>
      </div>

      {/* Quick Launch Templates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trainingScenarios.map((scen) => (
          <div key={scen.id} className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl hover:border-indigo-500/50 transition-all cursor-pointer group relative overflow-hidden">
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <BrainCircuit size={18} />
              </div>
              <h4 className="font-bold text-slate-100 text-sm">{scen.name}</h4>
            </div>
            <div className="flex flex-wrap gap-2 relative z-10">
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{scen.framework}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{scen.scale}</span>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Rocket size={80} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/20 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="grid grid-cols-1 divide-y divide-slate-800">
          {jobs.map((job) => (
            <div key={job.id} className="bg-slate-900/40 p-6 hover:bg-slate-800/20 transition-all group">
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
                        <span>Owner: <span className="text-slate-300 font-medium">{job.owner}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Cpu size={14} className="text-slate-600" />
                        <span>Resource: <span className="text-slate-300 font-medium">{job.gpuRequested}x GPU</span></span>
                      </div>
                      {job.timeoutMinutes && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Timer size={14} className="text-slate-600" />
                          <span>Timeout: <span className="text-slate-300 font-medium">{job.timeoutMinutes}m</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Created At</p>
                    <div className="text-xs font-mono text-slate-400">
                      {new Date(job.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="h-10 w-px bg-slate-800 hidden lg:block"></div>

                  <div className="flex items-center gap-2">
                    <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all" title="View Logs">
                      <Terminal size={20} />
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all" title="Download Stats">
                      <Download size={20} />
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {job.status === JobStatus.RUNNING && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-end animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-tighter">Training Progress</span>
                      <span className="font-mono text-indigo-400">Step 4,200 / 10,000</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-600 to-purple-500 h-full rounded-full transition-all duration-1000" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                      <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Metric: Val Loss</p>
                      <p className="text-sm text-slate-300 font-mono">0.231</p>
                    </div>
                    <div className="flex-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                      <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Throughput</p>
                      <p className="text-sm text-slate-300 font-mono">1.2k tokens/s</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Rocket size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Submit Training Job</h2>
                  <p className="text-xs text-slate-500">Deploy high-performance batch workloads to the cluster.</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Basic Meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Job Display Name</span>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. resnet-finetune-v1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Job Priority</span>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none pr-10"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    >
                      <option>Low (Spot/Preemptible)</option>
                      <option>Normal</option>
                      <option>High (Guaranteed)</option>
                    </select>
                    <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-600 pointer-events-none" />
                  </div>
                </label>
              </div>

              {/* Source Selection */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Code & Execution Source</span>
                <div className="flex gap-4 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, sourceType: 'git'})}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${formData.sourceType === 'git' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <GitBranch size={18} />
                    Git Repository
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, sourceType: 'image'})}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${formData.sourceType === 'image' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Monitor size={18} />
                    Container Image
                  </button>
                </div>

                {formData.sourceType === 'git' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                    <div className="md:col-span-2">
                      <label className="block">
                        <span className="text-xs text-slate-500 mb-1 block">Repo URL (HTTPS/SSH)</span>
                        <input 
                          type="text" 
                          placeholder="https://github.com/organization/project.git"
                          className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 outline-none text-sm"
                          value={formData.gitRepo}
                          onChange={(e) => setFormData({...formData, gitRepo: e.target.value})}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs text-slate-500 mb-1 block">Branch / Tag / Hash</span>
                      <input 
                        type="text" 
                        placeholder="main"
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 outline-none text-sm"
                        value={formData.gitBranch}
                        onChange={(e) => setFormData({...formData, gitBranch: e.target.value})}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-500 mb-1 block">Entrypoint Script</span>
                      <input 
                        type="text" 
                        placeholder="python train.py --config config.yaml"
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 outline-none text-sm font-mono"
                        value={formData.entrypoint}
                        onChange={(e) => setFormData({...formData, entrypoint: e.target.value})}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                    <div className="md:col-span-2">
                      <label className="block">
                        <span className="text-xs text-slate-500 mb-1 block">Full Image URI</span>
                        <input 
                          type="text" 
                          placeholder="registry.hub.docker.com/pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime"
                          className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 outline-none text-sm"
                          value={formData.imageUri}
                          onChange={(e) => setFormData({...formData, imageUri: e.target.value})}
                        />
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block">
                        <span className="text-xs text-slate-500 mb-1 block">Override Command / Args</span>
                        <input 
                          type="text" 
                          placeholder="sh launch.sh --epochs 100"
                          className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 outline-none text-sm font-mono"
                          value={formData.imageCommand}
                          onChange={(e) => setFormData({...formData, imageCommand: e.target.value})}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Data & Model Mounts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Box size={14} className="text-indigo-400" />
                    Mount Pretrained Model
                  </span>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none pr-10"
                      value={formData.modelId}
                      onChange={(e) => setFormData({...formData, modelId: e.target.value})}
                    >
                      <option value="">None (Custom Path)</option>
                      {MOCK_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-600" />
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Database size={14} className="text-emerald-400" />
                    Mount Dataset
                  </span>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none pr-10"
                      value={formData.datasetId}
                      onChange={(e) => setFormData({...formData, datasetId: e.target.value})}
                    >
                      <option value="">None</option>
                      {MOCK_DATASETS.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-600" />
                  </div>
                </label>
              </div>

              {/* Hardware Config */}
              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Settings2 size={16} className="text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Execution Policies & Resource Config</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GPU Type</span>
                    <div className="flex gap-2">
                      {[ResourceType.H100, ResourceType.A100, ResourceType.L40S].map(t => (
                        <button 
                          key={t} 
                          type="button" 
                          onClick={() => setFormData({...formData, gpuType: t})} 
                          className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${formData.gpuType === t ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                        >
                          {t.split(' ')[1]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Node Count & Slices</span>
                      <span className="text-xs font-mono text-indigo-400">{formData.gpuCount} Unit(s)</span>
                    </div>
                    <input 
                      type="range" min="1" max="32" step="1" 
                      value={formData.gpuCount} 
                      onChange={e => setFormData({...formData, gpuCount: parseInt(e.target.value)})} 
                      className="w-full accent-indigo-500" 
                    />
                    <p className="text-[9px] text-slate-600">Selecting {formData.gpuCount > 1 ? 'Distributed' : 'Single'} Training mode.</p>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2">
                      <Timer size={16} className="text-slate-500" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Execution Timeout</span>
                    </label>
                    <span className="text-xs font-mono text-indigo-400">{formData.timeoutMinutes} minutes ({Math.round(formData.timeoutMinutes / 60 * 10) / 10}h)</span>
                  </div>
                  <input 
                    type="range" min="30" max="1440" step="30" 
                    value={formData.timeoutMinutes} 
                    onChange={e => setFormData({...formData, timeoutMinutes: parseInt(e.target.value)})} 
                    className="w-full accent-indigo-500" 
                  />
                  <p className="text-[9px] text-slate-600 italic">Job will be automatically terminated if it exceeds this duration. Default is 240m (4h).</p>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="submit" 
                  className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                >
                  Confirm & Queue Job
                </button>
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-8 py-4 bg-slate-800 text-slate-400 font-bold rounded-2xl hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchJobs;
