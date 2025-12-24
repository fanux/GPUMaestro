
import React, { useMemo } from 'react';
import { MOCK_GPUS, MOCK_WORKLOADS, STATUS_COLORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, ShieldCheck, Clock, Zap, Cpu, Terminal, ArrowUpRight } from 'lucide-react';
import { JobStatus } from '../types';

const Dashboard: React.FC = () => {
  const stats = useMemo(() => {
    const totalMemory = MOCK_GPUS.reduce((acc, g) => acc + g.totalMemoryGB, 0);
    const usedMemory = MOCK_GPUS.reduce((acc, g) => acc + g.usedMemoryGB, 0);
    const avgUtilization = MOCK_GPUS.reduce((acc, g) => acc + g.utilizationPercent, 0) / MOCK_GPUS.length;
    return { totalMemory, usedMemory, avgUtilization };
  }, []);

  const chartData = [
    { name: '00:00', util: 40 },
    { name: '04:00', util: 35 },
    { name: '08:00', util: 75 },
    { name: '12:00', util: 88 },
    { name: '16:00', util: 82 },
    { name: '20:00', util: 95 },
    { name: '23:59', util: 60 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-slate-400 mt-1">Real-time health and performance metrics for the GPU cluster.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">Download Report</button>
          <button className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-500 transition-colors">Cluster Settings</button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          icon={<Activity className="text-indigo-400" />} 
          label="Total Utilization" 
          value={`${stats.avgUtilization.toFixed(1)}%`} 
          trend="+5.2%" 
          positive={true}
        />
        <MetricCard 
          icon={<Cpu className="text-emerald-400" />} 
          label="Memory Usage" 
          value={`${stats.usedMemory} GB`} 
          subValue={`of ${stats.totalMemory} GB`}
        />
        <MetricCard 
          icon={<Clock className="text-amber-400" />} 
          label="Active Jobs" 
          value={MOCK_WORKLOADS.filter(w => w.status === JobStatus.RUNNING).length.toString()} 
          trend="Stable"
        />
        <MetricCard 
          icon={<ShieldCheck className="text-blue-400" />} 
          label="Node Health" 
          value="100%" 
          subValue="4/4 Active Nodes"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Utilization Chart */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-white">Cluster Utilization History</h2>
            <select className="bg-slate-800 border-none rounded-lg text-xs px-2 py-1 outline-none text-slate-300">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Area type="monotone" dataKey="util" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorUtil)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Workloads */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Active Workloads</h2>
            <button className="text-xs text-indigo-400 hover:underline">View all</button>
          </div>
          <div className="space-y-4">
            {MOCK_WORKLOADS.slice(0, 5).map((job) => (
              <div key={job.id} className="p-3 bg-slate-800/30 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    {job.type === 'INTERACTIVE' ? <Terminal size={14} className="text-slate-500" /> : <Zap size={14} className="text-slate-500" />}
                    <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors truncate max-w-[120px]">{job.name}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[job.status]}`}>
                    {job.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{job.owner}</span>
                  <span className="text-xs font-mono text-slate-400">{job.gpuRequested} GPU</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode, label: string, value: string, subValue?: string, trend?: string, positive?: boolean }> = ({ icon, label, value, subValue, trend, positive }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 bg-slate-800 rounded-xl group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trend === 'Stable' ? 'bg-slate-800 text-slate-400' : positive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
        {subValue && <span className="text-sm text-slate-500">{subValue}</span>}
      </div>
    </div>
    <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
      {icon}
    </div>
  </div>
);

export default Dashboard;
