import React, { useState } from 'react';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { Cpu, Bell, User, Search, Activity } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps, router }: AppProps) {
  // Map pathname to tab id
  const pathToTab = (pathname: string): string => {
    switch (pathname) {
      case '/':
        return 'dashboard';
      case '/sandboxes':
        return 'sandboxes';
      case '/jobs':
        return 'jobs';
      case '/models':
        return 'models';
      case '/datasets':
        return 'datasets';
      case '/files':
        return 'files';
      case '/admin':
        return 'admin';
      default:
        return 'dashboard';
    }
  };

  const activeTab = pathToTab(router.pathname);

  const handleTabChange = (tabId: string) => {
    switch (tabId) {
      case 'dashboard':
        router.push('/');
        break;
      case 'sandboxes':
        router.push('/sandboxes');
        break;
      case 'jobs':
        router.push('/jobs');
        break;
      case 'models':
        router.push('/models');
        break;
      case 'datasets':
        router.push('/datasets');
        break;
      case 'files':
        router.push('/files');
        break;
      case 'admin':
        router.push('/admin');
        break;
    }
  };

  return (
    <main className={`${inter.className}`}>
      <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-200">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Cpu className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">GPU Maestro</span>
          </div>

          <nav className="flex-1 mt-4 px-4 space-y-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white hover:translate-x-1'
                }`}
              >
                <span className={`${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800/70 hover:text-white transition-all duration-200 group">
              <Activity size={20} className="text-slate-400 group-hover:text-white" />
              <span className="text-sm font-medium">System Status</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800/70 hover:text-white transition-all duration-200 group">
              <Bell size={20} className="text-slate-400 group-hover:text-white" />
              <span className="text-sm font-medium">Notifications</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800/70 hover:text-white transition-all duration-200 group">
              <User size={20} className="text-slate-400 group-hover:text-white" />
              <span className="text-sm font-medium">Account</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search resources, jobs, models..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-800/70 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            <Component {...pageProps} />
          </div>
        </main>
      </div>
    </main>
  );
}
