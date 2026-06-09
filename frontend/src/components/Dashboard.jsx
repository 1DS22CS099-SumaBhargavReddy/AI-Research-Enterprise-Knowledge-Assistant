import React, { useEffect, useState } from 'react';
import { Database, FileText, Activity, Clock, Shield, UploadCloud } from 'lucide-react';

export default function Dashboard({ stats, documents, setActiveTab }) {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome banner */}
      <div className="relative glass-panel rounded-2xl p-8 glow-card overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10 space-y-2">
          <span className="text-xs uppercase tracking-widest text-brand-500 font-bold bg-brand-500/10 px-3 py-1 rounded-full">
            SYSTEM ONLINE
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Enterprise Knowledge Discovery
          </h1>
          <p className="text-slate-400 max-w-2xl font-light">
            Secure semantic hybrid search, automated deep learning classifications, Explainable AI word attribution maps, and intelligent content recommendation models.
          </p>
          <div className="pt-4 flex gap-4">
            <button 
              onClick={() => setActiveTab('upload')} 
              className="bg-brand-500 hover:bg-brand-600 active:scale-95 transition text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/20"
            >
              <UploadCloud size={16} /> Upload documents
            </button>
            <button 
              onClick={() => setActiveTab('chat')} 
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700/50 transition"
            >
              Ask Assistant
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 flex items-center gap-5">
          <div className="p-4 rounded-xl bg-brand-500/10 text-brand-500">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Indexed Files</div>
            <div className="text-3xl font-bold mt-1 text-white">{stats.documents_total}</div>
          </div>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-6 flex items-center gap-5">
          <div className="p-4 rounded-xl bg-purple-500/10 text-purple-500">
            <Database size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Vector Chunks</div>
            <div className="text-3xl font-bold mt-1 text-white">{stats.indexed_vectors}</div>
          </div>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-6 flex items-center gap-5">
          <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Query Analytics</div>
            <div className="text-3xl font-bold mt-1 text-white">{stats.chats_total}</div>
          </div>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-6 flex items-center gap-5">
          <div className="p-4 rounded-xl bg-amber-500/10 text-amber-500">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">RAG Latency</div>
            <div className="text-3xl font-bold mt-1 text-white">{stats.avg_latency}s</div>
          </div>
        </div>
      </div>

      {/* Main sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent documents table */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Shield size={18} className="text-brand-500" />
              Ingested Knowledge Assets
            </h2>
            <span className="text-xs text-slate-400">{documents.length} Total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Asset Name</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">DL Category</th>
                  <th className="py-3 px-4 font-semibold text-right">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {documents.slice(0, 5).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="py-4 px-4 font-medium text-slate-100 max-w-[200px] truncate">
                      {doc.title}
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-slate-400">
                      {doc.file_type}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        doc.category === 'Research & Academic' ? 'bg-blue-500/15 text-blue-400' :
                        doc.category === 'Legal & Compliance' ? 'bg-red-500/15 text-red-400' :
                        doc.category === 'Financial & Business' ? 'bg-emerald-500/15 text-emerald-400' :
                        doc.category === 'Technical & Engineering' ? 'bg-purple-500/15 text-purple-400' :
                        'bg-slate-500/15 text-slate-400'
                      }`}>
                        {doc.category || 'General'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-xs text-slate-400 font-mono">
                      {doc.metadata?.size_bytes ? `${(doc.metadata.size_bytes / 1024).toFixed(1)} KB` : 'N/A'}
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500 font-light">
                      No documents index. Go to Uploads.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick analytics card */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Activity size={18} className="text-purple-500" />
            Class Distribution
          </h2>
          
          <div className="space-y-4">
            {['Research & Academic', 'Legal & Compliance', 'Financial & Business', 'Technical & Engineering', 'General Operations'].map((cat, i) => {
              const count = documents.filter(d => d.category === cat).length;
              const pct = documents.length > 0 ? (count / documents.length) * 100 : 0;
              const colors = ['bg-blue-500', 'bg-red-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'];
              
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">{cat}</span>
                    <span className="text-slate-200">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`${colors[i]} h-full rounded-full transition-all duration-1000`} 
                      style={{ width: `${pct || 4}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
