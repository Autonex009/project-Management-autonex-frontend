import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Mail, Globe, MessageCircle, Building2, Pencil, X, Check, Upload, Download } from 'lucide-react';
import { onboardingApi } from '../../services/api';

const emptyForm = { name: '', role: '', department: '', email: '', linkedin: '', slack: '' };

export default function AdminTeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const data = await onboardingApi.getTeam();
      setTeam(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch team:', err);
      setTeam([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchTeam(); 
  }, []);

  const openAdd = () => {
    setEditingMember(null);
    setFormData({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      role: member.role || '',
      department: member.department || '',
      email: member.email || '',
      linkedin: member.linkedin || '',
      slack: member.slack || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingMember) {
        await onboardingApi.updateTeamMember(editingMember.id, formData);
      } else {
        await onboardingApi.createTeamMember(formData);
      }
      setFormData({ ...emptyForm });
      setShowForm(false);
      setEditingMember(null);
      fetchTeam();
    } catch (err) {
      console.error('Failed to save team member:', err);
      alert('Failed to save team member. Ensure all fields are valid.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this team member from the directory?')) return;
    try {
      await onboardingApi.deleteTeamMember(id);
      fetchTeam();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);

    try {
      const result = await onboardingApi.importTeam(data);
      setImportResult(result);
      fetchTeam();
    } catch (err) {
      console.error(err);
      alert('Import failed.');
    }

    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-550 flex items-center justify-center gap-2">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-350 border-t-indigo-650" />
        Loading team directory...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 border-l-4 border-indigo-600 pl-3">Company Team</h2>
          <p className="text-sm text-slate-500 mt-1 pl-4">Manage the onboarding team directory visible to employees.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
          <a 
            href={onboardingApi.getTeamSampleUrl()} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Sample Excel
          </a>
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer">
            <Upload className="h-3.5 w-3.5" /> Import Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleBulkImport} ref={fileInputRef} className="hidden" />
          </label>
          <button 
            onClick={openAdd} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-md"
          >
            <Plus className="h-4 w-4" /> Add Team Member
          </button>
        </div>
      </div>

      {importResult && (
        <div className="p-4 rounded-xl border bg-green-50 border-green-200 transition-all duration-300">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-green-800">
              {importResult.created} team members created, {importResult.skipped} skipped
            </p>
            <button onClick={() => setImportResult(null)} className="text-green-600 hover:text-green-800 text-sm font-bold">&times;</button>
          </div>
          {importResult.errors?.length > 0 && (
            <ul className="mt-2 text-xs text-green-750 space-y-0.5">
              {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>• {err}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60 mb-8 transition-all duration-300">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-800">{editingMember ? 'Edit Team Member' : 'New Team Member Profile'}</h3>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="e.g. Emily Rodriguez" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role / Job Title *</label>
              <input required type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="e.g. HR Business Partner" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department *</label>
              <input required type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="e.g. Human Resources" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="e.g. emily.rodriguez@company.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">LinkedIn Full URL</label>
              <input type="url" value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="https://linkedin.com/in/emilyrodriguez" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Slack Channel / DM Link</label>
              <input type="url" value={formData.slack} onChange={e => setFormData({...formData, slack: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="https://yourworkspace.slack.com/team/U01234" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-slate-650 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2">
                <Check className="h-4 w-4" />
                {submitting ? 'Saving...' : editingMember ? 'Save Changes' : 'Add to Directory'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Table */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3.5 px-4 sm:px-6 text-xs uppercase tracking-wider text-slate-500 font-bold whitespace-nowrap">Colleague</th>
                <th className="py-3.5 px-4 sm:px-6 text-xs uppercase tracking-wider text-slate-500 font-bold hidden md:table-cell">Department</th>
                <th className="py-3.5 px-4 sm:px-6 text-xs uppercase tracking-wider text-slate-500 font-bold">Contact Links</th>
                <th className="py-3.5 px-4 sm:px-6 text-xs uppercase tracking-wider text-slate-500 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {team.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <Building2 className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No team members added yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Add colleagues so candidates can contact them for support.</p>
                  </td>
                </tr>
              ) : (
                team.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                          {member.name ? member.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'TM'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{member.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{member.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 hidden md:table-cell">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {member.department}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 flex-wrap">
                        {member.email && (
                          <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 text-xs text-slate-650 hover:text-indigo-600 transition-colors font-medium">
                            <Mail className="h-4 w-4 shrink-0 text-slate-400" /> <span>{member.email}</span>
                          </a>
                        )}
                        {member.linkedin && (
                          <a href={member.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-slate-650 hover:text-indigo-600 transition-colors font-medium">
                            <Globe className="h-4 w-4 shrink-0 text-slate-400" /> <span>LinkedIn ↗</span>
                          </a>
                        )}
                        {member.slack && (
                          <a href={member.slack} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-slate-650 hover:text-indigo-600 transition-colors font-medium">
                            <MessageCircle className="h-4 w-4 shrink-0 text-slate-400" /> <span>Slack ↗</span>
                          </a>
                        )}
                        {!member.email && !member.linkedin && !member.slack && (
                          <span className="text-xs text-slate-400 italic">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(member)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(member.id)} className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
