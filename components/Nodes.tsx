
import React from 'react';
import { MOCK_GPUS } from '../constants';
import { Server, Cpu, Thermometer, Database, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

const Nodes: React.FC = () => {
  const nodes = Array.from(new Set(MOCK_GPUS.map(g => g.nodeName)));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white">Cluster Nodes</h1>
        <p className="text-slate-400">Monitor physical infrastructure and GPU health across your Kubernetes cluster.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {nodes.map((nodeName) => {
          const nodeGpus = MOCK_GPUS.filter(g => g.nodeName === nodeName);
          const isHealthy = nodeGpus.every(g => g.status === 'HEALTHY');

          return (
            <div key={nodeName} className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 bg-slate-800/30 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${isHealthy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <Server size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{nodeName}</h2>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500">OS: Ubuntu 22.04 LTS</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                      <span className="text-xs text-slate-500">Kernel: 5.15.0-generic</span>
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
                  <div key={gpu.id} className="p-5 bg-slate-950/50 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all">
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
                        <div className="bg-indigo-500 h-full" style={{ width: `${(gpu.usedMemoryGB/gpu.totalMemoryGB)*100}%` }}></div>
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
    </div>
  );
};

export default Nodes;
