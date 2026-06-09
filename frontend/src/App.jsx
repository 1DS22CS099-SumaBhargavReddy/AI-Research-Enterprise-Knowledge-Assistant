import React, { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquare, UploadCloud, Sparkles, Activity, Brain, User, ExternalLink, LogOut, LogIn } from 'lucide-react';

import Dashboard from './components/Dashboard';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import RecommendationWidget from './components/RecommendationWidget';
import MonitoringDashboard from './components/MonitoringDashboard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    documents_total: 0,
    indexed_vectors: 0,
    chats_total: 0,
    avg_latency: 0.0,
    postgres_status: 'Connected',
    qdrant_status: 'Connected',
    redis_status: 'Connected'
  });
  const [documents, setDocuments] = useState([]);

  // Auth state
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Build the auth header object for child components
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = authMode === 'register'
        ? { username: authForm.username, email: authForm.email, password: authForm.password }
        : { username: authForm.username, password: authForm.password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Authentication failed');
      }

      const data = await res.json();
      setToken(data.access_token);
      setUser({ username: data.username });
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify({ username: data.username }));
      setShowAuthModal(false);
      setAuthForm({ username: '', email: '', password: '' });
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const fetchGlobalData = async () => {
    try {
      // Fetch documents list
      const docRes = await fetch(`${API_URL}/api/documents/`);
      if (docRes.ok) {
        const docData = await docRes.json();
        setDocuments(docData);
      }

      // Fetch monitoring stats
      const metricRes = await fetch(`${API_URL}/api/monitoring/metrics-summary`);
      if (metricRes.ok) {
        const metricData = await metricRes.json();
        setStats({
          documents_total: metricData.database.documents_total,
          indexed_vectors: metricData.vector_db.indexed_vectors_total,
          chats_total: metricData.database.chats_total,
          avg_latency: metricData.performance.average_rag_latency_seconds,
          postgres_status: metricData.status.postgres,
          qdrant_status: metricData.status.qdrant,
          redis_status: metricData.status.redis
        });
      }
    } catch (err) {
      console.warn("Failed to contact backend API. Visualizations are using fallback states.", err);
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-mesh bg-grid-pattern min-h-screen flex text-slate-100 font-sans">

      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-slate-900 bg-slate-950/70 backdrop-blur-xl shrink-0 hidden md:flex flex-col justify-between p-6 h-screen sticky top-0">
        <div className="space-y-8">

          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-600 text-white shadow-lg shadow-brand-500/20">
              <Brain size={22} className="animate-float" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white uppercase">AI Research & Enterprise Knowledge Assistant</h1>
              <p className="text-[9px] font-semibold text-brand-500 tracking-wider">KNOWLEDGE ASSISTANT</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'chat', label: 'Cognitive RAG Chat', icon: MessageSquare },
              { id: 'upload', label: 'Upload Documents', icon: UploadCloud },
              { id: 'recommendations', label: 'ML Recommendations', icon: Sparkles },
              { id: 'monitoring', label: 'System Monitoring', icon: Activity }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-300 ${activeTab === tab.id
                      ? 'bg-brand-500/10 border-brand-500/30 text-brand-400 shadow-md shadow-brand-500/5'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer profile indicator */}
        <div className="border-t border-slate-900 pt-4 space-y-3">
          {user ? (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <User size={14} />
                </div>
                <div>
                  <div className="font-semibold text-[11px] text-slate-200">{user.username}</div>
                  <div className="text-[9px] text-emerald-400">Authenticated</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowAuthModal(true); setAuthMode('login'); setAuthError(''); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 transition-all"
            >
              <LogIn size={14} />
              Sign In to Upload & Chat
            </button>
          )}
          <div className="flex justify-end">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 hover:text-white transition-colors text-slate-500"
              title="Swagger Documentation"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl overflow-y-auto min-h-screen">
        {/* Mobile auth bar */}
        {!user && (
          <div className="md:hidden mb-6">
            <button
              onClick={() => { setShowAuthModal(true); setAuthMode('login'); setAuthError(''); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold bg-brand-500/10 border border-brand-500/30 text-brand-400"
            >
              <LogIn size={14} />
              Sign In to Upload & Chat
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard stats={stats} documents={documents} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'chat' && (
          <ChatInterface authHeader={authHeader} isAuthenticated={!!token} onRequestLogin={() => { setShowAuthModal(true); setAuthMode('login'); setAuthError(''); }} />
        )}
        {activeTab === 'upload' && (
          <DocumentUpload
            documents={documents}
            onUploadSuccess={fetchGlobalData}
            onDeleteSuccess={fetchGlobalData}
            authHeader={authHeader}
            isAuthenticated={!!token}
            onRequestLogin={() => { setShowAuthModal(true); setAuthMode('login'); setAuthError(''); }}
          />
        )}
        {activeTab === 'recommendations' && (
          <RecommendationWidget authHeader={authHeader} isAuthenticated={!!token} onRequestLogin={() => { setShowAuthModal(true); setAuthMode('login'); setAuthError(''); }} />
        )}
        {activeTab === 'monitoring' && (
          <MonitoringDashboard />
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl shadow-brand-500/10" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-600 text-white mb-3">
                <Brain size={24} />
              </div>
              <h2 className="text-lg font-bold text-white">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {authMode === 'login' ? 'Enter your credentials to access all features' : 'Register a new account to get started'}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="Enter username"
                  required
                  autoFocus
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="Enter password"
                  required
                />
              </div>

              {authError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-600 active:scale-[0.98] disabled:opacity-50 text-white transition-all"
              >
                {authLoading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="text-center mt-5">
              <button
                onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
                className="text-xs text-slate-400 hover:text-brand-400 transition-colors"
              >
                {authMode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
