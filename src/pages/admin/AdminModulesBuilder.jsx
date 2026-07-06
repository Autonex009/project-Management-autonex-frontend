import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, Plus, ArrowLeft, Link2, Loader2 } from 'lucide-react';
import Spinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import ModuleSectionCard from '../../components/admin/ModuleSectionCard';
import { onboardingApi } from '../../services/api';

export default function AdminModulesBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assessmentUrl, setAssessmentUrl] = useState('');
  const [status, setStatus] = useState('published');
  const [order, setOrder] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!editId);
  const [sections, setSections] = useState([]);

  // Load existing module if editing
  useEffect(() => {
    if (!editId) return;
    setIsLoading(true);
    onboardingApi.getModule(editId)
      .then(data => {
        setTitle(data.title || '');
        setDescription(data.description || '');
        setAssessmentUrl(data.assessment_url || '');
        setStatus(data.status?.toLowerCase() === 'draft' ? 'draft' : 'published');
        setOrder(data.order ?? 0);
        
        // Map sections from DB format to component format
        const mappedSections = (data.sections || []).map((s) => ({
          id: s.id,
          title: s.title || '',
          description: s.description || '',
          videoUrl: s.video_url || '',
          videoDuration: s.video_duration || '',
          quizPassingScore: s.quiz_passing_score ?? 0,
          document: s.documents?.[0] ? {
            title: s.documents[0].title,
            type: s.documents[0].type,
            url: s.documents[0].url
          } : undefined,
          questions: (s.questions || []).map((q) => {
            let opts = [];
            try { 
              opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; 
            } catch { 
              opts = q.options || []; 
            }
            return {
              id: q.id,
              question: q.question || '',
              options: opts.length === 4 ? opts : ['', '', '', ''],
              correctIndex: q.correct_option_index ?? 0
            };
          })
        }));
        setSections(mappedSections);
      })
      .catch(err => {
        console.error('Failed to load module:', err);
        toast.error('Failed to load module for editing.');
      })
      .finally(() => setIsLoading(false));
  }, [editId]);

  const addSection = () => {
    setSections([...sections, {
      id: Math.random().toString(36).substring(7),
      title: '',
      description: '',
      videoUrl: '',
      videoDuration: '',
      quizPassingScore: 0,
      questions: []
    }]);
  };

  const updateSection = (newData) => {
    setSections(sections.map((s) => s.id === newData.id ? newData : s));
  };

  const removeSection = (id) => {
    setSections(sections.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Module title is required.');
      return;
    }
    if (!description.trim()) {
      toast.error('Module description is required.');
      return;
    }

    // Validate sections and any quiz questions they contain
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section.title.trim()) {
        toast.error(`Section #${i + 1}: a title is required.`);
        return;
      }
      if (!section.description.trim()) {
        toast.error(`Section #${i + 1}: a description is required.`);
        return;
      }
      const questions = section.questions || [];
      for (let j = 0; j < questions.length; j++) {
        const q = questions[j];
        if (!q.question.trim()) {
          toast.error(`Section #${i + 1}, Question ${j + 1}: question text is required.`);
          return;
        }
        if ((q.options || []).some(opt => !opt.trim())) {
          toast.error(`Section #${i + 1}, Question ${j + 1}: all four options are required.`);
          return;
        }
      }
    }

    try {
      setIsSaving(true);

      const mappedSections = sections.map((sec, idx) => ({
        title: sec.title,
        description: sec.description,
        video_url: sec.videoUrl || null,
        video_duration: sec.videoDuration || null,
        quiz_passing_score: Number(sec.quizPassingScore) || 0,
        order: idx,
        documents: sec.document ? [{
          title: sec.document.title,
          type: sec.document.type,
          url: sec.document.url || '#'
        }] : [],
        questions: (sec.questions || []).map((q) => ({
          question: q.question,
          options: q.options,
          correct_option_index: Number(q.correctIndex) || 0
        }))
      }));

      const payload = {
        title,
        description,
        status: status.toUpperCase(), // 'PUBLISHED' or 'DRAFT'
        assessment_url: assessmentUrl || null,
        order: Number(order) || 0,
        sections: mappedSections
      };
      
      if (editId) {
        await onboardingApi.updateModule(editId, payload);
      } else {
        await onboardingApi.createModule(payload);
      }
      
      toast.success(editId ? 'Module updated successfully!' : 'Module created successfully!');
      navigate('/admin/modules');
    } catch (err) {
      console.error('Error saving module:', err);
      toast.error('Error saving module. Please make sure the backend is running.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span>Loading module data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="link" onClick={() => navigate('/admin/modules')} className="mb-4 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Back to Modules
        </Button>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {editId ? 'Edit Module' : 'Create Module'}
            </h2>
            <p className="text-sm text-slate-500">
              {editId ? 'Update this module\'s content and settings.' : 'Build interactive onboarding courses with real content.'}
            </p>
          </div>
          <Button size="lg" onClick={handleSave} disabled={isSaving} isLoading={isSaving}>
            {!isSaving && <><Save className="h-4 w-4" /> {editId ? 'Update Module' : 'Save Module'}</>}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Module Meta */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60 p-6 border-t-4 border-t-indigo-650">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Module Title <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-slate-900"
                placeholder="e.g. Welcome to the Company" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Description <span className="text-red-500">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-slate-900"
                rows={3} placeholder="Brief overview of what candidates will learn..." />
            </div>

            {/* Assessment URL */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Link2 className="h-4 w-4 text-indigo-500" /> Assessment Link (Optional)
              </label>
              <input type="url" value={assessmentUrl} onChange={e => setAssessmentUrl(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-slate-900"
                placeholder="https://your-assessment-portal.com/test/..." />
              <p className="text-xs text-slate-400 mt-1">Candidates will see a "Take Assessment" button that opens this link.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button type="button" onClick={() => setStatus('published')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${status === 'published' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Published
                </button>
                <button type="button" onClick={() => setStatus('draft')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${status === 'draft' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  Draft
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sections Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">Sections</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {sections.length} section(s)
            </span>
          </div>
        </div>

        {/* Sections List */}
        <div className="space-y-4">
          {sections.length === 0 && (
            <div className="text-center py-8 text-slate-400 italic border-2 border-dashed border-slate-200 rounded-2xl">
              No sections yet. Click "Add Section" below to start building your module.
            </div>
          )}
          {sections.map((section, idx) => (
            <div key={section.id}>
              <ModuleSectionCard
                index={idx}
                section={section}
                onChange={updateSection}
                onRemove={() => removeSection(section.id)}
              />
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button 
            type="button"
            onClick={addSection} 
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-350 rounded-2xl text-slate-500 font-semibold hover:border-indigo-400 hover:bg-indigo-50/30 hover:text-indigo-650 transition-all cursor-pointer"
          >
            <Plus className="h-5 w-5" /> Add Section
          </button>
        </div>
      </div>
    </div>
  );
}
