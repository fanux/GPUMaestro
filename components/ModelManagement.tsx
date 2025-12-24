
import React, { useState } from 'react';
import { MOCK_MODELS } from '../constants';
import { Box, Plus, Search, ExternalLink, Download, History, Tag, Cpu, HardDrive } from 'lucide-react';

const ModelManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredModels = MOCK_MODELS.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.framework.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'DEPLOYED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'READY': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'ARCHIVED': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Model Registry</h1>
          <p className="text-slate-400">Manage trained weights, architectures, and deployment versions.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all">
            <Plus size={18} />
            Register Model
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
        <div className="flex-1 flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <Search size={18} className="text-slate-500" />
          <input 
            type="text" 
            placeholder="Search models by name, framework..." 
            className="bg-transparent border-none outline-none text-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors">Framework</button>
          <button className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors">Status</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredModels.map((model) => (
          <div key={model.id} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 hover:border-indigo-500/30 transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Box size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">{model.name}</h3>
                  <p className="text-xs text-slate-500">{model.framework}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${getStatusStyle(model.status)}`}>
                {model.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Tag size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Params</span>
                </div>
                <p className="text-sm font-mono text-slate-200">{model.parameters}</p>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <HardDrive size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Storage</span>
                </div>
                <p className="text-sm font-mono text-slate-200">{model.size}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex items-center gap-4">
                <div className="text-xs text-slate-500">
                  <span className="block opacity-50 uppercase tracking-tighter text-[9px] font-bold">Version</span>
                  <span className="text-slate-300 font-mono">{model.version}</span>
                </div>
                <div className="text-xs text-slate-500">
                  <span className="block opacity-50 uppercase tracking-tighter text-[9px] font-bold">Updated</span>
                  <span className="text-slate-300 font-mono">{model.updatedAt}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-all" title="View Version History">
                  <History size={18} />
                </button>
                <button className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-600/10 transition-all" title="Deploy Model">
                  <ExternalLink size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelManagement;
