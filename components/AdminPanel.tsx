
import React, { useState } from 'react';
import { Save, Shield, Info, Gauge, Zap, Server, Sliders, Cpu, Database, Thermometer, CheckCircle2, AlertTriangle, Fingerprint, Network } from 'lucide-react';
import { MOCK_GPUS } from '../constants';

const AdminPanel: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'nodes'>('settings');
  const [gpuSplitting, setGpuSplitting] = useState(true);
  const [idleTimeout, setIdleTimeout] = useState(120);
  const [preemption, setPreemption] = useState('BEST_EFFORT');
  const [rdmaEnabled, setRdmaEnabled] = useState(true);

  const nodes = Array.from(new Set(MOCK_GPUS.map(g => g.nodeName)));

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Admin Control Center</h1>
          <p className="text-slate-400 mt-1">Manage global policies and cluster infrastructure health.</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button 
            onClick={() => setActiveSubTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Sliders size={16} />
            Platform Settings
          </button>
          <button 
            onClick={() => setActiveSubTab('nodes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === 'nodes' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Server size={16} />
            Nodes & Clusters
          </button>
        </div>
      </div>

      {activeSubTab === 'settings' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Main Settings */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-8">
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
                  <Zap className="text-amber-400" size={20} />
                  <h2 className="text-lg font-bold text-white uppercase tracking-wider">Scheduling Strategy</h2>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between group">
                    <div className="max-w-[70%]">
                      <p className="font-bold text-slate-100 mb-1">GPU Virtualization (Splitting)</p>
                      <p className="text-sm text-slate-500 leading-relaxed">Allow fractional GPU allocation for lightweight interactive sandboxes (e.g., 0.1, 0.5 GPU).</p>
                    </div>
                    <button 
                      onClick={() => setGpuSplitting(!gpuSplitting)}
                      className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${gpuSplitting ? 'bg-indigo-600' : 'bg-slate-800'}`}
                    >
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${gpuSplitting ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="font-bold text-slate-100">Idle Sandbox Auto-Termination</p>
                    <p className="text-sm text-slate-500 leading-relaxed">Reclaim GPU resources if a sandbox shows no activity for the specified period.</p>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="15" 
                        max="480" 
                        step="15" 
                        value={idleTimeout}
                        onChange={(e) => setIdleTimeout(parseInt(e.target.value))}
                        className="flex-1 accent-indigo-500"
                      />
                      <span className="w-24 px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-center font-mono text-indigo-400">
                        {idleTimeout} min
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6 pt-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
                  <Network className="text-emerald-400" size={20} />
                  <h2 className="text-lg font-bold text-white uppercase tracking-wider">High Performance Computing</h2>
                </div>
                
                <div className="flex items-center justify-between group">
                  <div className="max-w-[70%]">
                    <p className="font-bold text-slate-100 mb-1">RDMA / RoCE Acceleration</p>
                    <p className="text-sm text-slate-500 leading-relaxed">Enable direct memory access for multi-node Transformer training (DeepSpeed / FSDP).</p>
                  </div>
                  <button 
                    onClick={() => setRdmaEnabled(!rdmaEnabled)}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${rdmaEnabled ? 'bg-indigo-600' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${rdmaEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </section>

              <section className="space-y-6 pt-4">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
                  <Shield className="text-indigo-400" size={20} />
                  <h2 className="text-lg font-bold text-white uppercase tracking-wider">Access & Preemption</h2>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="block font-bold text-slate-100 mb-2">Preemption Policy</span>
                    <select 
                      value={preemption}
                      onChange={(e) => setPreemption(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="STRICT">Strict (Interactive tasks never preempted)</option>
                      <option value="BEST_EFFORT">Best Effort (High priority batch can preempt low utilization interactive)</option>
                      <option value="DISABLED">Disabled (First come, first served)</option>
                    </select>
                  </label>

                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-4">
                    <Info className="text-amber-500 shrink-0" size={20} />
                    <p className="text-xs text-amber-200/70 leading-relaxed italic">
                      Note: Changing preemption rules will not affect currently running jobs. New policies take effect on the next scheduling cycle.
                    </p>
                  </div>
                </div>
              </section>
              <div className="pt-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all">
                  <Save size={20} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Summaries & Quick Stats */}
          <div className="space-y-6">
             <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Fingerprint size={16} />
                Cluster Capabilities
              </h3>
              <div className="space-y-2">
                 <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/5 px-3 py-2 rounded-lg border border-emerald-400/10">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                   NVLink 4.0 Support
                 </div>
                 <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-400/5 px-3 py-2 rounded-lg border border-indigo-400/10">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                   Flash-Attention v2 Ready
                 </div>
                 <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-400/5 px-3 py-2 rounded-lg border border-blue-400/10">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                   Multi-Instance GPU (MIG)
                 </div>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Resource Quotas</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Max GPUs per User</span>
                  <span className="font-bold text-slate-100">8</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Max Sandbox Duration</span>
                  <span className="font-bold text-slate-100">72h</span>
                </div>
              </div>
              <button className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors">
                Manage Users
              </button>
            </div>

            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4 text-indigo-400">
                <Gauge size={20} />
                <h3 className="font-bold">Usage Optimization</h3>
              </div>
              <p className="text-xs text-indigo-100/60 leading-relaxed mb-4">
                Based on current Transformer training trends, enabling FP8 precision across the H100 cluster could save 30% energy while maintaining 99% accuracy.
              </p>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold cursor-pointer hover:underline">
                View Model Performance Benchmarks
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Nodes view remains same, but inherits some UI updates if needed */
        <div className="grid grid-cols-1 gap-8 animate-in fade-in zoom-in-95 duration-300">
          {nodes.map((nodeName) => {
            const nodeGpus = MOCK_GPUS.filter(g => g.nodeName === nodeName);
            const isHealthy = nodeGpus.every(g => g.status === 'HEALTHY');

            return (
              <div key={nodeName} className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="p-6 bg-slate-800/30 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${isHealthy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      <Server size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{nodeName}</h2>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500">RDMA: Active (100Gbps)</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span className="text-xs text-slate-500">NVLink: Enabled</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">CPU Usage</p>
                      <p className="text-sm font-bold text-white">12 / 64 Cores</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Memory</p>
                      <p className="text-sm font-bold text-white">45 / 256 GB</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isHealthy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {isHealthy ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      <span className="text-xs font-bold uppercase tracking-wider">{isHealthy ? 'Healthy' : 'Issue Detected'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {nodeGpus.map((gpu) => (
                    <div key={gpu.id} className="p-5 bg-slate-950/50 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-indigo-400">
                          <Cpu size={20} />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          gpu.status === 'HEALTHY' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' : 
                          gpu.status === 'WARNING' ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' : 
                          'text-red-400 border-red-400/20 bg-red-400/5'
                        }`}>
                          {gpu.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-100">{gpu.name}</h3>
                      <p className="text-xs text-slate-500 mb-4">{gpu.type}</p>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Database size={12} />
                            <span>VRAM</span>
                          </div>
                          <span className="font-mono text-slate-200">{gpu.usedMemoryGB}/{gpu.totalMemoryGB}GB</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full group-hover:bg-indigo-400 transition-colors" style={{ width: `${(gpu.usedMemoryGB/gpu.totalMemoryGB)*100}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Thermometer size={12} />
                            <span>Temp</span>
                          </div>
                          <span className={`font-mono ${gpu.temperatureCelsius > 70 ? 'text-amber-400' : 'text-slate-200'}`}>{gpu.temperatureCelsius}°C</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
