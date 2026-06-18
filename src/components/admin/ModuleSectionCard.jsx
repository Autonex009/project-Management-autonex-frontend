import React, { useState } from 'react';
import { GripVertical, Trash2, Video, FileText, CheckCircle2, Circle, Plus, Upload } from 'lucide-react';
import { onboardingApi } from '../../services/api';

export default function ModuleSectionCard({ index, section, onChange, onRemove }) {
  const [showDocForm, setShowDocForm] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('PDF');
  const [docUrl, setDocUrl] = useState('');

  const updateField = (field, value) => {
    onChange({ ...section, [field]: value });
  };

  const hasVideo = Boolean(section.videoUrl && section.videoUrl.trim());
  const hasQuestions = Array.isArray(section.questions) && section.questions.length > 0;

  const addQuestion = () => {
    onChange({
      ...section,
      questions: [
        ...section.questions,
        { id: Math.random().toString(36).substring(7), question: '', options: ['', '', '', ''], correctIndex: 0 }
      ]
    });
  };

  const updateQuestion = (qId, field, value) => {
    onChange({
      ...section,
      questions: section.questions.map(q => q.id === qId ? { ...q, [field]: value } : q)
    });
  };

  const updateOption = (qId, optIndex, value) => {
    onChange({
      ...section,
      questions: section.questions.map(q => {
        if (q.id === qId) {
          const newOpts = [...q.options];
          newOpts[optIndex] = value;
          return { ...q, options: newOpts };
        }
        return q;
      })
    });
  };

  const removeQuestion = (qId) => {
    const remaining = section.questions.filter(q => q.id !== qId);
    onChange({
      ...section,
      questions: remaining,
      ...(remaining.length === 0 ? { quizPassingScore: 0 } : {})
    });
  };

  const handleAddDocument = () => {
    if (!docTitle.trim() || !docUrl.trim()) return;
    updateField('document', { title: docTitle, type: docType, url: docUrl });
    setShowDocForm(false);
    setDocTitle(''); setDocType('PDF'); setDocUrl('');
  };

  const handleQuizFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Parse locally using xlsx
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      
      const newQuestions = rows.map((row) => ({
        id: Math.random().toString(36).substring(7),
        question: row.question?.toString() || '',
        options: [
          row.option1?.toString() || '',
          row.option2?.toString() || '',
          row.option3?.toString() || '',
          row.option4?.toString() || ''
        ],
        correctIndex: parseInt(row.correctOption?.toString() || '1') - 1
      })).filter(q => q.question.trim());

      onChange({
        ...section,
        questions: [...section.questions, ...newQuestions]
      });
    } catch (err) {
      console.error('Failed to import quiz from Excel:', err);
      alert('Failed to parse Excel sheet. Ensure the file format matches the template.');
    }
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GripVertical className="h-5 w-5 text-slate-400 cursor-move" />
          <span className="font-semibold text-slate-700">#{index + 1}</span>
          <input type="text" value={section.title} onChange={e => updateField('title', e.target.value)}
            placeholder="Section Title" className="bg-transparent border-none font-semibold text-slate-900 focus:outline-none focus:ring-0 placeholder-slate-400 w-64" />
          <span className="text-red-500 font-bold" title="Required">*</span>
        </div>
        <button onClick={onRemove} className="text-red-500 hover:text-red-700 transition-colors p-1">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description <span className="text-red-500">*</span></label>
          <textarea value={section.description} onChange={e => updateField('description', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:border-indigo-500 focus:outline-none placeholder-slate-400"
            rows={2} placeholder="What will candidates learn in this section?" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Video className="h-4 w-4 text-slate-400"/> Video URL (Google Drive)</label>
            <input type="text" value={section.videoUrl} onChange={e => onChange({ ...section, videoUrl: e.target.value, ...(e.target.value.trim() ? {} : { videoDuration: '' }) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:border-indigo-500 focus:outline-none placeholder-slate-400"
              placeholder="https://drive.google.com/file/d/.../view" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${hasVideo ? 'text-slate-700' : 'text-slate-400'}`}>Duration</label>
            <input type="text" value={section.videoDuration} onChange={e => updateField('videoDuration', e.target.value)}
              disabled={!hasVideo}
              title={hasVideo ? '' : 'Add a video URL to set a duration'}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:border-indigo-500 focus:outline-none placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="e.g. 15 min" />
          </div>
        </div>

        <div title={hasQuestions ? '' : 'Add at least one quiz question below to set a passing score'}>
          <label className={`block text-sm font-medium mb-1 ${hasQuestions ? 'text-slate-700' : 'text-slate-400'}`}>Quiz Passing Marks (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={section.quizPassingScore || 0}
            onChange={e => updateField('quizPassingScore', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            disabled={!hasQuestions}
            title={hasQuestions ? '' : 'Add at least one quiz question below to set a passing score'}
            className="w-full md:w-56 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:border-indigo-500 focus:outline-none placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="0"
          />
          <p className="text-xs text-slate-400 mt-1">
            {hasQuestions ? 'Set `0` if you do not want a minimum passing score for this quiz.' : 'Add quiz questions below to enable a passing score.'}
          </p>
        </div>

        {/* Document Section — Real Inputs */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><FileText className="h-4 w-4 text-slate-400"/> Attached Document</label>
          {section.document ? (
            <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">{section.document.title}</span>
                <a href={section.document.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline truncate max-w-[250px]">{section.document.url}</a>
                <span className="text-xs text-slate-400 uppercase">{section.document.type}</span>
              </div>
              <button onClick={() => updateField('document', undefined)} className="text-sm text-red-500 hover:text-red-700 font-medium">Remove</button>
            </div>
          ) : showDocForm ? (
            <div className="p-3 border border-indigo-200 rounded-lg bg-indigo-50/30 space-y-2">
              <input type="text" value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Document Title (e.g. Employee Handbook)"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-indigo-500" />
              <input type="url" value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="Document URL (e.g. https://drive.google.com/file/d/...)"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-indigo-500" />
              <div className="flex gap-2 items-center">
                <select value={docType} onChange={e => setDocType(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white">
                  <option>PDF</option><option>DOCX</option><option>PPT</option><option>XLS</option><option>Link</option>
                </select>
                <button type="button" onClick={handleAddDocument} className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Add</button>
                <button type="button" onClick={() => setShowDocForm(false)} className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowDocForm(true)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              + Add Document
            </button>
          )}
        </div>

        {/* Quiz Questions */}
        <div>
          <div className="flex items-center justify-between mb-3 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-900">Quiz Questions</h4>
            <div className="flex items-center gap-2">
              <label className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer">
                <Upload className="h-3.5 w-3.5" /> Import from Excel
                <input type="file" accept=".xlsx,.xls" onChange={handleQuizFileImport} className="hidden" />
              </label>
              <a href={onboardingApi.getQuizSampleUrl()} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-slate-600 underline">
                Sample Template
              </a>
            </div>
          </div>
          
          <div className="space-y-4">
            {section.questions.map((q, qIdx) => (
              <div key={q.id || qIdx} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex justify-between gap-4 mb-3">
                  <input type="text" value={q.question} onChange={e => updateQuestion(q.id, 'question', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:border-indigo-500 focus:outline-none font-medium placeholder-slate-400"
                    placeholder={`Question ${qIdx + 1} *`} />
                  <button type="button" onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-700 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors">
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <button type="button" onClick={() => updateQuestion(q.id, 'correctIndex', optIdx)} className="focus:outline-none">
                        {q.correctIndex === optIdx ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-300 hover:text-slate-400" />
                        )}
                      </button>
                      <input type="text" value={opt} onChange={e => updateOption(q.id, optIdx, e.target.value)}
                        className={`flex-1 px-3 py-1.5 border rounded-md text-sm focus:outline-none transition-colors ${q.correctIndex === optIdx ? 'border-green-300 bg-green-50' : 'border-slate-300 focus:border-indigo-500'}`}
                        placeholder={`Option ${optIdx + 1} *`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <button type="button" onClick={addQuestion} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 group">
             <span className="flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full h-5 w-5 group-hover:bg-indigo-100 transition-colors"><Plus className="h-3 w-3" /></span>
             Add Question
          </button>
        </div>
      </div>
    </div>
  );
}
