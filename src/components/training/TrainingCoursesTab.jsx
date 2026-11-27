import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  BookOpen,
  Trash2,
  Users2,
  GripVertical,
  ArrowLeft,
  ChevronRight,
  Edit2,
} from "lucide-react";
import Button from "../ui/Button";
import SearchBar from "../ui/SearchBar";
import Modal from "../ui/Modal";
import Spinner from "../ui/LoadingSpinner";
import DatePicker from "../ui/DatePicker";
import RowActionMenu from "../ui/RowActionMenu";
import toast from "react-hot-toast";
import { onboardingApi } from "../../services/api";
import { INITIAL_COURSES } from "../../mock/trainingMockData";
import Select from "./Select";
import { ui, plural } from "./trainingStyles";
import ModuleEditorDrawer from "../admin/ModuleEditorDrawer";

const CATEGORIES = [
  { value: "New Joiner Onboarding", label: "New joiner onboarding" },
  { value: "Specialized Role", label: "Specialized role" },
  { value: "General Training", label: "General training" },
  { value: "Leadership & QA", label: "Leadership and QA" },
];

const STATUS_OPTIONS = [
  { value: "Published", label: "Published", dot: "bg-emerald-500", hint: "Visible to learners" },
  { value: "Draft", label: "Draft", dot: "bg-amber-500", hint: "Admins only" },
];

const categoryLabel = (value) =>
  CATEGORIES.find((c) => c.value === value)?.label || value || "";

const isPublished = (status) => (status || "").toLowerCase() === "published";

const COURSE_COLS = "xl:grid-cols-[minmax(0,1fr)_192px_160px_128px]";

/** Small amber call-to-action for something actionable that is missing. */
function NeedsAction({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1.5 text-[13px] text-amber-700 hover:text-amber-800 transition-colors"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      {children}
    </button>
  );
}

/**
 * Publication strip — how much of the course is live. The share live is the
 * key figure (indigo); the bar is emerald; drafts still waiting are amber.
 */
function PublishedStrip({ published, total }) {
  const pct = total > 0 ? Math.round((published / total) * 100) : 0;
  const drafts = total - published;
  const allLive = total > 0 && drafts === 0;
  return (
    <div className="w-full sm:w-64">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-medium leading-none tabular-nums text-indigo-600">{pct}%</span>
        <span className="text-[13px] text-slate-500">
          live · <span className="tabular-nums text-slate-900">{published}</span> of{" "}
          <span className="tabular-nums">{total}</span> published
        </span>
      </div>
      <div
        className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden"
        role="img"
        aria-label={`${published} of ${total} modules published`}
      >
        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      {total > 0 && (
        <p className={`mt-1.5 text-xs tabular-nums ${allLive ? "text-emerald-700" : "text-amber-700"}`}>
          {allLive ? "Every module is live" : `${plural(drafts, "draft")} not yet visible to learners`}
        </p>
      )}
    </div>
  );
}

export default function TrainingCoursesTab({
  clusters,
  onUpdateClusters,
  coursesList: propCoursesList,
  onUpdateCoursesList,
  coursesSearchQuery = "",
  showCreateModal,
  setShowCreateModal,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected course drilldown: null (catalog) or courseId (curriculum)
  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get("course") || null);

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

  // Module editor drawer — driven by ?module=new|<id> so links can open it directly
  const moduleParam = searchParams.get("module");
  const openModuleEditor = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set("module", id);
    setSearchParams(next);
  };
  const closeModuleEditor = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("module");
      return next;
    });
  };

  // Top-level training courses catalog
  const [internalCoursesList, setInternalCoursesList] = useState(INITIAL_COURSES);
  const coursesList = propCoursesList || internalCoursesList;
  const setCoursesList = onUpdateCoursesList || setInternalCoursesList;

  const [internalShowCreateModal, setInternalShowCreateModal] = useState(false);
  const showCreateCourseModal = showCreateModal !== undefined ? showCreateModal : internalShowCreateModal;
  const setShowCreateCourseModal = setShowCreateModal || setInternalShowCreateModal;

  const [newCourseForm, setNewCourseForm] = useState({
    title: "",
    description: "",
    category: "New Joiner Onboarding",
    status: "Published",
  });

  // --- Real backend onboarding modules ---
  const [realModules, setRealModules] = useState([]);
  const [loadingRealModules, setLoadingRealModules] = useState(true);
  const [curriculumSearchQuery, setCurriculumSearchQuery] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [pendingDeleteCourse, setPendingDeleteCourse] = useState(null);

  const fetchRealModules = async () => {
    try {
      setLoadingRealModules(true);
      const data = await onboardingApi.getModules(true); // include drafts
      setRealModules(Array.isArray(data) && data.length > 0 ? data : []);
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
      toast.success("Module deleted");
    } catch (err) {
      console.error("Failed to delete module:", err);
      toast.error("Couldn't delete the module");
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
    setRealModules(reordered);

    onboardingApi.reorderModules(reordered.map((m) => m.id)).catch((err) => {
      console.error("Failed to reorder modules:", err);
      toast.error("Couldn't save the new order");
      setRealModules(previous);
    });
  };

  const isSearchingCurriculum = curriculumSearchQuery.trim().length > 0;
  const filteredModulesList = realModules.filter(
    (m) =>
      (m.title || "").toLowerCase().includes(curriculumSearchQuery.toLowerCase()) ||
      (m.description || "").toLowerCase().includes(curriculumSearchQuery.toLowerCase()),
  );

  const filteredCoursesList = coursesList.filter(
    (c) =>
      (c.title || "").toLowerCase().includes((coursesSearchQuery || "").toLowerCase()) ||
      (c.description || "").toLowerCase().includes((coursesSearchQuery || "").toLowerCase()) ||
      (c.category || "").toLowerCase().includes((coursesSearchQuery || "").toLowerCase()),
  );

  // --- Assign to cluster modal state ---
  const [assigningItem, setAssigningItem] = useState(null);
  const [selectedClusterId, setSelectedClusterId] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("2026-11-28");

  const handleConfirmAssignment = () => {
    if (!selectedClusterId) {
      toast.error("Choose a cluster to assign this to");
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

    toast.success(`Assigned to ${targetCluster.name}, due ${assignmentDeadline}`);
    setAssigningItem(null);
    setSelectedClusterId("");
  };

  const handleCreateCourse = () => {
    if (!newCourseForm.title.trim()) {
      toast.error("Give the module a title");
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
    toast.success(`Created “${createdCourse.title}”`);
    setShowCreateCourseModal(false);
    setNewCourseForm({
      title: "",
      description: "",
      category: "New Joiner Onboarding",
      status: "Published",
    });
  };

  const activeCourse = coursesList.find((c) => c.id === selectedCourseId);
  const activeCourseTitle = activeCourse?.title || "Onboarding training module";
  const publishedModules = realModules.filter((m) => isPublished(m.status)).length;

  return (
    <div className="animate-fade-in">
      {/* ============================================================== */}
      {/* LEVEL 1: COURSE REGISTER (no course selected)                  */}
      {/* ============================================================== */}
      {!selectedCourseId &&
        (filteredCoursesList.length === 0 ? (
          <div className={`${ui.panel} py-16 text-center`}>
            <BookOpen className="h-5 w-5 text-slate-400 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-slate-900">
              {coursesSearchQuery ? "No modules match" : "No training modules yet"}
            </p>
            <p className="text-[13px] text-slate-500 mt-1">
              {coursesSearchQuery ? "Clear the search to see every module" : "Create one to start a curriculum"}
            </p>
            {!coursesSearchQuery && (
              <Button onClick={() => setShowCreateCourseModal(true)} className={`${ui.btnPrimary} mt-5`}>
                <Plus className="h-4 w-4" strokeWidth={1.5} /> New module
              </Button>
            )}
          </div>
        ) : (
          <div className={ui.panel}>
            {/* Column header — the top of the register */}
            <div className={`hidden xl:grid ${COURSE_COLS} gap-8 px-6 h-10 items-center border-b border-slate-100 text-xs text-slate-500`}>
              <span>Module</span>
              <span>Contents</span>
              <span>Assigned to</span>
              <span />
            </div>

            <ul className={ui.divider}>
              {filteredCoursesList.map((course) => {
                const isPrimary = course.isPrimaryOnboarding;
                // Ensure we display 12 lessons even during initial fetch
                const totalLessons = isPrimary ? (realModules.length > 0 ? realModules.length : 12) : (course.modulesCount || 0);
                const totalSections = isPrimary
                  ? (realModules.length > 0
                      ? realModules.reduce((acc, m) => acc + (m.sections?.length || 0), 0)
                      : 12)
                  : (course.sectionsCount || 0);
                const clusterCount = course.assignedClusters?.length || 0;
                const draftLessons =
                  isPrimary && !loadingRealModules ? realModules.length - publishedModules : 0;
                const allLessonsLive = isPrimary && !loadingRealModules && realModules.length > 0 && draftLessons === 0;
                const openCourse = () => handleSelectCourse(course.id);
                const assignCourse = () => setAssigningItem({ id: course.id, title: course.title });

                return (
                  <li
                    key={course.id}
                    onClick={openCourse}
                    className={`group relative grid grid-cols-1 sm:grid-cols-2 ${COURSE_COLS} gap-x-8 gap-y-3 px-6 py-5 items-center cursor-pointer hover:bg-slate-50/60 transition-colors`}
                  >
                    {isPrimary && (
                      <span className="absolute left-0 top-5 bottom-5 w-0.5 rounded-r bg-indigo-600" aria-hidden="true" />
                    )}

                    {/* Module */}
                    <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCourse();
                          }}
                          className={`${ui.title} truncate text-left hover:text-indigo-700 focus:outline-none focus-visible:text-indigo-700 transition-colors`}
                        >
                          {course.title}
                        </button>
                        {isPrimary && <span className={ui.tag}>Onboarding default</span>}
                        {!isPublished(course.status) && <span className={ui.tagWarn}>Draft</span>}
                      </div>
                      <p className="mt-1.5 text-[13px] text-slate-500">
                        <span className="text-slate-700">{categoryLabel(course.category)}</span>
                        {course.createdAt && (
                          <>
                            <span className="mx-1.5 text-slate-300">·</span>
                            <span className="tabular-nums">Created {course.createdAt}</span>
                          </>
                        )}
                      </p>
                      <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed line-clamp-1 max-w-2xl">
                        {course.description}
                      </p>
                    </div>

                    {/* Contents */}
                    <div className="text-[13px] text-slate-500">
                      {totalLessons === 0 ? (
                        <NeedsAction onClick={openCourse}>No modules yet</NeedsAction>
                      ) : (
                        <>
                          <p>
                            <span className="tabular-nums text-slate-900">{totalLessons}</span>{" "}
                            {totalLessons === 1 ? "module" : "modules"}
                            <span className="mx-1.5 text-slate-300">·</span>
                            <span className="tabular-nums">{totalSections}</span>{" "}
                            {totalSections === 1 ? "section" : "sections"}
                          </p>
                          {draftLessons > 0 && (
                            <p className="mt-1 text-xs tabular-nums text-amber-700">
                              {plural(draftLessons, "draft")} unpublished
                            </p>
                          )}
                          {allLessonsLive && <p className="mt-1 text-xs text-emerald-700">All published</p>}
                        </>
                      )}
                    </div>

                    {/* Assigned to */}
                    <div className="text-[13px]">
                      {clusterCount ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-slate-700"
                          title={course.assignedClusters.join(", ")}
                        >
                          <Users2 className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                          {plural(clusterCount, "cluster")}
                        </span>
                      ) : (
                        <NeedsAction onClick={assignCourse}>Not assigned</NeedsAction>
                      )}
                    </div>

                    {/* Actions: one visible, the rest tucked away */}
                    <div className="flex items-center gap-1 xl:justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={openCourse} className={ui.btnQuiet}>
                        Open
                        <ChevronRight className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                      </Button>
                      <RowActionMenu
                        actions={[
                          { label: "Open curriculum", icon: BookOpen, onClick: openCourse },
                          { label: "Assign to cluster", icon: Users2, onClick: assignCourse },
                        ]}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

      {/* ============================================================== */}
      {/* LEVEL 2: CURRICULUM (course selected)                          */}
      {/* ============================================================== */}
      {selectedCourseId && (
        <div className="space-y-4">
          {/* Course header */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => handleSelectCourse(null)}
              className="inline-flex items-center gap-1.5 h-8 -ml-2 px-2 rounded-lg text-[13px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              All modules
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-lg font-medium text-slate-900 truncate">{activeCourseTitle}</h3>
                  {activeCourse && !isPublished(activeCourse.status) && (
                    <span className={ui.tagWarn}>Draft</span>
                  )}
                </div>
                <p className="mt-1 text-[13px] text-slate-500">
                  Open a module to edit its lessons, documents and quizzes. Drag to change the order
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setAssigningItem({ id: activeCourse?.id || "onboarding", title: activeCourseTitle })}
                  className={`${ui.btnQuiet} h-9 text-sm`}
                >
                  <Users2 className="h-4 w-4" strokeWidth={1.5} /> Assign to cluster
                </Button>
                <Button onClick={() => openModuleEditor("new")} className={ui.btnPrimary}>
                  <Plus className="h-4 w-4" strokeWidth={1.5} /> Add module
                </Button>
              </div>
            </div>
          </div>

          {/* Curriculum register */}
          <div className={ui.panel}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
              {loadingRealModules ? (
                <span className="text-[13px] text-slate-500">Curriculum</span>
              ) : (
                <PublishedStrip published={publishedModules} total={realModules.length} />
              )}

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <SearchBar
                  placeholder="Search modules"
                  value={curriculumSearchQuery}
                  onChange={setCurriculumSearchQuery}
                  size="sm"
                  className="w-full sm:w-56"
                />
                {isSearchingCurriculum && (
                  <span className={`${ui.meta} whitespace-nowrap`}>
                    {filteredModulesList.length} of {realModules.length}
                  </span>
                )}
              </div>
            </div>

            {loadingRealModules ? (
              <div className="py-16 flex items-center justify-center">
                <Spinner size="md" color="indigo" text="Loading modules" />
              </div>
            ) : filteredModulesList.length === 0 ? (
              <div className="py-16 text-center">
                <BookOpen className="h-5 w-5 text-slate-400 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-slate-900">
                  {isSearchingCurriculum ? "No modules match" : "No modules yet"}
                </p>
                <p className="text-[13px] text-slate-500 mt-1">
                  {isSearchingCurriculum ? "Try a different search" : "Add the first module to this course"}
                </p>
                {isSearchingCurriculum ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurriculumSearchQuery("")}
                    className={`${ui.btnQuiet} mt-5`}
                  >
                    Clear search
                  </Button>
                ) : (
                  <Button onClick={() => openModuleEditor("new")} className={`${ui.btnPrimary} mt-5`}>
                    <Plus className="h-4 w-4" strokeWidth={1.5} /> Add module
                  </Button>
                )}
              </div>
            ) : (
              <>
                {isSearchingCurriculum && (
                  <p className="px-6 pt-3 text-xs text-slate-500">Clear the search to reorder modules</p>
                )}
                <ol className={ui.divider}>
                  {filteredModulesList.map((m, i) => {
                    const isDropTarget = dragOverIndex === i && dragIndex !== null && dragIndex !== i;
                    const sectionCount = m.sections?.length || 0;
                    const openModule = () => openModuleEditor(m.id);
                    const assignModule = () => setAssigningItem({ id: m.id, title: m.title });
                    return (
                      <li
                        key={m.id}
                        draggable={!isSearchingCurriculum}
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
                        onClick={openModule}
                        className={`group flex items-center gap-4 pl-3 pr-4 sm:pr-6 py-3 cursor-pointer transition-colors ${
                          isDropTarget
                            ? "bg-indigo-50/40 shadow-[inset_0_2px_0_theme(colors.indigo.600)]"
                            : "hover:bg-slate-50/60"
                        } ${dragIndex === i ? "opacity-40" : ""}`}
                      >
                        {!isSearchingCurriculum ? (
                          <span
                            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors shrink-0"
                            title="Drag to reorder"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="h-4 w-4" strokeWidth={1.5} />
                          </span>
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}

                        <span className="text-xs tabular-nums text-slate-400 w-6 shrink-0">
                          {String(realModules.indexOf(m) + 1).padStart(2, "0")}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openModule();
                              }}
                              className="text-sm font-medium text-slate-900 truncate text-left hover:text-indigo-700 focus:outline-none focus-visible:text-indigo-700 transition-colors"
                            >
                              {m.title}
                            </button>
                            {!isPublished(m.status) && <span className={ui.tagWarn}>Draft</span>}
                          </div>
                          <p className="text-[13px] text-slate-500 truncate mt-0.5">
                            {m.description || "No description"}
                          </p>
                        </div>

                        <span className="hidden sm:block shrink-0 whitespace-nowrap">
                          {sectionCount === 0 ? (
                            <NeedsAction onClick={openModule}>No sections</NeedsAction>
                          ) : (
                            <span className="text-[13px] text-slate-500">
                              <span className="tabular-nums text-slate-700">{sectionCount}</span>{" "}
                              {sectionCount === 1 ? "section" : "sections"}
                            </span>
                          )}
                        </span>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={assignModule}
                            className={`${ui.btnQuiet} hidden md:inline-flex`}
                          >
                            Assign
                          </Button>
                          <RowActionMenu
                            openUpward={i > 0 && i >= filteredModulesList.length - 2}
                            actions={[
                              { label: "Edit module", icon: Edit2, onClick: openModule },
                              { label: "Assign to cluster", icon: Users2, onClick: assignModule },
                              { divider: true },
                              {
                                label: "Delete module",
                                icon: Trash2,
                                tone: "danger",
                                onClick: () => setPendingDeleteCourse({ id: m.id, title: m.title }),
                              },
                            ]}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODALS                                                         */}
      {/* ============================================================== */}

      {/* New module */}
      {showCreateCourseModal && (
        <Modal isOpen onClose={() => setShowCreateCourseModal(false)} size="md">
          <Modal.Header>
            <h3 className="text-base font-medium text-slate-900">New training module</h3>
          </Modal.Header>
          <Modal.Body className="space-y-5">
            <div>
              <label className={ui.label}>Title</label>
              <input
                type="text"
                placeholder="Annotator advanced certification"
                value={newCourseForm.title}
                onChange={(e) => setNewCourseForm({ ...newCourseForm, title: e.target.value })}
                className={ui.input}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={ui.label}>Category</label>
                <Select
                  value={newCourseForm.category}
                  onChange={(v) => setNewCourseForm({ ...newCourseForm, category: v })}
                  options={CATEGORIES}
                  ariaLabel="Category"
                  className="w-full"
                />
              </div>

              <div>
                <label className={ui.label}>Status</label>
                <Select
                  value={newCourseForm.status}
                  onChange={(v) => setNewCourseForm({ ...newCourseForm, status: v })}
                  options={STATUS_OPTIONS}
                  ariaLabel="Status"
                  className="w-full"
                  align="right"
                />
              </div>
            </div>

            <div>
              <label className={ui.label}>Description</label>
              <textarea
                rows={3}
                placeholder="What it covers and who takes it"
                value={newCourseForm.description}
                onChange={(e) => setNewCourseForm({ ...newCourseForm, description: e.target.value })}
                className={ui.textarea}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" onClick={() => setShowCreateCourseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCourse} className={ui.btnPrimary}>
              Create module
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Delete module */}
      {pendingDeleteCourse && (
        <Modal isOpen onClose={() => setPendingDeleteCourse(null)} size="md">
          <Modal.Header>
            <h3 className="text-base font-medium text-slate-900">Delete module</h3>
          </Modal.Header>
          <Modal.Body>
            <p className={ui.body}>
              <span className="text-slate-900">“{pendingDeleteCourse.title}”</span> and its video sections and
              quiz data will be removed for good
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" onClick={() => setPendingDeleteCourse(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteCourse} className={ui.btnPrimary}>
              Delete
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Assign to cluster */}
      {assigningItem && (
        <Modal isOpen onClose={() => setAssigningItem(null)} size="md">
          <Modal.Header>
            <h3 className="text-base font-medium text-slate-900">Assign to cluster</h3>
            <p className="text-[13px] text-slate-500 mt-0.5 truncate">{assigningItem.title}</p>
          </Modal.Header>
          <Modal.Body className="space-y-5">
            <div>
              <label className={ui.label}>Cluster</label>
              <Select
                value={selectedClusterId}
                onChange={setSelectedClusterId}
                placeholder="Choose a cluster"
                ariaLabel="Cluster"
                className="w-full"
                options={clusters.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                  hint: plural(c.memberCount, "member"),
                }))}
              />
            </div>

            <div>
              <label className={ui.label}>Due date</label>
              <DatePicker
                value={assignmentDeadline}
                onChange={(e) => setAssignmentDeadline(e.target.value)}
                accentColor="indigo"
              />
              <p className={ui.hint}>Slack reminders go out 48 and 24 hours before the due date</p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="cancel" onClick={() => setAssigningItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAssignment} className={ui.btnPrimary}>
              Assign
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {moduleParam && (
        <ModuleEditorDrawer
          key={moduleParam}
          moduleId={moduleParam === "new" ? null : moduleParam}
          onClose={closeModuleEditor}
          onSaved={fetchRealModules}
        />
      )}
    </div>
  );
}
