import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, HelpCircle, FileText, ExternalLink, Check, Circle, CheckCircle, ArrowRight, Video } from 'lucide-react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { onboardingApi } from '../../services/api';
import toast from 'react-hot-toast';

const ModuleView = () => {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    
    const [moduleData, setModuleData] = useState(null);
    const [completedSections, setCompletedSections] = useState(new Set());
    const [activeTab, setActiveTab] = useState('content');
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showScoreModal, setShowScoreModal] = useState(false);
    const [modalData, setModalData] = useState(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;

    useEffect(() => {
        if (!userId || !moduleId) return;

        Promise.all([
            onboardingApi.getModule(moduleId),
            onboardingApi.getProgress(userId)
        ])
            .then(([moduleResult, progressResult]) => {
                if (moduleResult && moduleResult.sections) {
                    moduleResult.sections.sort((a, b) => a.order - b.order);
                }
                setModuleData(moduleResult);
                setCompletedSections(new Set(progressResult.map((p) => p.section_id)));
            })
            .catch((err) => {
                console.error('Failed to load module details:', err);
                if (err.response && err.response.status === 403) {
                    setError('This module is locked. You must complete the previous module and pass its quizzes before accessing this level.');
                } else {
                    setError('Could not load module training content.');
                }
            })
            .finally(() => setLoading(false));
    }, [userId, moduleId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-slate-500 font-medium">
                <Spinner size="md" color="emerald" text="Loading module lessons..." />
            </div>
        );
    }

    if (error || !moduleData) {
        return (
            <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 text-center font-medium">
                {error || 'Module not found.'}
            </div>
        );
    }

    // Determine the current active section (first uncompleted section, or the last one)
    const currentIndex = moduleData.sections.findIndex((s) => !completedSections.has(s.id));
    const activeSectionIndex = currentIndex === -1 ? moduleData.sections.length - 1 : currentIndex;
    const currentSection = moduleData.sections[activeSectionIndex];

    const getEmbeddedDriveUrl = (url) => {
        if (!url) return '';
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
        if (url.includes('/preview')) return url;
        if (url.includes('/view')) return url.replace('/view', '/preview');
        return url;
    };

    const parseOptions = (options) => {
        if (Array.isArray(options)) return options;
        try {
            return JSON.parse(options);
        } catch {
            return [];
        }
    };

    const handleMarkComplete = async (sectionId) => {
        try {
            await onboardingApi.recordProgress(moduleId, sectionId, userId);
            setCompletedSections(new Set([...completedSections, sectionId]));
            toast.success('Section completed successfully!');
            setActiveTab('content');
        } catch (e) {
            console.error('Failed to mark complete:', e);
            toast.error('Failed to update progress.');
        }
    };

    const handleAdvance = () => {
        const nextIdx = moduleData.sections.findIndex((s, idx) => idx > activeSectionIndex && !completedSections.has(s.id));
        if (nextIdx !== -1) {
            setLoading(true);
            onboardingApi.getModule(moduleId)
                .then(res => {
                    setModuleData(res);
                    setActiveTab('content');
                    setSelectedAnswers({});
                    setQuizSubmitted({});
                })
                .finally(() => setLoading(false));
        } else {
            navigate('/employee/onboarding');
        }
    };

    const handleQuizSubmit = async (sectionId) => {
        if (!currentSection || !currentSection.questions || currentSection.questions.length === 0) return;
        
        const answers = currentSection.questions.map((q) => ({
            question_id: q.id,
            chosen_index: selectedAnswers[q.id] ?? -1
        }));

        try {
            const result = await onboardingApi.submitQuiz(sectionId, answers, userId);
            const passingScore = Math.max(0, Math.min(100, Number(currentSection.quiz_passing_score ?? currentSection.quizPassingScore) || 0));
            const passed = result.score >= passingScore;
            
            setQuizSubmitted({
                ...quizSubmitted,
                [sectionId]: {
                    ...result,
                    passingScore,
                    passed
                }
            });

            setModalData({
                score: result.score,
                correctCount: result.correctCount,
                totalQuestions: result.totalQuestions || answers.length,
                passingScore,
                passed,
                sectionId
            });
            setShowScoreModal(true);

            if (passed) {
                await onboardingApi.recordProgress(moduleId, sectionId, userId);
                setCompletedSections(new Set([...completedSections, sectionId]));
            }
        } catch (e) {
            console.error('Quiz submit failed:', e);
            toast.error('Failed to submit quiz.');
        }
    };

    const handleRetakeQuiz = (sectionId) => {
        const nextAnswers = { ...selectedAnswers };
        currentSection?.questions?.forEach((q) => {
            delete nextAnswers[q.id];
        });
        setSelectedAnswers(nextAnswers);

        const nextSubmitted = { ...quizSubmitted };
        delete nextSubmitted[sectionId];
        setQuizSubmitted(nextSubmitted);
    };

    const totalSections = moduleData.sections.length;
    const totalCompleted = completedSections.size;
    const overallProgress = totalSections === 0 ? 0 : Math.round((totalCompleted / totalSections) * 100);
    const currentPassingScore = Math.max(0, Math.min(100, Number(currentSection?.quiz_passing_score ?? currentSection?.quizPassingScore) || 0));
    const answeredCurrentQuestions = currentSection?.questions?.filter((q) => selectedAnswers[q.id] !== undefined).length || 0;

    return (
        <div className="flex flex-col xl:flex-row min-h-[calc(100vh-4rem)] -m-6 lg:-m-8 bg-slate-50">
            {/* Main content pane */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-8 animate-in fade-in duration-500">
                <header className="mb-8">
                    <div className="flex items-center space-x-2 text-emerald-600 font-medium mb-3">
                        <button 
                            onClick={() => navigate('/employee/onboarding')} 
                            className="hover:text-emerald-700 cursor-pointer transition-colors p-1 rounded-lg hover:bg-slate-100 flex items-center"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs uppercase tracking-widest font-bold">{moduleData.title}</span>
                        <span className="h-px w-6 bg-slate-300"></span>
                        <span className="text-xs uppercase tracking-widest font-bold text-slate-400">Section {activeSectionIndex + 1} of {totalSections}</span>
                    </div>
                    {currentSection && (
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                            {currentSection.title}
                        </h1>
                    )}

                    {/* Assessment Link */}
                    {moduleData.assessment_url && (
                        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 w-full">
                            <Award className="w-8 h-8 text-amber-600 shrink-0 hidden sm:block" />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">Assessment Open</p>
                                <p className="text-xs text-amber-700 mt-0.5">Please take the official certification assessment for this module.</p>
                            </div>
                            <a
                                href={moduleData.assessment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto text-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 mt-2 sm:mt-0"
                            >
                                Start Assessment ↗
                            </a>
                        </div>
                    )}
                </header>

                {currentSection ? (
                    <>
                        {/* Tabs */}
                        <div className="flex space-x-6 border-b border-slate-200 mb-6">
                            <button 
                                onClick={() => setActiveTab('content')} 
                                className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                    activeTab === 'content' 
                                        ? 'border-b-2 border-emerald-500 text-emerald-600 font-bold' 
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Study Material
                            </button>
                            {currentSection.questions && currentSection.questions.length > 0 && (
                                <button 
                                    onClick={() => setActiveTab('quiz')} 
                                    className={`flex items-center gap-1.5 pb-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                        activeTab === 'quiz' 
                                            ? 'border-b-2 border-emerald-500 text-emerald-600 font-bold' 
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Quiz Check <HelpCircle className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Tab Contents */}
                        {activeTab === 'content' && (
                            <div className="space-y-8 pb-12">
                                {currentSection.video_url && (
                                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-md relative">
                                        <iframe 
                                            src={getEmbeddedDriveUrl(currentSection.video_url)} 
                                            className="absolute inset-0 w-full h-full"
                                            allow="autoplay" 
                                            allowFullScreen
                                            title="Video lesson player"
                                        />
                                    </div>
                                )}

                                <div className="space-y-4 text-slate-600 leading-relaxed text-sm bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                                    <h3 className="font-bold text-slate-800 text-base">Section Objective</h3>
                                    <p className="whitespace-pre-line">{currentSection.description}</p>
                                </div>

                                {currentSection.documents?.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reference Documents</h4>
                                        <div className="space-y-4">
                                            {currentSection.documents.map((doc) => (
                                                <div key={doc.id} className="flex flex-col bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                                                    <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 truncate max-w-md">{doc.title}</p>
                                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{doc.type}</p>
                                                            </div>
                                                        </div>
                                                        <a 
                                                            href={doc.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1"
                                                        >
                                                            Open ↗
                                                        </a>
                                                    </div>
                                                    <div className="w-full aspect-[4/3] relative bg-slate-50">
                                                        <iframe 
                                                            src={getEmbeddedDriveUrl(doc.url)} 
                                                            className="absolute inset-0 w-full h-full border-0"
                                                            allowFullScreen
                                                            title={doc.title}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'quiz' && currentSection.questions && (
                            <div className="bg-white rounded-2xl p-6 md:p-8 mb-8 border border-slate-200/60 shadow-sm animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <HelpCircle className="w-6 h-6 text-emerald-500" />
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-800">Quiz assessment</h2>
                                            <p className="text-xs text-slate-400">Passing score required: {currentPassingScore}%</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-8">
                                    {quizSubmitted[currentSection.id] ? (
                                        <div className={`${quizSubmitted[currentSection.id].passed ? 'bg-emerald-600' : 'bg-amber-600'} rounded-2xl p-6 text-center shadow-md text-white`}>
                                            <h3 className="text-xl font-bold mb-1">
                                                {quizSubmitted[currentSection.id].passed ? 'Quiz Cleared!' : 'Score Not Met'}
                                            </h3>
                                            <p className="text-white/80 text-sm mb-3">
                                                You scored <span className="font-bold text-white text-lg">{quizSubmitted[currentSection.id].score}%</span>.
                                            </p>
                                            <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-xl mb-4 text-xs font-bold uppercase">
                                                {quizSubmitted[currentSection.id].correctCount} of {quizSubmitted[currentSection.id].totalQuestions} answers correct
                                            </div>
                                            {!quizSubmitted[currentSection.id].passed && (
                                                <div className="mt-2">
                                                    <button
                                                        onClick={() => handleRetakeQuiz(currentSection.id)}
                                                        className="px-5 py-2.5 rounded-xl font-bold text-amber-800 bg-white hover:bg-slate-50 transition-colors text-xs uppercase"
                                                    >
                                                        Retry Quiz
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        currentSection.questions.map((q, i) => (
                                            <div key={q.id} className="space-y-4">
                                                <p className="text-sm font-semibold text-slate-800 flex items-start gap-1">
                                                    <span className="text-emerald-500 font-bold">{i + 1}.</span>
                                                    {q.question}
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                                                    {parseOptions(q.options).map((opt, optIdx) => {
                                                        const isSelected = selectedAnswers[q.id] === optIdx;
                                                        return (
                                                            <button 
                                                                key={optIdx}
                                                                onClick={() => setSelectedAnswers({ ...selectedAnswers, [q.id]: optIdx })}
                                                                className={`text-left p-4 rounded-xl transition-all relative pr-10 cursor-pointer text-xs ${
                                                                    isSelected 
                                                                        ? 'border-2 border-emerald-500 bg-emerald-50/20 text-emerald-700 font-bold' 
                                                                        : 'border border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-slate-700'
                                                                }`}
                                                            >
                                                                <span>{opt}</span>
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                                    {isSelected ? (
                                                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                                    ) : (
                                                                        <Circle className="w-4 h-4 text-slate-300" />
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Navigation Footer Actions */}
                        <footer className="flex justify-between items-center pt-6 border-t border-slate-200 mt-4">
                            {!completedSections.has(currentSection.id) && activeTab === 'content' && (!currentSection.questions || currentSection.questions.length === 0) ? (
                                <button 
                                    onClick={() => handleMarkComplete(currentSection.id)} 
                                    className="px-6 py-3 rounded-xl font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                                >
                                    Complete Section <Check className="w-4 h-4" />
                                </button>
                            ) : activeTab === 'quiz' && !quizSubmitted[currentSection.id] ? (
                                <Button variant="success" onClick={() => handleQuizSubmit(currentSection.id)} disabled={answeredCurrentQuestions < currentSection.questions.length} className="px-6 py-3 text-xs uppercase tracking-wider font-bold">
                                    Submit Quiz Answers
                                </Button>
                            ) : (
                                <div />
                            )}
                            
                            {completedSections.has(currentSection.id) && (
                                <Button variant="success" onClick={handleAdvance} className="px-6 py-3 text-xs uppercase tracking-wider font-bold shadow-md hover:shadow-lg">
                                    <span>{activeSectionIndex === moduleData.sections.length - 1 ? 'Finish Module' : 'Next Lesson'}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            )}
                        </footer>
                    </>
                ) : (
                    <div className="text-center py-10 text-slate-500">No lessons available in this module.</div>
                )}
            </div>

            {/* Sidebar module checklist tracker */}
            <aside className="w-full xl:w-72 bg-white border-t xl:border-t-0 xl:border-l border-slate-200 p-8 flex-shrink-0">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Lessons List</h4>
                <div className="space-y-0 relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-100" />
                    
                    {moduleData.sections.map((s, idx) => {
                        const isComplete = completedSections.has(s.id);
                        const isCurrent = activeSectionIndex === idx;

                        return (
                            <div key={s.id} className="relative pl-8 pb-8">
                                <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border z-10 text-[10px] font-bold ${
                                    isComplete 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : isCurrent 
                                            ? 'bg-white border-2 border-emerald-500 text-emerald-600' 
                                            : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}>
                                    {isComplete ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                </div>
                                <p className={`text-[10px] font-bold uppercase ${isComplete || isCurrent ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    Section {idx + 1}
                                </p>
                                <h5 className={`text-xs font-bold mt-0.5 ${isCurrent ? 'text-slate-900 font-extrabold' : 'text-slate-600'}`}>{s.title}</h5>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-semibold">Module Completion</span>
                            <span className="font-bold text-emerald-600">{overallProgress}%</span>
                        </div>
                        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${overallProgress}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Complete all lessons to clear this module and qualify for the final assessment.
                        </p>
                    </div>
                </div>
            </aside>

            {showScoreModal && modalData && (
                <Modal isOpen onClose={() => setShowScoreModal(false)} size="md">
                    <Modal.Body className="!p-8 text-center flex flex-col items-center">
                        <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-6 ${
                            modalData.passed 
                                ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100/50 animate-pulse' 
                                : 'bg-amber-50 text-amber-600 border-2 border-amber-100/50'
                        }`}>
                            {modalData.passed ? (
                                <Award className="w-10 h-10" />
                            ) : (
                                <HelpCircle className="w-10 h-10" />
                            )}
                        </div>

                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                            {modalData.passed ? 'Congratulations!' : 'Score Not Met'}
                        </h3>
                        
                        <p className="text-slate-500 text-sm mb-6 max-w-xs">
                            {modalData.passed 
                                ? 'You have successfully passed the section assessment check!' 
                                : 'You did not meet the minimum score required to pass this lesson.'}
                        </p>

                        <div className={`w-full rounded-2xl p-6 mb-6 ${
                            modalData.passed ? 'bg-emerald-50/50 border border-emerald-100/30' : 'bg-amber-50/50 border border-amber-100/30'
                        }`}>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                                Your Performance Score
                            </div>
                            <div className={`text-5xl font-extrabold tracking-tight ${
                                modalData.passed ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                                {modalData.score}%
                            </div>
                            <div className="text-xs font-semibold text-slate-500 mt-2">
                                {modalData.correctCount} of {modalData.totalQuestions} Correct
                            </div>
                            <div className="h-px bg-slate-200/60 my-3" />
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                Required Passing score: {modalData.passingScore}%
                            </div>
                        </div>

                        <div className="w-full space-y-2">
                            {modalData.passed ? (
                                <Button variant="success" onClick={() => { setShowScoreModal(false); handleAdvance(); }} className="w-full justify-center py-3.5 text-sm uppercase tracking-wide font-bold rounded-2xl shadow-md">
                                    {activeSectionIndex === moduleData.sections.length - 1 ? 'Finish Module' : 'Next Lesson'}
                                </Button>
                            ) : (
                                <>
                                    <Button variant="warning" onClick={() => { setShowScoreModal(false); handleRetakeQuiz(modalData.sectionId); }} className="w-full justify-center py-3.5 text-sm uppercase tracking-wide font-bold rounded-2xl shadow-md">
                                        Retry Quiz
                                    </Button>
                                    <button
                                        onClick={() => {
                                            setShowScoreModal(false);
                                            setActiveTab('content');
                                        }}
                                        className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm tracking-wide transition-all cursor-pointer uppercase"
                                    >
                                        Study Material
                                    </button>
                                </>
                            )}
                        </div>
                    </Modal.Body>
                </Modal>
            )}
        </div>
    );
};

export default ModuleView;
