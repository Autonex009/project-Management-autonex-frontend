import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Users2,
  TrendingUp,
  GraduationCap,
  ShieldCheck,
  Award,
  Play,
  Plus,
} from "lucide-react";
import TrainingCoursesTab from "../../components/training/TrainingCoursesTab";
import ClustersTab from "../../components/training/ClustersTab";
import CourseProgressTab from "../../components/training/CourseProgressTab";
import AssessmentsStudioTab from "../../components/training/AssessmentsStudioTab";
import ResultsAnalyticsTab from "../../components/training/ResultsAnalyticsTab";
import ProctoredTestRoomModal from "../../components/training/ProctoredTestRoomModal";
import Button from "../../components/ui/Button";
import SearchBar from "../../components/ui/SearchBar";
import toast from "react-hot-toast";
import { ui, TEST_TYPES } from "../../components/training/trainingStyles";
import Select from "../../components/training/Select";
import { INITIAL_COURSES } from "../../mock/trainingMockData";
import { assessmentApi, assignmentApi, clusterApi } from "../../services/api";

export default function AdminTrainingModulesPage({ defaultSection = "training" }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Top-level Section Tab: 'training' or 'assessment'
  const activeSection = searchParams.get("section") || defaultSection;

  // Sub-tab selection based on active section
  const currentTab =
    searchParams.get("tab") ||
    (activeSection === "assessment" ? "studio" : "catalog");

  const selectedCourseId = searchParams.get("course");

  // Real backend queries
  const { data: tests = [], isLoading: assessmentsLoading } = useQuery({
    queryKey: ["assessments"],
    // The studio cards, editor and candidate preview read the question bank from this list,
    // so ask for it explicitly (the plain list endpoint is lean by default).
    queryFn: () => assessmentApi.list({ include_config: true }),
    staleTime: 30_000,
  });

  const { data: clusters = [], isLoading: clustersLoading } = useQuery({
    queryKey: ["clusters"],
    queryFn: () => clusterApi.list(),
    staleTime: 30_000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", "assessment"],
    queryFn: () => assignmentApi.list({ assignment_type: "assessment" }),
    enabled: activeSection === "assessment",
    staleTime: 30_000,
  });

  // Track Progress & Logs total count from ResultsAnalyticsTab's server-paginated query
  const [progressTotalCount, setProgressTotalCount] = useState(undefined);
  const [resultsToolsSlot, setResultsToolsSlot] = useState(null);

  // Training courses state (Phase 2 LMS)
  const [coursesList, setCoursesList] = useState(INITIAL_COURSES);
  const [coursesSearchQuery, setCoursesSearchQuery] = useState("");
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);

  // Assessments studio filters
  const [testsSearchQuery, setTestsSearchQuery] = useState("");
  const [testsTypeFilter, setTestsTypeFilter] = useState("All");
  const [testsStatusFilter, setTestsStatusFilter] = useState("All");
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);

  const { data: archivedTests = [], isLoading: archivedTestsLoading } = useQuery({
    queryKey: ["archivedAssessments"],
    queryFn: () => assessmentApi.list({ include_config: true, status: "archived" }),
    enabled: testsStatusFilter === "archived",
    staleTime: 30_000,
  });

  const activeTestsSource = testsStatusFilter === "archived" ? archivedTests : tests;

  const filteredCoursesList = coursesList.filter(
    (c) =>
      (c.title || "").toLowerCase().includes(coursesSearchQuery.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(coursesSearchQuery.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(coursesSearchQuery.toLowerCase())
  );

  const filteredTests = activeTestsSource.filter((t) => {
    const matchesSearch =
      (t.title || "").toLowerCase().includes(testsSearchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(testsSearchQuery.toLowerCase());
    const matchesType = testsTypeFilter === "All" || t.test_type === testsTypeFilter;
    const matchesStatus = testsStatusFilter === "All" || t.status === testsStatusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Candidate Proctored Preview Modal State (ephemeral local preview of a real blueprint)
  const [activeTestDemo, setActiveTestDemo] = useState(null);

  const handleSectionChange = (section) => {
    const params = new URLSearchParams(searchParams);
    params.set("section", section);
    if (section === "training") {
      params.set("tab", "catalog");
    } else {
      params.set("tab", "studio");
    }
    setSearchParams(params);
  };

  const handleSubTabChange = (tabKey) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tabKey);
    setSearchParams(params);
  };

  const hasPreviewableContent = (test) => {
    if (!test) return false;
    if (test.test_type === "typing") {
      return Boolean((test.test_config?.passage_text || "").trim());
    }
    const cats = test.test_config?.categories || [];
    const totalFromCats = cats.reduce((acc, c) => acc + (c.questions?.length || 0), 0);
    const totalFlat = (test.test_config?.questions || []).length;
    return totalFromCats + totalFlat > 0;
  };

  const handleLaunchDemo = (test) => {
    const target = test || tests.find(hasPreviewableContent);
    if (!target) {
      toast.error("Create an assessment with questions or a typing passage to preview");
      return;
    }
    if (!hasPreviewableContent(target)) {
      toast.error("Add questions or a typing passage before previewing this blueprint");
      return;
    }
    setActiveTestDemo(target);
  };

  const sectionTabs =
    activeSection === "assessment"
      ? [
          { key: "studio", label: "Assessments", icon: ShieldCheck, count: tests.length },
          { key: "clusters", label: "Clusters", icon: Users2, count: clusters.length },
          {
            key: "scorecards",
            label: "Progress and Logs",
            icon: Award,
            count: progressTotalCount,
          },
        ]
      : [
          { key: "catalog", label: "Courses & Curriculum", icon: BookOpen, count: coursesList.length },
          { key: "clusters", label: "Clusters", icon: Users2, count: clusters.length },
          { key: "progress", label: "Trainee Progress", icon: TrendingUp },
        ];

  const showCatalogTools = activeSection === "training" && currentTab === "catalog" && !selectedCourseId;
  const showStudioTools = activeSection === "assessment" && currentTab === "studio";
  const testsFiltered =
    testsTypeFilter !== "All" || testsStatusFilter !== "All" || testsSearchQuery.trim();

  return (
    <div className="space-y-6">
      {/* Level 1: section tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200">
        <div className="flex items-center gap-8" role="tablist" aria-label="Section">
          {[
            { key: "training", label: "Training", icon: GraduationCap },
            { key: "assessment", label: "Assessment", icon: ShieldCheck },
          ].map(({ key, label, icon: Icon }) => {
            const active = activeSection === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleSectionChange(key)}
                className={ui.sectionTab(active)}
              >
                <Icon className={`h-[18px] w-[18px] ${active ? "text-indigo-600" : "text-slate-400"}`} strokeWidth={1.5} />
                {label}
              </button>
            );
          })}
        </div>

        {activeSection === "assessment" && (
          <Button
            variant="ghost"
            onClick={() => handleLaunchDemo(tests.find(hasPreviewableContent))}
            disabled={!tests.some(hasPreviewableContent)}
            className="h-8 px-3 gap-1.5 rounded-lg text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Play className="h-3.5 w-3.5" strokeWidth={1.75} /> Preview as candidate
          </Button>
        )}
      </div>

      <div className="space-y-5">
        {/* Level 2: views + tools */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className={ui.segment} role="tablist" aria-label="View">
            {sectionTabs.map(({ key, label, icon: Icon, count }) => {
              const active = currentTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSubTabChange(key)}
                  className={ui.segmentItem(active)}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-slate-700" : "text-slate-400"}`} strokeWidth={1.5} />
                  {label}
                  {count !== undefined && <span className={ui.segmentCount(active)}>{count}</span>}
                </button>
              );
            })}
          </div>

          {((activeSection === "assessment" && currentTab === "scorecards") || currentTab === "clusters") && (
            <div ref={setResultsToolsSlot} className="flex flex-wrap items-center gap-2" />
          )}

          {showCatalogTools && (
            <div className="flex items-center gap-2">
              <SearchBar
                placeholder="Search modules"
                value={coursesSearchQuery}
                onChange={setCoursesSearchQuery}
                size="sm"
                className="w-56"
              />
              {coursesSearchQuery.trim() && (
                <span className={`${ui.meta} px-1 whitespace-nowrap`}>
                  {filteredCoursesList.length} of {coursesList.length}
                </span>
              )}
              <Button onClick={() => setShowCreateCourseModal(true)} className={`${ui.btnPrimary} whitespace-nowrap`}>
                <Plus className="h-4 w-4" strokeWidth={1.75} /> New module
              </Button>
            </div>
          )}

          {showStudioTools && (
            <div className="flex flex-wrap items-center gap-2">
              <SearchBar
                placeholder="Search assessments"
                value={testsSearchQuery}
                onChange={setTestsSearchQuery}
                size="sm"
                className="w-52"
              />
              <Select
                value={testsTypeFilter}
                onChange={setTestsTypeFilter}
                ariaLabel="Filter by test type"
                align="right"
                className="w-36"
                options={[
                  { value: "All", label: "All types", dot: "", hint: String(tests.length) },
                  ...TEST_TYPES.map((t) => ({
                    ...t,
                    hint: String(tests.filter((x) => x.test_type === t.value).length),
                  })),
                ]}
              />
              <Select
                value={testsStatusFilter}
                onChange={setTestsStatusFilter}
                ariaLabel="Filter by status"
                align="right"
                className="w-36"
                options={[
                  { value: "All", label: "All statuses", hint: String(tests.length) },
                  {
                    value: "published",
                    label: "Published",
                    dot: "bg-emerald-500",
                    hint: String(tests.filter((x) => x.status === "published").length),
                  },
                  {
                    value: "draft",
                    label: "Draft",
                    dot: "bg-amber-500",
                    hint: String(tests.filter((x) => x.status === "draft").length),
                  },
                  {
                    value: "archived",
                    label: "Archived",
                    dot: "bg-slate-400",
                  },
                ]}
              />
              {testsFiltered && (
                <span className={`${ui.meta} px-1 whitespace-nowrap`}>
                  {filteredTests.length} of {activeTestsSource.length}
                </span>
              )}
              <Button onClick={() => setShowCreateTestModal(true)} className={`${ui.btnPrimary} whitespace-nowrap`}>
                <Plus className="h-4 w-4" strokeWidth={1.75} /> New assessment
              </Button>
            </div>
          )}
        </div>

        {/* Training panels */}
        {activeSection === "training" && currentTab === "catalog" && (
          <TrainingCoursesTab
            clusters={clusters}
            coursesList={coursesList}
            onUpdateCoursesList={setCoursesList}
            coursesSearchQuery={coursesSearchQuery}
            showCreateModal={showCreateCourseModal}
            setShowCreateModal={setShowCreateCourseModal}
          />
        )}

        {currentTab === "clusters" && (
          <ClustersTab
            clusters={clusters}
            isLoading={clustersLoading}
            assessments={tests}
            assignments={assignments}
            toolsSlot={resultsToolsSlot}
          />
        )}

        {activeSection === "training" && currentTab === "progress" && (
          <CourseProgressTab clusters={clusters} />
        )}

        {/* Assessment panels */}
        {activeSection === "assessment" && currentTab === "studio" && (
          <AssessmentsStudioTab
            tests={activeTestsSource}
            activeTests={tests}
            isLoading={testsStatusFilter === "archived" ? archivedTestsLoading : assessmentsLoading}
            clusters={clusters}
            onLaunchDemo={handleLaunchDemo}
            searchQuery={testsSearchQuery}
            selectedType={testsTypeFilter}
            selectedStatus={testsStatusFilter}
            showCreateModal={showCreateTestModal}
            setShowCreateModal={setShowCreateTestModal}
          />
        )}

        {activeSection === "assessment" && currentTab === "scorecards" && (
          <ResultsAnalyticsTab
            assessments={tests}
            clusters={clusters}
            onTotalCountChange={setProgressTotalCount}
            toolsSlot={resultsToolsSlot}
          />
        )}
      </div>

      {activeTestDemo && (
        <ProctoredTestRoomModal
          test={activeTestDemo}
          onClose={() => setActiveTestDemo(null)}
        />
      )}
    </div>
  );
}
