
import React, { useState } from 'react';
import { 
  Folder, 
  File, 
  Search, 
  Download, 
  Trash2, 
  Share2, 
  Box, 
  ChevronRight, 
  MoreVertical, 
  RefreshCw, 
  Clock, 
  HardDrive,
  ExternalLink,
  Plus
} from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  lastModified: string;
  isModel?: boolean;
  jobId?: string;
}

const FileManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [path, setPath] = useState<string[]>(['/outputs']);
  
  const mockFiles: FileItem[] = [
    { id: 'f1', name: 'llama-finetune-v1', type: 'folder', lastModified: '2023-10-26 10:15' },
    { id: 'f2', name: 'resnet50_epoch_100.pt', type: 'file', size: '256 MB', lastModified: '2023-10-26 14:22', isModel: true, jobId: 'wl-batch-882' },
    { id: 'f3', name: 'training_metrics.json', type: 'file', size: '1.2 KB', lastModified: '2023-10-26 14:22', jobId: 'wl-batch-882' },
    { id: 'f4', name: 'stable_diffusion_xl_checkpoint.safetensors', type: 'file', size: '12.5 GB', lastModified: '2023-10-25 22:10', isModel: true },
    { id: 'f5', name: 'logs', type: 'folder', lastModified: '2023-10-24 09:00' },
    { id: 'f6', name: 'bert_distilled.bin', type: 'file', size: '420 MB', lastModified: '2023-10-26 08:30', isModel: true },
  ];

  const filteredFiles = mockFiles.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePublish = (file: FileItem) => {
    alert(`Publishing ${file.name} to Model Registry...`);
    // Logic to open a model registration form pre-filled with this file path
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Artifacts & Shared Storage</h1>
          <p className="text-slate-400 mt-1">Shared file system for job outputs, checkpoints, and model weights.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-semibold text-slate-300 hover:text-white transition-all">
            <RefreshCw size={18} />
            Sync
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5">
            <Plus size={20} />
            Upload File
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Breadcrumbs & Search */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            {path.map((p, i) => (
              <React.Fragment key={p}>
                <button 
                  className={`font-medium ${i === path.length - 1 ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                  onClick={() => setPath(path.slice(0, i + 1))}
                >
                  {p}
                </button>
                {i < path.length - 1 && <ChevronRight size={14} className="text-slate-700" />}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 w-full max-w-md">
            <Search size={18} className="text-slate-500" />
            <input 
              type="text" 
              placeholder="Filter files in this directory..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* File Browser Area */}
        <div className="bg-slate-900/20 border border-slate-800 rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-[10px] uppercase tracking-widest font-bold text-slate-500 border-b border-slate-800">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">Last Modified</th>
                <th className="px-6 py-4">Context</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredFiles.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-800/30 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${item.type === 'folder' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                        {item.type === 'folder' ? <Folder size={18} /> : <File size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{item.name}</p>
                        {item.isModel && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-tighter">
                            <Box size={10} />
                            Model File
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">{item.size || '--'}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} />
                      {item.lastModified}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.jobId ? (
                      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-slate-950/50 border border-slate-800 w-fit">
                        <span className="text-[10px] text-slate-500">Job:</span>
                        <span className="text-[10px] font-mono text-indigo-400 hover:underline cursor-pointer">{item.jobId}</span>
                      </div>
                    ) : <span className="text-[10px] text-slate-700">Manually Uploaded</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.isModel && (
                        <button 
                          onClick={() => handlePublish(item)}
                          className="p-2 text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"
                          title="Publish to Model Registry"
                        >
                          <Box size={18} />
                        </button>
                      )}
                      <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="Download">
                        <Download size={18} />
                      </button>
                      <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="Share link">
                        <Share2 size={18} />
                      </button>
                      <button className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredFiles.length === 0 && (
            <div className="p-12 text-center">
              <Folder size={48} className="mx-auto text-slate-800 mb-4" />
              <p className="text-slate-500">No files found matching "{searchTerm}"</p>
            </div>
          )}
        </div>

        {/* Quota & Stats Overlay */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <HardDrive size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Storage</p>
              <h4 className="text-xl font-bold text-white">4.2 TB / 10 TB</h4>
              <div className="w-48 bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: '42%' }}></div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-indigo-600/5 border border-indigo-500/20 p-6 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-xl text-white">
                <ExternalLink size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Mount this directory as Volume</h4>
                <p className="text-xs text-indigo-300/80">Access these files directly from your Sandboxes or Jobs by mounting the <code>/outputs</code> PVC.</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all">
              Copy Mount Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileManagement;
