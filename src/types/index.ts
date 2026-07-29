// Employee Types
export interface Employee {
  id: number;
  name: string;
  email?: string;
  role: string;
  work_type: "Full-time" | "Part-time" | "Intern" | "Contract";
  hours_per_day: number;
  skills: string[];
  skill_ratings: Record<string, number>;
  global_productivity: number;
  weekly_availability: number;
  active_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWithAllocations extends Employee {
  current_allocations: Array<{
    project_id: number;
    project_name: string;
    weekly_hours: number;
  }>;
  allocation_status: "Available" | "Partially Allocated" | "Overloaded";
  total_allocated_hours: number;
}

export interface EmployeeCreate {
  name: string;
  email?: string;
  role?: string;
  work_type: "Full-time" | "Part-time" | "Intern" | "Contract";
  hours_per_day: number;
  skills?: string[];
  skill_ratings?: Record<string, number>;
  global_productivity?: number;
  weekly_availability: number;
  active_status?: boolean;
}

// Project Types
export interface Project {
  id: number;
  name: string;
  client: string;
  project_type: "PoC" | "Full" | "Side";
  total_tasks: number;
  completed_tasks: number;
  sla_deadline: string;
  required_expertise: string[];
  estimated_time_per_task: number;
  start_date: string;
  end_date: string;
  weekly_target?: number;
  priority: "Low" | "Medium" | "High" | "Critical";
  complexity: "Low" | "Medium" | "High";
  project_status: "DRAFT" | "ACTIVE" | "COMPLETED" | "DELETED";
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ProjectWithCalculations extends Project {
  remaining_tasks: number;
  remaining_days: number;
  required_tasks_per_day: number;
  required_hours_per_day: number;
  team_capacity_tasks_per_day: number;
  team_capacity_hours_per_day: number;
  capacity_ratio: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  system_recommendation: string;
  allocated_employees: Array<{
    employee_id: number;
    employee_name: string;
    weekly_hours: number;
    productivity: number;
  }>;
}

export interface ProjectCreate {
  name: string;
  client: string;
  project_type: "PoC" | "Full" | "Side";
  total_tasks: number;
  sla_deadline: string;
  required_expertise: string[];
  estimated_time_per_task: number;
  start_date: string;
  end_date: string;
  weekly_target?: number;
  priority?: "Low" | "Medium" | "High" | "Critical";
  complexity?: "Low" | "Medium" | "High";
  notes?: string;
}

// Allocation Types
export interface Allocation {
  id: number;
  employee_id: number;
  project_id: number;
  weekly_hours_allocated: number;
  weekly_tasks_allocated?: number;
  productivity_override?: number;
  effective_from: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

export interface AllocationCreate {
  employee_id: number;
  project_id: number;
  weekly_hours_allocated: number;
  productivity_override?: number;
  effective_from: string;
  effective_to?: string;
}

// Leave Types
export interface Leave {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  leave_type: "paid" | "casual_sick" | "floater";
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveCreate {
  employee_id: number;
  start_date: string;
  end_date: string;
  leave_type: "paid" | "casual_sick" | "floater";
  reason?: string;
}

export interface LeaveWithImpact extends Leave {
  employee_name: string;
  impacted_projects: Array<{
    project_id: number;
    project_name: string;
    weekly_hours: number;
  }>;
  warnings: string[];
}

// Warning Types
export interface Warning {
  id: number;
  project_id?: number;
  employee_id?: number;
  warning_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  resolved: boolean;
  created_at: string;
  resolved_at?: string;
}
