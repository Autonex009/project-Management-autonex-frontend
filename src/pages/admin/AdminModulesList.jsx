import React, { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, Trash2, Edit, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { onboardingApi } from '../../services/api';

export default function AdminModulesList() {
  const [modules, setModules] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
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
    } catch (err) {
      console.error('Failed to delete module:', err);
      alert('Error deleting module.');
    }
  };

  const filteredModules = modules.filter(m => 
    (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Module Management</h2>
          <p className="text-sm text-slate-500">Create and oversee onboarding training modules.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-slate-50/50 rounded-b-2xl">
            {filteredModules.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 italic">No modules found. Start by creating one!</div>
            ) : filteredModules.map((m) => (
              <div
                key={m.id}
                className="bg-white border text-left border-slate-200/80 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col h-full hover:-translate-y-1 duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    (m.status || '').toLowerCase() === 'published' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {m.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-1">{m.title}</h3>
                <p className="text-sm text-slate-500 mb-6 line-clamp-2 flex-grow">{m.description}</p>
                
                <div className="pt-4 border-t border-slate-150 flex items-center justify-between text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Layers className="h-4 w-4 text-slate-400" />
                    {m.sections?.length || 0} Sections
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate(`/admin/modules/new?edit=${m.id}`)} 
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(m.id, m.title)} 
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
