import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, UserCheck, Check } from "lucide-react";
import { formatDisplayName } from "../../utils/displayName";
import { useClickOutside } from "../../hooks/useClickOutside";

const SkillMultiSelect = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  const toggleSkill = (skill) => {
    if (skill === "Any Skill") {
      onChange([]);
      setIsOpen(false);
      return;
    }
    onChange(
      value.includes(skill)
        ? value.filter((item) => item !== skill)
        : [...value, skill],
    );
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white flex items-center justify-between min-h-[42px]"
      >
        <div className="flex flex-wrap gap-1 flex-1 text-left">
          {value.length > 0 ? (
            value.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 border border-indigo-200"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-gray-500 text-sm font-medium">Any Skill</span>
          )}
        </div>
        <div className="flex items-center gap-2 pl-2">
          <span className="text-xs text-gray-500">{value.length} selected</span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Any Skill option — clears all skill filters */}
          <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100">
            <input
              type="radio"
              checked={value.length === 0}
              onChange={() => toggleSkill("Any Skill")}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Any Skill</span>
          </label>
          {options.length > 0 ? (
            options.map((skill) => (
              <label
                key={skill}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={value.includes(skill)}
                  onChange={() => toggleSkill(skill)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700">{skill}</span>
              </label>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              No skills available
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const EmployeeMultiSelect = ({
  name,
  defaultValue = [],
  employees,
  requiredSkills,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(defaultValue);
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

  // Filter employees by matching skills
  const matchingEmployees = employees.filter((emp) => {
    if (emp.status !== "active") return false;
    if (!requiredSkills || requiredSkills.length === 0) return true;

    return requiredSkills.some((skill) =>
      emp.skills?.some((empSkill) =>
        empSkill.toLowerCase().includes(skill.toLowerCase()),
      ),
    );
  });

  // Get employees that don't match skills
  const otherEmployees = employees.filter(
    (emp) => emp.status === "active" && !matchingEmployees.includes(emp),
  );

  const toggleEmployee = (empId) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId],
    );
  };

  const selectedEmployees = employees.filter((emp) =>
    selectedEmployeeIds.includes(emp.id),
  );

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(selectedEmployeeIds)}
      />



      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white cursor-pointer flex items-center justify-between min-h-[42px]"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedEmployees.length > 0 ? (
            selectedEmployees.map((emp) => (
              <span
                key={emp.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 border border-blue-200"
              >
                {formatDisplayName(emp.name)}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">Select employees...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {selectedEmployeeIds.length} selected
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {matchingEmployees.length > 0 && (
            <>
              <div className="px-3 py-2 bg-green-50 border-b border-green-200">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">
                    Matching Skills ({matchingEmployees.length})
                  </span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {matchingEmployees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-start px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors border-l-2 border-green-500"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDisplayName(emp.name)}
                      </div>
                      <div className="text-xs text-gray-500">{emp.email}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {emp.skills?.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {otherEmployees.length > 0 && (
            <>
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-600">
                  Other Available Employees ({otherEmployees.length})
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {otherEmployees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-start px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDisplayName(emp.name)}
                      </div>
                      <div className="text-xs text-gray-500">{emp.email}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {emp.skills?.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {matchingEmployees.length === 0 && otherEmployees.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No active employees available
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const TeamLeadMultiSelect = ({
  employees,
  value,
  onChange,
  excludeIds = [],
  // A lead cannot drop themselves from a project they are creating: the server allocates
  // the creator regardless, so allowing it would show a state that does not survive a save.
  lockedId = null,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useClickOutside(ref, () => setOpen(false), open);

  const q = search.trim().toLowerCase();
  const excluded = new Set(excludeIds.map(Number));
  const list = employees
    .filter((e) => e.status === "active" && !excluded.has(Number(e.id)))
    .filter((e) => !q || (e.name || "").toLowerCase().includes(q));

  const toggle = (id) => {
    if (value.includes(id)) {
      if (lockedId != null && Number(id) === Number(lockedId)) return;
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div ref={ref} className="relative">
        <div 
          onClick={(e) => {
            if (e.target.tagName.toLowerCase() === 'input') return;
            setOpen(!open);
            if (!open) {
              const input = e.currentTarget.querySelector('input');
              if (input) input.focus();
            }
          }}
          className="flex w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition-colors hover:border-slate-300 cursor-text"
        >
        <input
          type="text"
          value={search}
          placeholder={value.length ? "Add another" : "Add team lead"}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onClick={() => { if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          tabIndex={-1}
          className="p-0.5 flex-shrink-0 focus:outline-none"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform pointer-events-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 top-full z-[9999] mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {list.length ? (
            list.map((emp) => {
              const selected = value.includes(emp.id);
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => toggle(emp.id)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${selected ? "bg-emerald-50 font-medium text-emerald-700" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <span className="flex w-4 shrink-0 justify-center">
                    {selected && (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </span>
                  <span className="flex-1 truncate">
                    {formatDisplayName(emp.name)}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-slate-400">
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const PmMultiSelect = ({ employees, value, onChange, isPm, pmEmployeeId }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useClickOutside(ref, () => setOpen(false), open);

  const q = search.trim().toLowerCase();
  const list = employees
    .filter((e) => e.status === "active")
    .filter((e) => !q || (e.name || "").toLowerCase().includes(q));

  const toggle = (id) => {
    if (value.includes(id)) {
      if (isPm && id === pmEmployeeId) return; // a PM can't remove themselves
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div ref={ref} className="relative">
        <div 
          onClick={(e) => {
            if (e.target.tagName.toLowerCase() === 'input') return;
            setOpen(!open);
            if (!open) {
              const input = e.currentTarget.querySelector('input');
              if (input) input.focus();
            }
          }}
          className="flex w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition-colors hover:border-slate-300 cursor-text"
        >
        <input
          type="text"
          value={search}
          placeholder={value.length ? "Add another" : "Add manager"}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onClick={() => { if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="min-w-0 flex-1 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          tabIndex={-1}
          className="p-0.5 flex-shrink-0 focus:outline-none"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform pointer-events-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 top-full z-[9999] mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {list.length ? (
            list.map((emp) => {
              const selected = value.includes(emp.id);
              const isPrimary = value[0] === emp.id;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => toggle(emp.id)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${selected ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <span className="flex w-4 shrink-0 justify-center">
                    {selected && (
                      <Check className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                  </span>
                  <span className="flex-1 truncate">{formatDisplayName(emp.name)}</span>
                  {isPrimary && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-indigo-400">
                      primary
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-slate-400">
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
};


export { SkillMultiSelect, EmployeeMultiSelect, TeamLeadMultiSelect, PmMultiSelect };
