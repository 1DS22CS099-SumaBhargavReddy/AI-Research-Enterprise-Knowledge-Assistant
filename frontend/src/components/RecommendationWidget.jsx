import React, { useEffect, useState } from 'react';
import { Sparkles, Eye, Tag, FileText, ChevronRight, Check } from 'lucide-react';

export default function RecommendationWidget({ authHeader = {}, isAuthenticated = false, onRequestLogin }) {
  const [recommendations, setRecommendations] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logStatus, setLogStatus] = useState(null);

  const fetchRecommendations = async () => {
    const api_url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    setLoading(true);
    try {
      const response = await fetch(`${api_url}/api/recommendations/`, {
        headers: { ...authHeader }
      });
      if (!response.ok) throw new Error("Failed to fetch recommendations");
      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleDocClick = async (doc) => {
    setActiveDoc(doc);
    setLogStatus(null);
    
    // Simulate user reading this document by posting a reading log duration
    const api_url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${api_url}/api/recommendations/log-reading`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          document_id: doc.id,
          duration_seconds: 12  // Log 12 seconds of view duration
        })
      });
      if (response.ok) {
        setLogStatus(doc.id);
        // Silently reload recommendations so content filtering dynamically adapts!
        setTimeout(() => {
          fetchRecommendations();
        }, 3000);
      }
    } catch (err) {
      console.error("Failed to log reading interaction:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[calc(100vh-12rem)] animate-fadeIn">
      {/* Recommendation lists (left 1/3) */}
      <div className="lg:col-span-1 glass-panel rounded-2xl p-6 flex flex-col space-y-6 glow-card">
        <div className="border-b border-slate-900 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles size={16} className="text-purple-400" />
              Machine Learning Feed
            </h2>
            <p className="text-[10px] text-slate-400">Content-Based Filtering (TF-IDF Similarity)</p>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <svg className="animate-spin h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[60vh] pr-2">
            {recommendations.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => handleDocClick(doc)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 flex items-center justify-between group ${
                  activeDoc?.id === doc.id
                    ? 'bg-brand-500/10 border-brand-500/30 shadow-lg shadow-brand-500/5'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1.5 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                      {doc.file_type}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-brand-400">
                      {doc.category || 'General'}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate group-hover:text-brand-400 transition-colors">
                    {doc.title}
                  </h3>
                </div>
                <ChevronRight size={14} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}

            {recommendations.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs font-light">
                No recommendation data. Upload documents and log queries first to build user log matrices.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reader Panel (right 2/3) */}
      <div className="lg:col-span-2 glass-panel rounded-2xl p-8 flex flex-col justify-between glow-card">
        {activeDoc ? (
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="border-b border-slate-900 pb-4 flex justify-between items-center flex-wrap gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded">
                    DOCUMENT ID: {activeDoc.id}
                  </span>
                  <h1 className="text-xl font-bold text-white mt-2">
                    {activeDoc.title}
                  </h1>
                </div>
                
                {logStatus === activeDoc.id && (
                  <div className="text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse">
                    <Check size={12} /> Reading Session Logged (+12s weight)
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Tag size={14} className="text-brand-500" />
                  <span className="font-semibold text-slate-200 uppercase tracking-wider">{activeDoc.category}</span>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Abstract / Summary</h3>
                  <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-900 text-sm leading-relaxed font-light text-slate-300">
                    {activeDoc.summary || 'No summary is available for this document.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-4 font-mono">
              Note: Viewing recommendation logs dynamically updates user interests in PostgreSQL reading matrices, feeding back to the scikit-learn TF-IDF recommender pipelines.
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
            <div className="p-4 bg-purple-500/10 text-purple-400 rounded-2xl animate-float">
              <FileText size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white">Select a recommended document</h3>
              <p className="text-xs text-slate-400 max-w-sm">Select an asset from your machine learning feed on the left. Reading the document logs interaction telemetry, updating recommendation parameters in real-time.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
