import React, { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, Trash2, Layers, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { onboardingApi } from '../../services/api';

export default function AdminModulesList() {
  const [modules, setModules] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const navigate = useNavigate();

  const fetchModules = async () => {
    try {
      setLoading(true);
      const data = await onboardingApi.getModules(true); // include drafts
      setModules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch modules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;

    try {
      await onboardingApi.deleteModule(id);
      setModules(modules.filter(m => m.id !== id));
      toast.success('Module deleted.');
    } catch (err) {
      console.error('Failed to delete module:', err);
      toast.error('Error deleting module.');
    }
  };

  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...modules];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    const previous = modules;
    setDragIndex(null);
    setDragOverIndex(null);
    setModules(reordered); // optimistic update

    onboardingApi.reorderModules(reordered.map(m => m.id)).catch(err => {
      console.error('Failed to reorder modules:', err);
      toast.error('Failed to save the new order.');
      setModules(previous); // revert on failure
    });
  };

  const isSearching = searchQuery.trim().length > 0;

  const filteredModules = modules.filter(m =>
    (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Module Management</h2>
          <p className="text-sm text-slate-500">Create and oversee onboarding training modules. Drag rows to reorder.</p>
        </div>
        <button
          onClick={() => navigate('/admin/modules/new')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:shadow-lg hover:bg-indigo-700 shadow-md bg-indigo-600"
        >
          <Plus className="h-4 w-4" /> Create Module
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60 mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-medium"
            />
          </div>
          <div className="flex gap-2">
            <span className="px-4 py-2 bg-slate-100 text-slate-650 rounded-lg text-sm font-semibold whitespace-nowrap">
              {modules.length} Total Modules
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500 flex items-center justify-center gap-2">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-350 border-t-indigo-600" />
            Loading modules...
          </div>
        ) : (
          <div className="space-y-3 p-6 bg-slate-50/50 rounded-b-2xl">
            {isSearching && (
              <p className="text-xs text-slate-400 italic pb-1">Clear the search to drag and reorder modules.</p>
            )}
            {filteredModules.length === 0 ? (
              <div className="py-12 text-center text-slate-500 italic">No modules found. Start by creating one!</div>
            ) : filteredModules.map((m, i) => (
              <div
                key={m.id}
                draggable={!isSearching}
                onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { e.preventDefault(); if (dragOverIndex !== i) setDragOverIndex(i); }}
                onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/modules/new?edit=${m.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/admin/modules/new?edit=${m.id}`);
                  }
                }}
                title="Open module to edit"
                className={`bg-white border rounded-2xl p-4 transition-all flex items-center gap-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:border-indigo-300 hover:shadow-sm ${
                  dragOverIndex === i && dragIndex !== null && dragIndex !== i ? 'border-indigo-400 border-dashed bg-indigo-50/40' : 'border-slate-200/80'
                } ${dragIndex === i ? 'opacity-40' : ''}`}
              >
                {!isSearching && (
                  <span
                    className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0"
                    title="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-5 w-5" />
                  </span>
                )}
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-base line-clamp-1">{m.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-1">{m.description}</p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0">
                  <Layers className="h-4 w-4 text-slate-400" />
                  {m.sections?.length || 0} Sections
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                  (m.status || '').toLowerCase() === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  {m.status}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(m.id, m.title); }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
