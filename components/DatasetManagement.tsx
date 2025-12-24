
import React, { useState } from 'react';
import { MOCK_DATASETS } from '../constants';
import { Database, Plus, Search, Eye, RefreshCw, FileText, HardDrive, Info, Share2 } from 'lucide-react';

const DatasetManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDatasets = MOCK_DATASETS.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Datasets & Storage</h1>
          <p className="text-slate-400">Manage data sources for training and evaluation pipelines.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5">
          <Plus size={18} />
          Add Dataset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex-1 max-w-md">
                <Search size={18} className="text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Filter datasets..." 
                  className="bg-transparent border-none outline-none text-sm w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"><RefreshCw size={18} /></button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 text-[10px] uppercase tracking-widest font-bold text-slate-500 border-b border-slate-800">
                    <th className="px-6 py-4">Dataset Name</th>
                    <th className="px-6 py-4">Size / Items</th>
                    <th className="px-6 py-4">Format</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredDatasets.map((ds) => (
                    <tr key={ds.id} className="group hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${ds.category === 'TRAIN' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-purple-500/10 text-purple-400'}`}>
                            <Database size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-200 group-hover:text-white transition-colors text-sm">{ds.name}</p>
                            <p className="text-[10px] text-slate-600 font-mono truncate max-w-[180px]">{ds.source}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-300">{ds.size}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{ds.items}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">
                          {ds.format}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          ds.status === 'SYNCED' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' : 
                          ds.status === 'PENDING' ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' : 
                          'text-red-400 border-red-400/20 bg-red-400/5'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${ds.status === 'SYNCED' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                          {ds.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"><Eye size={18} /></button>
                          <button className="p-2 text-slate-500 hover:text-white transition-colors"><Share2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <HardDrive size={16} className="text-indigo-400" />
              Storage Quota
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">PVC Storage (Hot)</span>
                  <span className="text-slate-200 font-bold">1.2 TB / 5 TB</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full w-[24%]"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Cloud Object Store (Cold)</span>
                  <span className="text-slate-200 font-bold">45 TB / 100 TB</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full w-[45%]"></div>
                </div>
              </div>
            </div>
            <button className="w-full mt-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all">
              Request Expansion
            </button>
          </div>

          <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-3xl p-6 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-indigo-400 mb-4">
                <Info size={18} />
                <h4 className="font-bold text-sm">Data Insights</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your instructional data is being optimized for <span className="text-indigo-300 font-bold underline decoration-indigo-500/30">Llama-3</span> training. 
                Auto-cleaning detected 4,200 redundant entries.
              </p>
            </div>
            <Database className="absolute -right-4 -bottom-4 text-indigo-600/5 group-hover:scale-125 transition-transform" size={120} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasetManagement;
