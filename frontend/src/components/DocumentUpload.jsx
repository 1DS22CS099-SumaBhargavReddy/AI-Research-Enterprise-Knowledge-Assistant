import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, Loader2, FileText, Trash2, Tag, Calendar, Database } from 'lucide-react';

export default function DocumentUpload({ documents, onUploadSuccess, onDeleteSuccess, authHeader = {}, isAuthenticated = false, onRequestLogin }) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message: string }
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    if (!isAuthenticated) {
      setStatus({ type: 'error', message: 'Please sign in first to upload documents.' });
      if (onRequestLogin) onRequestLogin();
      return;
    }

    const api_url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    setLoading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${api_url}/api/documents/upload`, {
        method: "POST",
        headers: { ...authHeader },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Upload failed");
      }

      const result = await response.json();
      setStatus({
        type: 'success',
        message: `Successfully uploaded "${file.name}". Classified as: ${result.category}. Indexed ${result.chunks_indexed} vector chunks.`
      });
      onUploadSuccess();
    } catch (err) {
      console.error(err);
      setStatus({
        type: 'error',
        message: err.message || "Failed to upload document. Please ensure format is .pdf, .txt, or .md."
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (id) => {
    const api_url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${api_url}/api/documents/${id}`, {
        method: "DELETE",
        headers: { ...authHeader }
      });
      if (!response.ok) throw new Error("Delete failed");
      
      onDeleteSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to delete document.");
    }
  };

  const triggerInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Upload Zone */}
      <div className="glass-panel rounded-2xl p-8 glow-card">
        <form 
          onDragEnter={handleDrag} 
          onDragOver={handleDrag} 
          onDragLeave={handleDrag} 
          onDrop={handleDrop}
          onClick={triggerInput}
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            dragActive ? 'border-brand-500 bg-brand-500/5' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/10'
          }`}
        >
          <input 
            ref={fileInputRef} 
            type="file" 
            className="hidden" 
            accept=".pdf,.txt,.md" 
            onChange={handleChange}
          />
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`p-4 rounded-full bg-slate-900/50 text-slate-400 group-hover:text-brand-500 transition-colors ${loading ? 'animate-pulse' : ''}`}>
              {loading ? <Loader2 size={36} className="animate-spin text-brand-500" /> : <UploadCloud size={36} />}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Drag & drop your document</h3>
              <p className="text-xs text-slate-400">Supports PDF, TXT, or MD files up to 15MB</p>
            </div>
          </div>
        </form>

        {/* Upload status message */}
        {status && (
          <div className={`mt-6 p-4 rounded-xl flex gap-3 text-sm border ${
            status.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}>
            {status.type === 'success' ? <CheckCircle2 className="shrink-0" size={18} /> : <AlertTriangle className="shrink-0" size={18} />}
            <div>{status.message}</div>
          </div>
        )}
      </div>

      {/* Catalog lists */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Database size={20} className="text-brand-500" />
          Indexed Knowledge Catalog ({documents.length})
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between space-y-4 glow-card">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                      <FileText size={18} />
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono">
                      {doc.file_type}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if(confirm(`Are you sure you want to delete ${doc.title}?`)) deleteDocument(doc.id);
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <h3 className="text-base font-bold text-white truncate pr-6" title={doc.title}>
                  {doc.title}
                </h3>
                
                {doc.summary && (
                  <p className="text-xs text-slate-400 line-clamp-3 font-light leading-relaxed">
                    {doc.summary}
                  </p>
                )}
              </div>

              <div className="border-t border-slate-900 pt-4 flex flex-wrap justify-between items-center gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Tag size={12} className="text-brand-500" />
                  <span className="text-[10px] font-semibold tracking-wider uppercase bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded-full">
                    {doc.category || 'General'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar size={12} />
                  <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
          
          {documents.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center space-y-3 bg-slate-900/10 rounded-2xl border border-slate-800/50">
              <FileText size={48} className="text-slate-600" />
              <div className="space-y-1">
                <h3 className="font-bold text-white">No indexed documents</h3>
                <p className="text-xs text-slate-500 max-w-xs">Upload your research papers, financial logs, or operations files to populate the vector search space.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
