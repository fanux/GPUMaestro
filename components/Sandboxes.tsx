
import React, { useState, useEffect } from 'react';
import { MOCK_WORKLOADS, STATUS_COLORS, MOCK_MODELS, MOCK_DATASETS } from '../constants';
import { JobStatus, Workload, ResourceType } from '../types';
import { Plus, Terminal, Clock, ExternalLink, Search, Zap, StopCircle, RefreshCcw, Activity, Code2, Globe, Cpu, Database, Box, X, ChevronRight, Copy, Monitor, ShieldCheck } from 'lucide-react';
import { getJobStatusInsights } from '../services/geminiService';

const Sandboxes: React.FC = () => {
  const [sessions, setSessions] = useState<Workload[]>(MOCK_WORKLOADS.filter(w => w.type === 'INTERACTIVE'));
  const [selectedSession, setSelectedSession] = useState<Workload | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [copied, setCopied] = useState(false);

  // Create Form State
  const [formData, setFormData] = useState({
    name: '',
    interface: 'Web Terminal + VS Code',
    modelId: '',
    datasetId: '',
    gpuType: ResourceType.H100,
    gpuCount: 1
  });

  const fetchInsights = async (session: Workload) => {
    if (!session.logs) return;
    setIsLoadingInsight(true);
    const result = await getJobStatusInsights(session.logs, session.name);
    setInsight(result);
    setIsLoadingInsight(false);
  };

  useEffect(() => {
    if (selectedSession) {
      fetchInsights(selectedSession);
    } else {
      setInsight(null);
    }
  }, [selectedSession]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: Workload = {
      id: `wl-${Math.floor(Math.random() * 1000)}`,
      name: formData.name || 'new-dev-env',
      type: 'INTERACTIVE',
      owner: 'Admin User',
      gpuRequested: formData.gpuCount,
      status: JobStatus.RUNNING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: [
        'Provisioning GPU resources...', 
        'Starting SSH Tunnel service...', 
        'Initializing Web Terminal (ttyd)...',
        'Model weights mounted at /mnt/models',
        'Ready for remote development.'
      ]
    };
    setSessions([newSession, ...sessions]);
    setIsCreateModalOpen(false);
  };

  const copySSH = (id: string) => {
    navigator.clipboard.writeText(`ssh -p 2222 user@cluster-node-${id}.gpu-maestro.io`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Interactive Sandboxes</h1>
          <p className="text-slate-400 mt-1">High-performance development environments with VS Code & Web Terminal access.</p>
        </div>
        <div className="flex gap-3">
           <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-semibold text-slate-300 hover:text-white transition-all">
            <Globe size={18} />
            Hub
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5"
          >
            <Plus size={20} />
            Create Sandbox
          </button>
        </div>
      </div>

      {/* Connectivity Banner */}
      <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Monitor size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Remote Development Enabled</h4>
            <p className="text-xs text-indigo-300/80 text-pretty">Connect via VS Code Remote-SSH or directly in your browser with our integrated Web Terminal.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-[10px] text-emerald-400 font-bold">
            <ShieldCheck size={12} />
            SSH SECURE
          </div>
        </div>
      </div>

      {/* List Area */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 w-full max-w-md">
            <Search size={18} className="text-slate-500" />
            <input type="text" placeholder="Filter sandboxes..." className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-600" />
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><RefreshCcw size={18} /></button>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-[10px] uppercase tracking-widest font-bold text-slate-500 border-b border-slate-800">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Interfaces</th>
              <th className="px-6 py-4">Compute</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Dev Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sessions.map((session) => (
              <tr 
                key={session.id} 
                className="group hover:bg-slate-800/30 transition-colors cursor-pointer"
                onClick={() => setSelectedSession(session)}
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 border border-slate-700">
                      <Terminal size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-100 group-hover:text-white transition-colors">{session.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">ID: {session.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex gap-2">
                    <span className="p-1.5 bg-slate-800 rounded-lg text-indigo-400" title="VS Code Support"><Code2 size={14} /></span>
                    <span className="p-1.5 bg-slate-800 rounded-lg text-emerald-400" title="Web Terminal Support"><Terminal size={14} /></span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-400" />
                    <span className="text-sm font-medium text-slate-300">{session.gpuRequested}x GPU</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border ${STATUS_COLORS[session.status]}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-2"></span>
                    {session.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end items-center gap-2">
                    <button 
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                      onClick={(e) => { e.stopPropagation(); /* open terminal logic */ }}
                    >
                      <Terminal size={14} />
                      Terminal
                    </button>
                    <button 
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <StopCircle size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Initialize New Sandbox</h2>
                  <p className="text-xs text-slate-500">Configure dev interfaces and hardware resources.</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Sandbox Name</span>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. transformer-dev-env"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </label>
              </div>

              {/* Dev Interface Selection */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Development Interface</span>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'vscode', label: 'VS Code + Terminal', desc: 'Remote-SSH enabled', icon: <Code2 size={18} /> },
                    { id: 'jupyter', label: 'Jupyter + Terminal', desc: 'Notebook-centric', icon: <Box size={18} /> }
                  ].map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFormData({...formData, interface: option.label})}
                      className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${formData.interface.includes(option.label.split(' ')[0]) ? 'bg-indigo-600/10 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                    >
                      <div className={`p-2 rounded-lg ${formData.interface.includes(option.label.split(' ')[0]) ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                        {option.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{option.label}</p>
                        <p className="text-[10px] opacity-60">{option.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Box size={14} className="text-indigo-400" />
                    Mount Model
                  </span>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none pr-10"
                      value={formData.modelId}
                      onChange={(e) => setFormData({...formData, modelId: e.target.value})}
                    >
                      <option value="">Empty (Custom Upload)</option>
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

              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Cpu size={16} className="text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Compute Specs</h3>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Architecture</span>
                    <div className="flex gap-2">
                      {[ResourceType.H100, ResourceType.A100].map(t => (
                        <button key={t} type="button" onClick={() => setFormData({...formData, gpuType: t})} className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${formData.gpuType === t ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}>{t.split(' ')[1]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GPU Count: {formData.gpuCount}</span>
                    <input type="range" min="0.1" max="8" step="0.1" value={formData.gpuCount} onChange={e => setFormData({...formData, gpuCount: parseFloat(e.target.value)})} className="w-full accent-indigo-500" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20">Launch Development Sandbox</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedSession && !isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-600/30">
                  <Terminal size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedSession.name}</h2>
                  <div className="flex items-center gap-4 mt-1">
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[selectedSession.status]}`}>{selectedSession.status}</span>
                     <span className="text-xs text-slate-500">Instance: {selectedSession.id}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8 custom-scrollbar">
              <div className="md:col-span-2 space-y-8">
                {/* Connection Options */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Modify Code & Connect</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-500 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-indigo-600/10 rounded-xl text-indigo-400">
                          <Code2 size={24} />
                        </div>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase bg-indigo-400/5 px-2 py-1 rounded">Recommended</span>
                      </div>
                      <h4 className="font-bold text-white mb-1">VS Code Remote</h4>
                      <p className="text-xs text-slate-500 mb-4">Connect via VS Code's Remote-SSH extension for a native IDE experience.</p>
                      
                      <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 mb-3">
                        <code className="text-[10px] text-slate-400 font-mono truncate">ssh -p 2222 user@cluster-node-{selectedSession.id}</code>
                        <button 
                          onClick={() => copySSH(selectedSession.id)}
                          className="p-1.5 hover:bg-slate-800 rounded-md text-slate-500 hover:text-white transition-colors"
                        >
                          <Copy size={14} className={copied ? "text-emerald-400" : ""} />
                        </button>
                      </div>
                      <button className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-colors">
                        Open in VS Code
                      </button>
                    </div>

                    <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:border-emerald-500 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-600/10 rounded-xl text-emerald-400">
                          <Terminal size={24} />
                        </div>
                      </div>
                      <h4 className="font-bold text-white mb-1">Web Terminal</h4>
                      <p className="text-xs text-slate-500 mb-4">Instant browser-based terminal access for quick edits and execution.</p>
                      <button className="w-full mt-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2">
                        <ExternalLink size={14} />
                        Launch Terminal
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sandbox Activity</h3>
                  <div className="bg-black/60 rounded-2xl border border-slate-800 p-6 font-mono text-[11px] text-slate-400 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {selectedSession.logs?.map((log, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="opacity-30">09:4{i}:12</span>
                        <span className="text-indigo-300/80">{log}</span>
                      </div>
                    ))}
                    <div className="text-emerald-400 animate-pulse">_</div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                 <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Environment Stats</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">VRAM Usage</span>
                      <span className="text-slate-200 font-bold font-mono">12.4 / 80 GB</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-[15%]"></div>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-2">
                      <span className="text-slate-500">GPU Power</span>
                      <span className="text-slate-200 font-bold font-mono">185W</span>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={16} className="text-indigo-400" />
                    <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">AI Debugging</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    {insight || "Gemini is monitoring environment for potential CUDA OOM issues..."}
                  </p>
                </div>

                <button className="w-full py-4 bg-slate-800 text-red-400 border border-red-400/20 font-bold rounded-2xl hover:bg-red-400 hover:text-white transition-all">
                   Stop & Reclaim GPU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sandboxes;
