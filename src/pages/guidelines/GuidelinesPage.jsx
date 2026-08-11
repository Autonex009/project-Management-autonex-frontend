import React, { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/ui/Button";
import { guidelineApi, projectApi, subProjectApi } from "../../services/api";
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Save,
  Download,
  FolderOpen,
  UploadCloud,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getPmEmployeeId,
  getPmVisibleOrgs,
  getPmSubProjects,
} from "../../utils/pmScope";

import SearchBar from "../../components/ui/SearchBar";
import Dropdown from "../../components/ui/Dropdown";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

// Truncated text that reveals its full value in a light (white) tooltip on hover
// (replaces the browser's dark native title tooltip).
const TruncTip = ({ text, className = "" }) => (
  <span className="group/tip relative block min-w-0 flex-1">
    <span className={`block truncate ${className}`}>{text}</span>
    <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-max max-w-[280px] whitespace-normal break-words rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-lg group-hover/tip:block">
      {text}
    </span>
  </span>
);



const GuidelinesPage = () => {
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = localStorage.getItem("role") || "employee";
  const isPm = role === "pm";
  const canEdit = role === "pm" || role === "admin";
  const pmEmployeeId = getPmEmployeeId(user);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    main_project_id: "",
    sub_project_id: "",
  });

  const [filterProject, setFilterProject] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Fetch guidelines
  const params = {};
  if (filterProject) params.main_project_id = filterProject;
  if (role === "pm" && user.id) params.uploaded_by = user.id;
  const { data: guidelines = [], isLoading: guidelinesLoading } = useQuery({
    queryKey: ["guidelines", filterProject, role, user.id],
    queryFn: () => guidelineApi.getAll(params),
  });

  // Fetch main projects for filter/selector
  const { data: mainProjects = [], isLoading: mainProjectsLoading } = useQuery({
    queryKey: ["main-projects"],
    queryFn: projectApi.getAll,
  });

  const { data: subProjects = [], isLoading: subProjectsLoading } = useQuery({
    queryKey: ["sub-projects"],
    queryFn: subProjectApi.getAll,
  });

  const isLoading = guidelinesLoading || mainProjectsLoading || subProjectsLoading;

  const visibleMainProjects = isPm
    ? getPmVisibleOrgs(mainProjects, subProjects, pmEmployeeId)
    : mainProjects;
  const visibleSubProjectsForRole = isPm
    ? getPmSubProjects(subProjects, mainProjects, pmEmployeeId, [])
    : subProjects;

  const filteredGuidelines = guidelines.filter((g) => {
    const title = (g.title || "").toLowerCase();
    const content = (g.content || "").toLowerCase();
    const fileName = (g.file_name || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return title.includes(q) || content.includes(q) || fileName.includes(q);
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterProject]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (formData) => guidelineApi.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guidelines"] });
      toast.success("Guideline created!");
      resetForm();
    },
    onError: () => toast.error("Failed to create guideline"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => guidelineApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guidelines"] });
      toast.success("Guideline updated!");
      resetForm();
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => guidelineApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guidelines"] });
      toast.success("Guideline deleted");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete"),
  });

  const resetForm = () => {
    setForm({ title: "", main_project_id: "", sub_project_id: "" });
    setSelectedFile(null);
    setIsDragActive(false);
    setShowForm(false);
    setEditingId(null);
  };

  const addGuidelineFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: { title: form.title } });
    } else {
      if (!selectedFile) {
        toast.error("Please upload a guideline file");
        return;
      }

      const payload = new FormData();
      payload.append("file", selectedFile);
      if (form.title.trim()) {
        payload.append("title", form.title.trim());
      }
      if (form.main_project_id) {
        payload.append("main_project_id", form.main_project_id);
      }
      if (form.sub_project_id) {
        payload.append("sub_project_id", form.sub_project_id);
      }
      if (user.id) {
        payload.append("uploaded_by", String(user.id));
      }
      createMutation.mutate(payload);
    }
  };

  const startEdit = (g) => {
    setForm({
      title: g.title,
      main_project_id: g.main_project_id || "",
      sub_project_id: g.sub_project_id || "",
    });
    setEditingId(g.id);
    setSelectedFile(null);
    setShowForm(true);
  };

  const visibleSubProjects = form.main_project_id
    ? visibleSubProjectsForRole.filter(
        (project) =>
          String(project.main_project_id) === String(form.main_project_id),
      )
    : visibleSubProjectsForRole;

  const columns = [
    {
      key: "title",
      label: "Guideline",
      width: "w-[27%]",
      render: (_, g) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText className="h-4 w-4" />
          </span>
          <TruncTip text={g.title} className="font-medium text-slate-800" />
        </div>
      ),
    },
    {
      key: "organization",
      label: "Organization",
      width: "w-[20%]",
      render: (_, g) => {
        const mp = mainProjects.find((p) => p.id === g.main_project_id);
        return mp ? (
          <span
            className="inline-flex max-w-full truncate rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600"
            title={undefined}
          >
            {mp.name}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        );
      },
    },
    {
      key: "project",
      label: "Project",
      width: "w-[26%]",
      render: (_, g) => {
        const sp = subProjects.find((p) => p.id === g.sub_project_id);
        return sp ? (
          <div className="flex min-w-0 items-center gap-1 text-slate-600">
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <TruncTip text={sp.name} />
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        );
      },
    },
    {
      key: "created",
      label: "Created",
      width: "w-[16%]",
      render: (_, g) => (
        <span className="whitespace-nowrap text-slate-500 tabular-nums">
          {g.created_at
            ? new Date(g.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      width: "w-[10%]",
      render: (_, g) => (
        <div className="flex items-center justify-end gap-1">
          {g.file_url && (
            <a
                href={g.file_url}
                target="_blank"
                rel="noreferrer"
                download
                title={`Download ${g.file_name || "file"}`}
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              >
                <Download className="h-4 w-4" />
              </a>
          )}
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => startEdit(g)}
                title="Edit"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(g)}
                title="Delete"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Project Guidelines
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Reference documents and instructions for projects
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Dropdown
            options={[
              { value: "", label: "All Organizations" },
              ...visibleMainProjects.map((p) => ({
                value: String(p.id),
                label: p.name,
              })),
            ]}
            value={filterProject}
            onChange={(val) => {
              setFilterProject(val);
              setSearchQuery("");
            }}
            placeholder="All Organizations"
          />
          <span className="text-sm text-slate-400">
            {filteredGuidelines.length} guideline
            {filteredGuidelines.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <SearchBar
            responsive
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search guidelines..."
          />
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 shadow-sm transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Guideline
            </button>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showForm && canEdit} onClose={resetForm} size="lg">
        <Modal.Header onClose={resetForm}>
          <h3 className="font-semibold text-slate-800">
            {editingId ? "Edit Guideline" : "New Guideline"}
          </h3>
        </Modal.Header>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <Modal.Body className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional. Defaults to file name"
                  required={!!editingId}
                />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Organization
                  </label>
                  <Dropdown
                    options={[
                      { value: "", label: "None (General)" },
                      ...visibleMainProjects.map((p) => ({
                        value: String(p.id),
                        label: p.name,
                      })),
                    ]}
                    value={form.main_project_id}
                    onChange={(val) =>
                      setForm({
                        ...form,
                        main_project_id: val,
                        sub_project_id: "",
                      })
                    }
                    placeholder="None (General)"
                  />
                </div>
              )}
            </div>

            {editingId &&
              (() => {
                const mp = mainProjects.find(
                  (p) => String(p.id) === String(form.main_project_id),
                );
                const sp = subProjects.find(
                  (p) => String(p.id) === String(form.sub_project_id),
                );
                return (
                  <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Organization</span>
                      <span className="truncate font-medium text-slate-700">
                        {mp?.name || "General"}
                      </span>
                    </div>
                    {sp && (
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-400">Project</span>
                        <span className="truncate font-medium text-slate-700">
                          {sp.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

            {!editingId && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Project
                  </label>
                  <Dropdown
                    options={[
                      { value: "", label: "All Projects" },
                      ...visibleSubProjects.map((p) => ({
                        value: String(p.id),
                        label: p.name,
                      })),
                    ]}
                    value={form.sub_project_id}
                    onChange={(val) =>
                      setForm({ ...form, sub_project_id: val })
                    }
                    placeholder="All Projects"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Guideline File
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragActive(false);
                      addGuidelineFile(e.dataTransfer.files?.[0]);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      isDragActive
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/60"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        addGuidelineFile(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700">
                      Drag guideline file here or click to browse
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Uploaded files will be visible in the related Guidelines
                      tabs.
                    </p>
                  </div>

                  {selectedFile && (
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {Math.max(1, Math.round(selectedFile.size / 1024))}{" "}
                            KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-sm text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="cancel" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" variant="blue">
              <Save className="w-4 h-4" /> {editingId ? "Update" : "Upload"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Guidelines table */}
      <Table
        variant="untitled"
        allowOverflow
        columns={columns}
        data={filteredGuidelines}
        loading={isLoading}
        skeletonRows={12}
        currentPage={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        getRowId={(g) => g.id}
        emptyState={{
          title: "No guidelines found",
          description: "Try adjusting your search or filters.",
        }}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        isPending={deleteMutation.isPending}
        variant="danger"
        title="Delete Guideline"
        message={`Are you sure you want to delete "${deleteTarget?.title || "this guideline"}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default GuidelinesPage;
