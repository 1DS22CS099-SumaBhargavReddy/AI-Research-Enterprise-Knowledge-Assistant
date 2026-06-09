import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Server, HardDrive, Database, Link2 } from 'lucide-react';

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [cpuHistory, setCpuHistory] = useState([20, 25, 22, 28, 30, 24, 26, 25, 23, 27]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    const api_url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${api_url}/api/monitoring/metrics-summary`);
      if (!response.ok) throw new Error("Failed to fetch metrics");
      const data = await response.json();
      setMetrics(data);
      
      // Update CPU history list (keep max 12 items)
      setCpuHistory(prev => {
        const next = [...prev, data.performance.cpu_utilization_percent];
        if (next.length > 12) next.shift();
        return next;
      });
      
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <svg className="animate-spin h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  // Generate SVG path for CPU history line
  const width = 500;
  const height = 120;
  const points = cpuHistory.map((val, idx) => {
    const x = (idx / (cpuHistory.length - 1)) * width;
    // map 0-100% to height - 10 to 10
    const y = height - ((val / 100) * (height - 20) + 10);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Service status */}
        <div className="glass-panel rounded-2xl p-6 space-y-4 glow-card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Server size={14} className="text-brand-500" />
            Infrastructure Gateway
          </h3>
          <div className="space-y-3 pt-2">
            {Object.entries(metrics.status).map(([service, status]) => (
              <div key={service} className="flex justify-between items-center text-sm font-mono">
                <span className="capitalize text-slate-400">{service} Container</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  status === 'Healthy' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Database records */}
        <div className="glass-panel rounded-2xl p-6 space-y-4 glow-card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Database size={14} className="text-purple-400" />
            PostgreSQL Indices
          </h3>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-slate-400">Total Users</span>
              <span className="text-white font-bold">{metrics.database.users_total}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-slate-400">Total Queries</span>
              <span className="text-white font-bold">{metrics.database.chats_total}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-slate-400">Total Reading Logs</span>
              <span className="text-white font-bold">{metrics.database.reading_logs_total}</span>
            </div>
          </div>
        </div>

        {/* Vector DB indices */}
        <div className="glass-panel rounded-2xl p-6 space-y-4 glow-card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <HardDrive size={14} className="text-emerald-400" />
            Qdrant Vector Database
          </h3>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-slate-400">Collection Name</span>
              <span className="text-brand-300 font-bold">{metrics.vector_db.collection_name}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-slate-400">Indexed Vectors</span>
              <span className="text-white font-bold">{metrics.vector_db.indexed_vectors_total}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-slate-400">Latency Average</span>
              <span className="text-white font-bold">{metrics.performance.average_rag_latency_seconds}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CPU Util graph */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu size={16} className="text-brand-500" />
              CPU Utilization Telemetry
            </h3>
            <span className="text-xs font-mono bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded">
              {metrics.performance.cpu_utilization_percent}% Current
            </span>
          </div>

          <div className="relative pt-4">
            {/* SVG graph */}
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 overflow-visible">
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Grid lines */}
              <line x1="0" y1={height - 10} x2={width} y2={height - 10} stroke="#1e293b" strokeDasharray="3" />
              <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#1e293b" strokeDasharray="3" />
              <line x1="0" y1="10" x2={width} y2="10" stroke="#1e293b" strokeDasharray="3" />

              {/* Area path */}
              <path
                d={`M 0,${height - 10} L ${points} L ${width},${height - 10} Z`}
                fill="url(#cpuGrad)"
              />
              
              {/* Line path */}
              <polyline
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2.5"
                points={points}
              />
            </svg>
          </div>
        </div>

        {/* RAM memory container */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HardDrive size={16} className="text-purple-400" />
            Memory (RAM) Footprint
          </h3>

          <div className="flex-1 flex flex-col items-center justify-center py-4 space-y-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Circular gauge */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="50" fill="transparent" stroke="#1e293b" strokeWidth="8" />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="50" 
                  fill="transparent" 
                  stroke="#a855f7" 
                  strokeWidth="8" 
                  strokeDasharray={314}
                  strokeDashoffset={314 - (314 * Math.min(metrics.performance.memory_usage_mb, 1000) / 1000)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-white">{metrics.performance.memory_usage_mb}</span>
                <span className="text-[10px] text-slate-500 font-mono">MB Allocation</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-light text-center">Container scaling boundaries are set at 1024MB maximum.</p>
          </div>
        </div>
      </div>

      {/* Prometheus direct endpoint integration */}
      <div className="glass-panel rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4 border-t border-brand-500/10">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" />
            Prometheus Exporter Port (Metrics)
          </h3>
          <p className="text-xs text-slate-400">Exposes container runtime, requests counter, database states and latency histograms.</p>
        </div>
        <a 
          href="http://localhost:8000/metrics" 
          target="_blank" 
          rel="noreferrer"
          className="bg-slate-900 hover:bg-slate-800 text-brand-400 border border-brand-500/20 px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 shadow shadow-brand-500/5 transition-all"
        >
          <Link2 size={12} /> http://localhost:8000/metrics
        </a>
      </div>
    </div>
  );
}
