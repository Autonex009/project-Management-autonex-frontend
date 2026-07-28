/**
 * Allocation Types
 * Type definitions for allocation features including time division and filtering
 */

/** Hours distribution per role tag */
export interface TimeDistribution {
 [roleTag: string]: number;
}

/** Available role tags for time division */
export const ROLE_TAGS = ['Annotation', 'Review', 'QC'] as const;
export type RoleTag = typeof ROLE_TAGS[number];

/** Allocation form data for creating/updating allocations */
export interface AllocationFormData {
 employee_id: number;
 sub_project_id: number;
 total_daily_hours: number;
 role_tags: string[];
 time_distribution: TimeDistribution;
 active_start_date: string;
 active_end_date: string;
 override_flag: boolean;
 override_reason?: string;
 weekly_hours_allocated?: number;
 weekly_tasks_allocated?: number;
 productivity_override?: number;
 effective_week?: string;
}

/** Employee's current allocation to a project */
export interface EmployeeProjectAllocation {
 project_id: number;
 project_name: string;
 hours: number;
 role_tags: string[];
}

/** Employee allocation status for filtering */
export interface EmployeeAllocationStatus {
 employee_id: number;
 employee_name: string;
 status: 'unallocated' | 'partial' | 'full';
 allocations: EmployeeProjectAllocation[];
 total_allocated_hours: number;
 max_capacity: number;
}

/** Filter tab options for employee selection */
export type EmployeeFilterTab = 'unallocated' | 'allocated' | 'all';

/** Employee with enriched allocation data */
export interface EnrichedEmployee {
 id: number;
 name: string;
 email: string;
 skills: string[];
 status: string;
 designation?: string;
 weekly_availability?: number;
 currentAllocations: EmployeeProjectAllocation[];
 isAllocated: boolean;
 totalAllocatedHours: number;
}

/** Sub-project data for copy feature */
export interface SubProjectCopyData {
 name: string;
 main_project_id?: number;
 project_type?: string;
 total_tasks?: number;
 estimated_time_per_task?: number;
 start_date?: string;
 end_date?: string;
 daily_target?: number;
 priority?: string;
 required_expertise?: string[];
 required_manpower?: number;
 project_status?: string;
}
