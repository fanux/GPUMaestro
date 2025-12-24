
import React, { useState, useEffect } from 'react';
import { MOCK_WORKLOADS, STATUS_COLORS } from '../constants';
import { JobStatus, Workload } from '../types';
// Added Activity to the imports from lucide-react
import { Plus, Terminal, Clock, ExternalLink, MoreVertical, Search, Zap, Trash2, StopCircle, RefreshCcw, Activity } from 'lucide-react';
import { getJobStatusInsights } from '../services/geminiService';

const Workspaces: React.FC = () => {
  const [sessions, setSessions] = useState<Workload[]>(MOCK_WORKLOADS.filter(w => w.type === 'INTERACTIVE'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Workload | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Interactive Workspaces</h1>
          <p className="text-slate-400">On-demand development environments with GPU acceleration.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5"
        >
          <Plus size={20} />
          Launch Workspace
        </button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 w-full max-w-md">
            <Search size={18} className="text-slate-500" />
            <input type="text" placeholder="Filter workspaces..." className="bg-transparent border-none outline-none text-sm w-full" />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"><RefreshCcw size={18} /></button>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-[10px] uppercase tracking-widest font-bold text-slate-500 border-b border-slate-800">
              <th className="px-6 py-4">Workspace Name</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">GPU Resources</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Uptime</th>
              <th className="px-6 py-4 text-right">Actions</th>
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
                      <p className="text-xs text-slate-500 font-mono">ID: {session.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-300">{session.owner}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-400" />
                    <span className="text-sm font-medium text-slate-300">{session.gpuRequested}x GPU Fragment</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[session.status]}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-2"></span>
                    {session.status}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock size={14} />
                    <span>2h 45m</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end items-center gap-2">
                    <button className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all">
                      <ExternalLink size={18} />
                    </button>
                    <button className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all">
                      <StopCircle size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
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
                     <span className="text-xs text-slate-500">Node: k8s-worker-01</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <Plus size={24} className="rotate-45 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Live Logs</h3>
                  <div className="bg-black/40 rounded-2xl border border-slate-800 p-6 font-mono text-xs text-slate-300 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {selectedSession.logs?.map((log, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                        <span className="text-emerald-400/90 tracking-tight">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Activity size={18} className="text-indigo-400" />
                    <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-widest">AI Performance Insights</h3>
                  </div>
                  {isLoadingInsight ? (
                    <div className="flex items-center gap-4 text-slate-400 animate-pulse">
                      <RefreshCcw size={16} className="animate-spin" />
                      <p className="text-sm italic">Gemini is analyzing session health...</p>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-indigo-100/80">
                      {insight || "No insights available for this session."}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Configuration</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-500 mb-1">Image</p>
                      <p className="text-sm font-semibold text-slate-200">jupyter/datascience-notebook:v3</p>
                    </div>
                    <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-500 mb-1">Resource Profile</p>
                      <p className="text-sm font-semibold text-slate-200">0.5 GPU / 8GB VRAM</p>
                    </div>
                    <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-500 mb-1">Inactivity Timeout</p>
                      <p className="text-sm font-semibold text-slate-200">2 Hours</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                   <button className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3">
                     <ExternalLink size={20} />
                     Open JupyterLab
                   </button>
                   <button className="w-full py-4 bg-slate-800 text-red-400 border border-red-400/20 font-bold rounded-2xl hover:bg-red-400/10 transition-colors">
                     Terminate Session
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspaces;
