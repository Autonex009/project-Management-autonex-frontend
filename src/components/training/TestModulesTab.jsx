import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  BookOpen,
  Camera,
  Layers,
  Clock,
  Award,
  ShieldCheck,
  Edit2,
  Trash2,
  Play,
  Users2,
  CheckCircle2,
  Calendar,
  X,
  Sparkles,
  GripVertical,
  AlertTriangle,
  ExternalLink,
  Search,
  Check,
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  GraduationCap,
  FileText,
  Video,
} from "lucide-react";
import Button from "../ui/Button";
import SearchBar from "../ui/SearchBar";
import Modal from "../ui/Modal";
import Spinner from "../ui/LoadingSpinner";
import toast from "react-hot-toast";
import { onboardingApi } from "../../services/api";
import ModuleEditorDrawer from "../admin/ModuleEditorDrawer";

export default function TestModulesTab({
  modules,
  clusters,
  onUpdateModules,
  onUpdateClusters,
  onLaunchTestDemo,
}) {
  const [moduleEditorId, setModuleEditorId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Sub-view toggle: "courses" vs "assessments"
  const [subView, setSubView] = useState("courses");

  // Selected Course Drilldown: null (showing Course Cards) or Course Object (showing image copy 8.png)
  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get("course") || null);

  // Sync selectedCourseId with URL param
  const handleSelectCourse = (courseId) => {
    setSelectedCourseId(courseId);
    const newParams = new URLSearchParams(searchParams);
    if (courseId) {
      newParams.set("course", courseId);
    } else {
      newParams.delete("course");
    }
    setSearchParams(newParams);
  };

  // --- Training Courses Catalog (Top-Level Courses) ---
  const [coursesList, setCoursesList] = useState([
    {
      id: "onboarding-core",
      title: "Onboarding Training Module",
      description: "Complete foundational onboarding program for new annotators covering platform orientation, annotation bay tools, precision guidelines, and rejected task workflows.",
      category: "New Joiner Onboarding",
      status: "Published",
      isPrimaryOnboarding: true, // This course contains the 12 live database modules
      assignedClusters: ["Nov 2025 Onboarding Interns"],
      createdAt: "2026-11-01",
    },
    {
      id: "robotics-advanced",
      title: "Robotics & Sensor Fusion Training",
      description: "Advanced post-onboarding training for 3D bounding boxes, multi-camera tracking, LiDAR projection, and autonomous vehicle annotation.",
      category: "Specialized Role",
      status: "Published",
      isPrimaryOnboarding: false,
      modulesCount: 4,
      sectionsCount: 8,
      assignedClusters: ["Full-Time Annotators Q4"],
      createdAt: "2026-11-10",
    },
    {
      id: "qa-reviewer-mastery",
      title: "Quality Reviewer & Audit Masterclass",
      description: "Curriculum for senior annotators transitioning into reviewer and team lead roles with focus on precision metrics and SLA enforcement.",
      category: "Leadership & QA",
      status: "Draft",
      isPrimaryOnboarding: false,
      modulesCount: 5,
      sectionsCount: 10,
      assignedClusters: [],
      createdAt: "2026-11-15",
    },
  ]);

  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [newCourseForm, setNewCourseForm] = useState({
    title: "",
    description: "",
    category: "General Training",
    status: "Published",
  });

  // --- Real Backend Onboarding Modules (The 12 Modules shown in image copy 8.png) ---
  const [realModules, setRealModules] = useState([]);
  const [loadingRealModules, setLoadingRealModules] = useState(true);
  const [coursesSearchQuery, setCoursesSearchQuery] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [pendingDeleteCourse, setPendingDeleteCourse] = useState(null);

  const fetchRealModules = async () => {
    try {
      setLoadingRealModules(true);
      const data = await onboardingApi.getModules(true); // include drafts
      setRealModules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch onboarding modules:", err);
    } finally {
      setLoadingRealModules(false);
    }
  };

  useEffect(() => {
    fetchRealModules();
  }, []);

  const confirmDeleteCourse = async () => {
    if (!pendingDeleteCourse) return;
    const { id } = pendingDeleteCourse;
    try {
      await onboardingApi.deleteModule(id);
      setRealModules((prev) => prev.filter((m) => m.id !== id));
      toast.success("Module deleted successfully.");
    } catch (err) {
      console.error("Failed to delete module:", err);
      toast.error("Error deleting module.");
    } finally {
      setPendingDeleteCourse(null);
    }
  };

  const handleDropCourse = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...realModules];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    const previous = realModules;
    setDragIndex(null);
    setDragOverIndex(null);
    setRealModules(reordered); // optimistic update

    onboardingApi.reorderModules(reordered.map((m) => m.id)).catch((err) => {
      console.error("Failed to reorder modules:", err);
      toast.error("Failed to save new order.");
      setRealModules(previous); // revert on failure
    });
  };

  const isSearchingCourses = coursesSearchQuery.trim().length > 0;
  const filteredModulesList = realModules.filter(
    (m) =>
      (m.title || "").toLowerCase().includes(coursesSearchQuery.toLowerCase()) ||
      (m.description || "").toLowerCase().includes(coursesSearchQuery.toLowerCase()),
  );

  // --- Assessment Tests State (image copy 9.png) ---
  const [assessmentsSearchQuery, setAssessmentsSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [editingModule, setEditingModule] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newModuleForm, setNewModuleForm] = useState({
    title: "",
    description: "",
    type: "Pre-Test",
    durationMinutes: 25,
    passingScore: 80,
    preset: "Strict",
  });

  const filterTypes = ["All", "Pre-Test", "Post-Test", "Course Module", "Skill Check"];

  const filteredAssessments = modules.filter((m) => {
    const matchesSearch =
      (m.title || "").toLowerCase().includes(assessmentsSearchQuery.toLowerCase()) ||
      (m.description || "").toLowerCase().includes(assessmentsSearchQuery.toLowerCase());
    const matchesType = selectedType === "All" || m.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleOpenEditAssessment = (mod) => {
    setEditingModule(mod);
    setEditFormData({
      title: mod.title,
      description: mod.description || "",
      durationMinutes: mod.durationMinutes || 25,
      passingScore: mod.passingScore || 80,
      type: mod.type || "Pre-Test",
      preset: mod.proctoring?.preset || "Strict",
      cameraRequired: mod.proctoring?.cameraRequired ?? true,
      tabSwitchLimit: mod.proctoring?.tabSwitchLimit ?? 3,
    });
  };

  const handleSaveAssessmentEdit = () => {
    if (!editingModule || !editFormData.title.trim()) return;
    const updated = modules.map((m) => {
      if (m.id === editingModule.id) {
        return {
          ...m,
          title: editFormData.title.trim(),
          description: editFormData.description.trim(),
          durationMinutes: parseInt(editFormData.durationMinutes, 10) || 20,
          passingScore: parseInt(editFormData.passingScore, 10) || 80,
          type: editFormData.type,
          proctoring: {
            ...m.proctoring,
            preset: editFormData.preset,
            cameraRequired: editFormData.cameraRequired,
            tabSwitchLimit: parseInt(editFormData.tabSwitchLimit, 10) || 3,
          },
        };
      }
      return m;
    });
    onUpdateModules(updated);
    toast.success(`Updated "${editFormData.title.trim()}".`);
    setEditingModule(null);
  };

  // --- Assign to Cluster Modal State ---
  const [assigningItem, setAssigningItem] = useState(null); // { id, title, isCourse: boolean }
  const [selectedClusterId, setSelectedClusterId] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("2026-11-28");

  const handleConfirmAssignment = () => {
    if (!selectedClusterId) {
      toast.error("Please select a target cluster.");
      return;
    }
    const targetCluster = clusters.find((c) => c.id === parseInt(selectedClusterId, 10));
    if (!targetCluster) return;

    if (onUpdateClusters) {
      const updatedClusters = clusters.map((c) => {
        if (c.id === targetCluster.id) {
          const prevAssigned = c.assignedTests || [];
          if (!prevAssigned.includes(assigningItem.title)) {
            return {
              ...c,
              assignedTests: [...prevAssigned, assigningItem.title],
              deadline: assignmentDeadline,
            };
          }
        }
        return c;
      });
      onUpdateClusters(updatedClusters);
    }

    if (!assigningItem.isCourse) {
      const updatedModules = modules.map((m) => {
        if (m.id === assigningItem.id) {
          const existing = m.assignedClusters || [];
          if (!existing.includes(targetCluster.name)) {
            return { ...m, assignedClusters: [...existing, targetCluster.name] };
          }
        }
        return m;
      });
      onUpdateModules(updatedModules);
    }

    toast.success(`Assigned "${assigningItem.title}" to ${targetCluster.name} (Deadline: ${assignmentDeadline})`);
    setAssigningItem(null);
    setSelectedClusterId("");
  };

  const handleCreateCourse = () => {
    if (!newCourseForm.title.trim()) {
      toast.error("Please enter a course title.");
      return;
    }
    const createdCourse = {
      id: `course-${Date.now()}`,
      title: newCourseForm.title.trim(),
      description: newCourseForm.description.trim() || "Fresh training module designed for team upskilling.",
      category: newCourseForm.category,
      status: newCourseForm.status,
      isPrimaryOnboarding: false,
      modulesCount: 0,
      sectionsCount: 0,
      assignedClusters: [],
      createdAt: new Date().toISOString().split("T")[0],
    };
    setCoursesList([createdCourse, ...coursesList]);
    toast.success(`Created training module: "${createdCourse.title}"`);
    setShowCreateCourseModal(false);
    setNewCourseForm({
      title: "",
      description: "",
      category: "General Training",
      status: "Published",
    });
  };

  const handleCreateAssessment = () => {
    if (!newModuleForm.title.trim()) {
      toast.error("Please provide a test module title.");
      return;
    }

    const createdModule = {
      id: Date.now(),
      title: newModuleForm.title.trim(),
      description: newModuleForm.description.trim() || "Standard assessment evaluating candidate proficiency.",
      type: newModuleForm.type,
      durationMinutes: parseInt(newModuleForm.durationMinutes, 10) || 25,
      questionsCount: 10,
      passingScore: parseInt(newModuleForm.passingScore, 10) || 80,
      proctoring: {
        cameraRequired: newModuleForm.preset === "Strict",
        tabSwitchLimit: newModuleForm.preset === "Strict" ? 2 : newModuleForm.preset === "Standard" ? 5 : 99,
        preset: newModuleForm.preset,
      },
      assignedClusters: [],
      status: "Published",
      createdAt: new Date().toISOString().split("T")[0],
      questions: [
        {
          id: 1,
          question: `Sample question 1 for ${newModuleForm.title.trim()}?`,
          options: ["Correct standard protocol", "Alternative option B", "Non-compliant method", "Inconclusive approach"],
          correctIndex: 0,
          explanation: "Reference standard SOP documentation section 2.1."
        },
        {
          id: 2,
          question: "When encountering severe payload ambiguity, what is the required escalation path?",
          options: ["Self-resolve using intuition", "Escalate immediately to active Team Lead", "Skip task silently", "Reject full batch"],
          correctIndex: 1,
          explanation: "Ambiguities exceeding 40% require immediate TL escalation."
        }
      ]
    };

    onUpdateModules([createdModule, ...modules]);
    toast.success(`Created assessment test: "${createdModule.title}"`);
    setShowCreateModal(false);
    setNewModuleForm({
      title: "",
      description: "",
      type: "Pre-Test",
      durationMinutes: 25,
      passingScore: 80,
      preset: "Strict",
    });
  };

  const activeCourse = coursesList.find((c) => c.id === selectedCourseId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* View Switcher Header: Training Course Modules vs Assessment Tests */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 bg-slate-100/90 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSubView("courses");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              subView === "courses"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60 ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span>Training Course Modules</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {coursesList.length} Courses
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubView("assessments");
              handleSelectCourse(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              subView === "assessments"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60 ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Assessment Tests & MCQs</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              {modules.length} Tests
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subView === "courses" ? (
            selectedCourseId ? (
              <Button size="md" onClick={() => setModuleEditorId("new")} className="gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" /> Add Lesson / Module
              </Button>
            ) : (
              <Button size="md" onClick={() => setShowCreateCourseModal(true)} className="gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" /> Create Training Module
              </Button>
            )
          ) : (
            <Button size="md" onClick={() => setShowCreateModal(true)} className="gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" /> Create Assessment Test
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUB-VIEW 1: TRAINING COURSE MODULES                            */}
      {/* ============================================================== */}
      {subView === "courses" && (
        <div className="space-y-4">
          {/* LEVEL 1: COURSE CARDS VIEW (When no course is clicked) */}
          {!selectedCourseId && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-indigo-600" />
                    Company Training Courses & Modules
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any course card below to view and edit its internal curriculum, lessons, video lectures, and quizzes.
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowCreateCourseModal(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Create Training Module
                </Button>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {coursesList.map((course) => {
                  const isPrimary = course.isPrimaryOnboarding;
                  const totalLessons = isPrimary ? realModules.length : (course.modulesCount || 0);
                  const totalSections = isPrimary
                    ? realModules.reduce((acc, m) => acc + (m.sections?.length || 0), 0)
                    : (course.sectionsCount || 0);

                  return (
                    <div
                      key={course.id}
                      onClick={() => handleSelectCourse(course.id)}
                      className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-lg hover:border-indigo-400 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
                    >
                      {/* Top Accent bar for primary onboarding */}
                      {isPrimary && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
                      )}

                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <BookOpen className="h-6 w-6" />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                (course.status || "").toLowerCase() === "published"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {course.status}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {course.category}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-lg mt-1 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {course.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>
                        </div>

                        {/* Rich Badges */}
                        <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] font-semibold">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5 text-slate-500" />
                            <strong>{totalLessons}</strong> Lessons / Modules
                          </span>

                          <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-100 flex items-center gap-1">
                            <Video className="h-3.5 w-3.5 text-sky-600" />
                            <strong>{totalSections}</strong> Sections
                          </span>

                          {course.assignedClusters?.length > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1">
                              <Users2 className="h-3.5 w-3.5 text-purple-600" />
                              {course.assignedClusters.length} Clusters
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1">
                          Open Modules ({totalLessons})
                          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningItem({ id: course.id, title: course.title, isCourse: true });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEVEL 2: DRILLDOWN VIEW (The exact UI from image copy 8.png with the 12 modules) */}
          {selectedCourseId && (
            <div className="space-y-4 animate-fade-in">
              {/* Back Breadcrumb Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectCourse(null)}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 flex items-center gap-1 text-xs font-bold"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Courses</span>
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">Course:</span>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {activeCourse?.title || "Onboarding Training Module"}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {realModules.length} Modules
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click any row to open its video lessons, documents, and quizzes in the editor. Drag rows to reorder.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAssigningItem({ id: activeCourse?.id || "onboarding", title: activeCourse?.title || "Onboarding Training Module", isCourse: true })}
                    className="gap-1.5"
                  >
                    <Users2 className="h-3.5 w-3.5 text-indigo-600" /> Assign to Cluster
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setModuleEditorId("new")}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Add Module
                  </Button>
                </div>
              </div>

              {/* Exact UI from image copy 8.png */}
              <div className="bg-white p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm font-bold text-slate-900">
                      Module Curriculum Roster
                    </span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <SearchBar
                      placeholder="Search modules..."
                      value={coursesSearchQuery}
                      onChange={setCoursesSearchQuery}
                      className="w-full sm:w-64"
                    />
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold whitespace-nowrap">
                      {filteredModulesList.length} / {realModules.length} Modules
                    </span>
                  </div>
                </div>

                {loadingRealModules ? (
                  <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
                    <Spinner size="md" color="indigo" text="Loading onboarding modules..." />
                  </div>
                ) : filteredModulesList.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 italic bg-slate-50/50 rounded-xl">
                    No modules found. Start by creating one!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {isSearchingCourses && (
                      <p className="text-xs text-slate-400 italic pb-1">
                        Clear search to drag and reorder modules.
                      </p>
                    )}
                    {filteredModulesList.map((m, i) => (
                      <div
                        key={m.id}
                        draggable={!isSearchingCourses}
                        onDragStart={(e) => {
                          setDragIndex(i);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverIndex !== i) setDragOverIndex(i);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropCourse(i);
                        }}
                        onDragEnd={() => {
                          setDragIndex(null);
                          setDragOverIndex(null);
                        }}
                        role="button"
                        tabIndex={0}
                        onClick={() => setModuleEditorId(m.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setModuleEditorId(m.id);
                          }
                        }}
                        title="Open module to edit"
                        className={`group bg-white border rounded-2xl p-4 transition-all flex items-center gap-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:border-indigo-400 hover:shadow-sm ${
                          dragOverIndex === i && dragIndex !== null && dragIndex !== i
                            ? "border-indigo-400 border-dashed bg-indigo-50/40"
                            : "border-slate-200/80"
                        } ${dragIndex === i ? "opacity-40" : ""}`}
                      >
                        {!isSearchingCourses && (
                          <span
                            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0"
                            title="Drag to reorder"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="h-5 w-5" />
                          </span>
                        )}

                        <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-100">
                          <BookOpen className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {m.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5">
                            {m.description || "No description provided."}
                          </p>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0">
                          <Layers className="h-4 w-4 text-slate-400" />
                          {m.sections?.length || 0} Sections
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                            (m.status || "").toLowerCase() === "published"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {m.status || "DRAFT"}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningItem({ id: m.id, title: m.title, isCourse: true });
                          }}
                          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200 rounded-lg transition-colors shrink-0"
                          title="Assign to a Cluster"
                        >
                          <Users2 className="h-3.5 w-3.5" /> Assign to Cluster
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDeleteCourse({ id: m.id, title: m.title });
                          }}
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
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 2: ASSESSMENT TESTS & MCQS (image copy 9.png)          */}
      {/* ============================================================== */}
      {subView === "assessments" && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <SearchBar
              placeholder="Search assessment tests, topics, or MCQs..."
              value={assessmentsSearchQuery}
              onChange={setAssessmentsSearchQuery}
              className="flex-1"
            />

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {filterTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedType === t
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssessments.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                <BookOpen className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No assessment tests found.</p>
                <p className="text-xs text-slate-400 mt-1">Try resetting the search or filter type.</p>
              </div>
            ) : (
              filteredAssessments.map((mod) => (
                <div
                  key={mod.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-base leading-snug">
                            {mod.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                              {mod.type}
                            </span>
                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {mod.durationMinutes} mins
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              • Passing: {mod.passingScore}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenEditAssessment(mod)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit assessment settings"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {mod.description}
                    </p>

                    {/* Proctoring Badges */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {mod.proctoring?.cameraRequired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Camera className="h-3 w-3" /> Camera Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600">
                          No Camera
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <ShieldCheck className="h-3 w-3 text-amber-600" />
                        Max {mod.proctoring?.tabSwitchLimit} Tab Switches
                      </span>

                      {mod.assignedClusters?.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Users2 className="h-3 w-3" />
                          {mod.assignedClusters.length} Clusters Assigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onLaunchTestDemo(mod)}
                      className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-none"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Candidate Demo
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditAssessment(mod)}
                        className="gap-1 text-slate-600"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> View / Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssigningItem({ id: mod.id, title: mod.title, isCourse: false })}
                        className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        <Users2 className="h-3.5 w-3.5" /> Assign to Cluster
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SHARED MODALS                                                  */}
      {/* ============================================================== */}

      {/* Create New Training Course Modal */}
      {showCreateCourseModal && (
        <Modal isOpen onClose={() => setShowCreateCourseModal(false)} size="md">
          <Modal.Header>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Create Fresh Training Module / Course
              </h3>
            </div>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Training Module Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Full-Time Annotator Advanced Certification"
                value={newCourseForm.title}
                onChange={(e) => setNewCourseForm({ ...newCourseForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={newCourseForm.category}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                >
                  <option value="New Joiner Onboarding">New Joiner Onboarding</option>
                  <option value="Specialized Role">Specialized Role</option>
                  <option value="General Training">General Training</option>
                  <option value="Leadership & QA">Leadership & QA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={newCourseForm.status}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Training curriculum overview, goals, and who should take it..."
                value={newCourseForm.description}
                onChange={(e) => setNewCourseForm({ ...newCourseForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" onClick={() => setShowCreateCourseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCourse}>
              Create Training Module
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Delete Course Confirmation Modal */}
      {pendingDeleteCourse && (
        <Modal isOpen onClose={() => setPendingDeleteCourse(null)} size="md">
          <Modal.Body>
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Delete module?
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  You are about to delete{" "}
                  <span className="font-semibold text-slate-700">
                    "{pendingDeleteCourse.title}"
                  </span>
                  . This will permanently remove its video sections and quiz data.
                </p>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" onClick={() => setPendingDeleteCourse(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteCourse}>
              Delete Module
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Assign to Cluster Modal */}
      {assigningItem && (
        <Modal isOpen onClose={() => setAssigningItem(null)} size="md">
          <Modal.Header>
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Assign to Cluster
              </h3>
            </div>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                {assigningItem.isCourse ? "Training Course" : "Assessment Test"}
              </span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {assigningItem.title}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Cluster *
              </label>
              <select
                value={selectedClusterId}
                onChange={(e) => setSelectedClusterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Select a cluster...</option>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.memberCount} members)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Completion Deadline
              </label>
              <input
                type="date"
                value={assignmentDeadline}
                onChange={(e) => setAssignmentDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Automated daily Slack reminders will trigger 48h and 24h prior to this deadline.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" onClick={() => setAssigningItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAssignment}>
              Confirm Assignment
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Edit Assessment Details Modal */}
      {editingModule && editFormData && (
        <Modal isOpen onClose={() => setEditingModule(null)} size="lg">
          <Modal.Header>
            <div className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">
                View & Edit Assessment
              </h3>
            </div>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assessment Title
              </label>
              <input
                type="text"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Type
                </label>
                <select
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                >
                  <option value="Pre-Test">Pre-Test</option>
                  <option value="Post-Test">Post-Test</option>
                  <option value="Course Module">Course Module</option>
                  <option value="Skill Check">Skill Check</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  value={editFormData.passingScore}
                  onChange={(e) => setEditFormData({ ...editFormData, passingScore: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Proctoring Restrictions
              </label>
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.cameraRequired}
                    onChange={(e) => setEditFormData({ ...editFormData, cameraRequired: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800">Webcam Camera Required</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Max tab switches:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editFormData.tabSwitchLimit}
                    onChange={(e) => setEditFormData({ ...editFormData, tabSwitchLimit: e.target.value })}
                    className="w-16 px-2 py-1 rounded border border-slate-200 text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Questions list preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Included Questions ({editingModule.questions?.length || 0})
              </label>
              <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                {editingModule.questions?.map((q, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 text-xs">
                    <p className="font-semibold text-slate-900">{idx + 1}. {q.question}</p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                      ✓ Correct: {q.options?.[q.correctIndex]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" onClick={() => setEditingModule(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssessmentEdit}>
              Save Changes
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Create New Assessment Modal */}
      {showCreateModal && (
        <Modal isOpen onClose={() => setShowCreateModal(false)} size="lg">
          <Modal.Header>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Create Assessment Test
              </h3>
            </div>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Test Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Robotics Bay Refresher Post-Test"
                value={newModuleForm.title}
                onChange={(e) => setNewModuleForm({ ...newModuleForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Type
                </label>
                <select
                  value={newModuleForm.type}
                  onChange={(e) => setNewModuleForm({ ...newModuleForm, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                >
                  <option value="Pre-Test">Pre-Test</option>
                  <option value="Post-Test">Post-Test</option>
                  <option value="Course Module">Course Module</option>
                  <option value="Skill Check">Skill Check</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Duration (mins)
                </label>
                <input
                  type="number"
                  value={newModuleForm.durationMinutes}
                  onChange={(e) => setNewModuleForm({ ...newModuleForm, durationMinutes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  value={newModuleForm.passingScore}
                  onChange={(e) => setNewModuleForm({ ...newModuleForm, passingScore: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Evaluation scope and target certification readiness..."
                value={newModuleForm.description}
                onChange={(e) => setNewModuleForm({ ...newModuleForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Proctoring & Anti-Cheat Preset
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "Strict", label: "Strict (High-Stakes)", desc: "Webcam ON + Max 2 Tab Switches" },
                  { id: "Standard", label: "Standard (Routine)", desc: "Tab Switch Warning (Max 5)" },
                  { id: "Open", label: "Open Practice", desc: "No camera or tab restrictions" }
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setNewModuleForm({ ...newModuleForm, preset: p.id })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      newModuleForm.preset === p.id
                        ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{p.label}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssessment}>
              Create Module
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {moduleEditorId && (
        <ModuleEditorDrawer
          key={moduleEditorId}
          moduleId={moduleEditorId === "new" ? null : moduleEditorId}
          onClose={() => setModuleEditorId(null)}
          onSaved={fetchRealModules}
        />
      )}
    </div>
  );
}
