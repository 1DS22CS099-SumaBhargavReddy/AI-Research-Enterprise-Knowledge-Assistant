import React, { useState, useEffect, useRef } from 'react';
import { Send, Eye, Brain, HelpCircle, ShieldAlert, Sparkles, BookOpen, Layers } from 'lucide-react';

export default function ChatInterface({ authHeader = {}, isAuthenticated = false, onRequestLogin }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeExplainChunk, setActiveExplainChunk] = useState(null);
  const [showXai, setShowXai] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userQuery = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setLoading(true);

    const api_url = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${api_url}/api/search/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ query: userQuery, limit: 4 })
      });

      if (!response.ok) throw new Error("Search query failed");

      const result = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.answer,
        chunks: result.retrieved_chunks,
        latency: result.latency_seconds
      }]);
      
      // Auto-set the first chunk for explainability dashboard view
      if (result.retrieved_chunks && result.retrieved_chunks.length > 0) {
        setActiveExplainChunk(result.retrieved_chunks[0]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Error communicating with search backend. Please verify that documents have been successfully uploaded and the backend containers are running.",
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to color token depending on weight
  const getTokenColorClass = (weight) => {
    if (weight >= 0.8) return 'bg-brand-500/30 text-sky-200 border-brand-500/50';
    if (weight >= 0.5) return 'bg-brand-500/15 text-sky-300 border-brand-500/30';
    if (weight >= 0.2) return 'bg-purple-500/15 text-purple-300 border-purple-500/20';
    return 'text-slate-300';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[calc(100vh-12rem)] animate-fadeIn">
      {/* Chat Room (left 2/3) */}
      <div className="lg:col-span-2 flex flex-col justify-between glass-panel rounded-2xl p-6 glow-card">
        
        {/* Header */}
        <div className="border-b border-slate-900 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand-500" />
                Cognitive RAG Co-Pilot
              </h2>
              <p className="text-[10px] text-slate-400">Sentence Embeddings + Hybrid Vector Index</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowXai(!showXai)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-2 border transition-all ${
              showXai 
                ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Brain size={14} /> Explain AI
          </button>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto space-y-6 my-6 max-h-[50vh] pr-2">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="p-4 bg-brand-500/10 text-brand-400 rounded-2xl animate-float">
                <Brain size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white">Ask your knowledge base</h3>
                <p className="text-xs text-slate-400 max-w-sm">Ask complex questions across all indexed reports, academic publications, and operational guidelines.</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex flex-col space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] text-slate-400 uppercase tracking-widest px-1">
                {msg.role === 'user' ? 'Query' : 'RAG Generator'}
              </span>
              <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed border ${
                msg.role === 'user' 
                  ? 'bg-brand-600/10 border-brand-500/20 text-white rounded-tr-none' 
                  : msg.error
                    ? 'bg-red-500/10 border-red-500/20 text-red-300 rounded-tl-none'
                    : 'bg-slate-900/80 border-slate-800 text-slate-100 rounded-tl-none'
              }`}>
                {msg.content}
                
                {msg.latency && (
                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/40 pt-2 font-mono">
                    <span>Latency: {msg.latency}s</span>
                    <span>Tokens: MiniLM-L6 Embeddings</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex flex-col space-y-1.5 items-start">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest px-1">RAG Generator</span>
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                <LoaderIcon className="animate-spin text-brand-500" />
                <span className="text-xs text-slate-400">Synthesizing documents & reasoning...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="relative mt-2">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your search query..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3.5 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button 
            type="submit" 
            disabled={loading || !query.trim()}
            className="absolute right-2.5 top-2.5 bg-brand-500 hover:bg-brand-600 active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 text-white p-2 rounded-lg transition-all"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

      {/* Explainable AI Sidebar (right 1/3, togglable) */}
      <div className={`lg:col-span-1 flex flex-col space-y-6 transition-all duration-300 ${showXai ? 'opacity-100 scale-100' : 'opacity-50 scale-98 pointer-events-none lg:pointer-events-auto lg:opacity-100'}`}>
        <div className="glass-panel rounded-2xl p-6 space-y-6 min-h-full glow-card">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Layers size={18} className="text-brand-500" />
            Attribution Insights (XAI)
          </h2>
          
          {/* Active response selection */}
          {messages.length > 0 && messages[messages.length - 1].chunks ? (
            <div className="space-y-6">
              {/* Select chunk tabs */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-400">Retrieved Context Sources</label>
                <div className="flex flex-wrap gap-2">
                  {messages[messages.length - 1].chunks.map((ch, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveExplainChunk(ch)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                        activeExplainChunk?.chunk_id === ch.chunk_id && activeExplainChunk?.document_id === ch.document_id
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      Doc {ch.document_id} (Chunk {ch.chunk_id})
                    </button>
                  ))}
                </div>
              </div>

              {/* Explainer results */}
              {activeExplainChunk && (
                <div className="space-y-6">
                  {/* Semantic match score */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Embedding Match Score</span>
                      <span className="text-brand-400">{(activeExplainChunk.score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-brand-500 h-full rounded-full" style={{ width: `${activeExplainChunk.score * 100}%` }}></div>
                    </div>
                  </div>

                  {/* Token Highlights (LIME heatmap) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold uppercase text-slate-400">Word Matching Heatmap</label>
                      <span className="text-[9px] text-brand-400 font-semibold px-2 py-0.5 rounded bg-brand-500/10">LIME Surrogate Model</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-900 text-xs leading-relaxed max-h-[220px] overflow-y-auto font-light">
                      {activeExplainChunk.token_highlights.map((item, index) => (
                        <span 
                          key={index} 
                          className={`mx-[1px] px-[2px] py-[1px] rounded transition-all duration-300 border border-transparent ${getTokenColorClass(item.weight)}`}
                          title={`Weight: ${item.weight}`}
                        >
                          {item.token}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Classification attributions */}
                  {activeExplainChunk.feature_attributions && Object.keys(activeExplainChunk.feature_attributions).length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-slate-400">Feature Attributions for Domain</label>
                      <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-slate-900">
                        {Object.entries(activeExplainChunk.feature_attributions).map(([word, wt]) => (
                          <div key={word} className="flex justify-between text-[11px] font-mono">
                            <span className="text-slate-400">"{word}"</span>
                            <span className="text-brand-300">+{wt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs font-light">
              Submit a search query to view token attribution weights and similarity indices.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoaderIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
