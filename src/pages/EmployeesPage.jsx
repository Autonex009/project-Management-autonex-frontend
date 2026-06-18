// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { employeeApi } from '../services/api';
// import { Plus, Edit, Trash2, X, User } from 'lucide-react';

// const EmployeesPage = () => {
//   const queryClient = useQueryClient();
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingEmployee, setEditingEmployee] = useState(null);

//   const { data: employees = [], isLoading } = useQuery({
//     queryKey: ['employees'],
//     queryFn: employeeApi.getAll,
//   });

//   const createMutation = useMutation({
//     mutationFn: employeeApi.create,
//     onSuccess: () => {
//       queryClient.invalidateQueries(['employees']);
//       setIsModalOpen(false);
//     },
//   });

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }) => employeeApi.update(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries(['employees']);
//       setIsModalOpen(false);
//       setEditingEmployee(null);
//     },
//   });

//   const deleteMutation = useMutation({
//     mutationFn: employeeApi.delete,
//     onSuccess: () => {
//       queryClient.invalidateQueries(['employees']);
//     },
//   });

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     const formData = new FormData(e.target);
//     const data = {
//       name: formData.get('name'),
//       email: formData.get('email'),
//       employee_type: formData.get('employee_type'),
//       working_hours_per_day: parseFloat(formData.get('working_hours_per_day')),
//       weekly_availability: parseFloat(formData.get('weekly_availability')),
//       skills: formData.get('skills').split(',').map(s => s.trim()).filter(Boolean),
//       productivity_baseline: parseFloat(formData.get('productivity_baseline')),
//       status: formData.get('status') || 'active',
//     };

//     if (editingEmployee) {
//       updateMutation.mutate({ id: editingEmployee.id, data });
//     } else {
//       createMutation.mutate(data);
//     }
//   };

//   const getStatusBadge = (status) => {
//     const badges = {
//       'active': 'badge-green',
//       'inactive': 'badge-gray',
//       'on-leave': 'badge-yellow',
//     };
//     return badges[status?.toLowerCase()] || 'badge-blue';
//   };

//   const getTypeBadge = (type) => {
//     const badges = {
//       'Full-Time': 'badge-blue',
//       'Part-Time': 'badge-purple',
//       'Intern': 'badge-orange',
//     };
//     return badges[type] || 'badge-gray';
//   };

//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center py-12">
//         <div className="text-gray-500">Loading employees...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
//           <p className="mt-1 text-sm text-gray-500">Manage team members and their information</p>
//         </div>
//         <button
//           onClick={() => {
//             setEditingEmployee(null);
//             setIsModalOpen(true);
//           }}
//           className="btn btn-primary flex items-center gap-2"
//         >
//           <Plus className="w-4 h-4" />
//           Add Employee
//         </button>
//       </div>

//       <div className="card p-0">
//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead className="bg-gray-50 border-b border-gray-200">
//               <tr>
//                 <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
//                 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
//                 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Hours/Day</th>
//                 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Hours/Week</th>
//                 <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Skills</th>
//                 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Productivity</th>
//                 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
//                 <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-100">
//               {employees.length === 0 ? (
//                 <tr>
//                   <td colSpan="8" className="px-4 py-12 text-center">
//                     <div className="text-gray-400">
//                       <p className="mb-2">No employees yet</p>
//                       <p className="text-sm">Add your first team member to get started</p>
//                     </div>
//                   </td>
//                 </tr>
//               ) : (
//                 employees.map((employee) => (
//                   <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
//                     <td className="px-4 py-3">
//                       <div className="flex items-center gap-3">
//                         <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
//                           <User className="w-5 h-5 text-blue-600" />
//                         </div>
//                         <div className="min-w-0">
//                           <div className="font-medium text-sm text-gray-900 truncate">{employee.name}</div>
//                           <div className="text-xs text-gray-500 truncate">{employee.email}</div>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="px-4 py-3 text-center">
//                       <span className={`badge ${getTypeBadge(employee.employee_type)}`}>
//                         {employee.employee_type}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-center">
//                       <div className="font-medium text-sm text-gray-900">{employee.working_hours_per_day}h</div>
//                     </td>
//                     <td className="px-4 py-3 text-center">
//                       <div className="font-medium text-sm text-gray-900">{employee.weekly_availability}h</div>
//                     </td>
//                     <td className="px-4 py-3">
//                       <div className="flex flex-wrap gap-1">
//                         {employee.skills && employee.skills.length > 0 ? (
//                           <>
//                             {employee.skills.slice(0, 3).map((skill, idx) => (
//                               <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 border border-gray-200">
//                                 {skill}
//                               </span>
//                             ))}
//                             {employee.skills.length > 3 && (
//                               <span className="text-xs text-gray-500">+{employee.skills.length - 3}</span>
//                             )}
//                           </>
//                         ) : (
//                           <span className="text-xs text-gray-400">No skills</span>
//                         )}
//                       </div>
//                     </td>
//                     <td className="px-4 py-3 text-center">
//                       <span className={`badge ${employee.productivity_baseline === 1.0 ? 'badge-blue' : 'badge-green'}`}>
//                         {employee.productivity_baseline}x
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-center">
//                       <span className={`badge ${getStatusBadge(employee.status)}`}>
//                         {employee.status}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3">
//                       <div className="flex items-center justify-center gap-1">
//                         <button
//                           onClick={() => {
//                             setEditingEmployee(employee);
//                             setIsModalOpen(true);
//                           }}
//                           className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
//                           title="Edit"
//                         >
//                           <Edit className="w-4 h-4" />
//                         </button>
//                         <button
//                           onClick={() => {
//                             if (window.confirm(`Delete ${employee.name}?`)) {
//                               deleteMutation.mutate(employee.id);
//                             }
//                           }}
//                           className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
//                           title="Delete"
//                         >
//                           <Trash2 className="w-4 h-4" />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Modal */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//             <div className="px-6 py-4 border-b border-gray-200">
//               <div className="flex justify-between items-center">
//                 <h2 className="text-xl font-semibold text-gray-900">
//                   {editingEmployee ? 'Edit Employee' : 'Add Employee'}
//                 </h2>
//                 <button
//                   onClick={() => {
//                     setIsModalOpen(false);
//                     setEditingEmployee(null);
//                   }}
//                   className="text-gray-400 hover:text-gray-600 transition-colors"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>
//             </div>

//             <form onSubmit={handleSubmit} className="p-6">
//               <div className="space-y-4">
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Full Name <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="text"
//                       name="name"
//                       required
//                       defaultValue={editingEmployee?.name}
//                       className="input"
//                       placeholder="John Doe"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Email <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="email"
//                       name="email"
//                       required
//                       defaultValue={editingEmployee?.email}
//                       className="input"
//                       placeholder="john@example.com"
//                     />
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-3 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Type <span className="text-red-500">*</span>
//                     </label>
//                     <select
//                       name="employee_type"
//                       required
//                       defaultValue={editingEmployee?.employee_type || 'Full-Time'}
//                       className="input"
//                     >
//                       <option value="Full-Time">Full-Time</option>
//                       <option value="Part-Time">Part-Time</option>
//                       <option value="Intern">Intern</option>
//                     </select>
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Hours/Day <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="number"
//                       name="working_hours_per_day"
//                       required
//                       step="0.5"
//                       min="1"
//                       max="24"
//                       defaultValue={editingEmployee?.working_hours_per_day || 8}
//                       className="input"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Hours/Week <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="number"
//                       name="weekly_availability"
//                       required
//                       step="0.5"
//                       min="1"
//                       max="168"
//                       defaultValue={editingEmployee?.weekly_availability || 40}
//                       className="input"
//                     />
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Productivity <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="number"
//                       name="productivity_baseline"
//                       required
//                       step="0.1"
//                       min="0.1"
//                       max="2.0"
//                       defaultValue={editingEmployee?.productivity_baseline || 1.0}
//                       className="input"
//                     />
//                     <p className="mt-1 text-xs text-gray-500">Range: 0.1 - 2.0</p>
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Status <span className="text-red-500">*</span>
//                     </label>
//                     <select
//                       name="status"
//                       required
//                       defaultValue={editingEmployee?.status || 'active'}
//                       className="input"
//                     >
//                       <option value="active">Active</option>
//                       <option value="inactive">Inactive</option>
//                       <option value="on-leave">On Leave</option>
//                     </select>
//                   </div>
//                 </div>

//                 {/* <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Skills (comma-separated)
//                   </label>
//                   <input
//                     type="text"
//                     name="skills"
//                     placeholder="Python, Data Analysis, Project Management"
//                     defaultValue={editingEmployee?.skills?.join(', ')}
//                     className="input"
//                   />
//                   <p className="mt-1 text-xs text-gray-500">Separate skills with commas</p>
//                 </div> */}
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Skills
//                   </label>
//                   <div className="relative">
//                     <select
//                       name="skills"
//                       multiple
//                       defaultValue={editingEmployee?.skills || []}
//                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
//                       size="5"
//                     >
//                       <option value="Data Annotation" className="py-2">Data Annotation</option>
//                       <option value="Development" className="py-2">Development</option>
//                       <option value="Robotics" className="py-2">Robotics</option>
//                       <option value="Product Management" className="py-2">Product Management</option>
//                       <option value="React" className="py-2">React</option>
//                     </select>
//                   </div>
//                   <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>

//                   <div className="mt-3">
//                     <input
//                       type="text"
//                       placeholder="Add custom skill..."
//                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
//                       onKeyPress={(e) => {
//                         if (e.key === 'Enter') {
//                           e.preventDefault();
//                           const value = e.target.value.trim();
//                           if (value) {
//                             const select = e.target.closest('div').previousElementSibling.previousElementSibling.querySelector('select');
//                             const option = new Option(value, value, false, true);
//                             select.add(option);
//                             e.target.value = '';
//                           }
//                         }
//                       }}
//                     />
//                     <p className="mt-1 text-xs text-gray-500">Press Enter to add a new skill</p>
//                   </div>
//                 </div>
//               </div>

//               <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setIsModalOpen(false);
//                     setEditingEmployee(null);
//                   }}
//                   className="btn btn-secondary"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={createMutation.isPending || updateMutation.isPending}
//                   className="btn btn-primary"
//                 >
//                   {createMutation.isPending || updateMutation.isPending
//                     ? 'Saving...'
//                     : editingEmployee
//                       ? 'Update Employee'
//                       : 'Create Employee'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default EmployeesPage;


import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi, skillApi, allocationApi } from '../services/api';
import { Plus, Edit, Trash2, X, User, ChevronDown, Search, CheckCircle, AlertCircle, Clock, ArrowUpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LEAVE_TYPE_LABELS = {
  paid: 'Paid Leave',
  casual_sick: 'Casual/Sick',
  floater: 'Floater',
};

const LEAVE_TYPE_COLORS = {
  paid: 'bg-blue-100 text-blue-700',
  casual_sick: 'bg-emerald-100 text-emerald-700',
  floater: 'bg-amber-100 text-amber-700',
};

const STATUS_COLORS = {
  approved: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
};

function formatDateRange(start, end) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return start === end ? fmt(s) : `${fmt(s)} – ${fmt(e)}`;
}

function EmployeeAvailabilityModal({ employee, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['employee-availability', employee.id],
    queryFn: () => employeeApi.getAvailability(employee.id),
    staleTime: 30_000,
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">{employee.name}</h2>
              <p className="text-sm text-slate-400">{employee.designation || 'Employee'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Loading availability...</div>
        ) : data ? (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
            {/* Availability Banner */}
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${data.available_next_30_days ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
              {data.available_next_30_days
                ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                : <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              }
              <div>
                <p className={`text-sm font-semibold ${data.available_next_30_days ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {data.available_next_30_days ? 'Available for the next 30 days' : 'Has leave/WFH in the next 30 days'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">As of {new Date(data.today + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            {/* Upcoming Leaves */}
            {(data.upcoming_leaves.length > 0 || data.upcoming_wfh.length > 0) && (
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Upcoming (Next 30 Days)</h3>
                <div className="space-y-2">
                  {data.upcoming_leaves.map((leave) => (
                    <div key={leave.leave_id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                      <div className="mt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${LEAVE_TYPE_COLORS[leave.leave_type] || 'bg-slate-100 text-slate-600'}`}>
                          {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{formatDateRange(leave.start_date, leave.end_date)}</p>
                        {leave.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{leave.reason}</p>}
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[leave.status] || 'bg-slate-100 text-slate-500'}`}>
                        {leave.status}
                      </span>
                    </div>
                  ))}
                  {data.upcoming_wfh.map((wfh) => (
                    <div key={wfh.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                      <div className="mt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                          🏠 WFH
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{new Date(wfh.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</p>
                        {wfh.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{wfh.reason}</p>}
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[wfh.status] || 'bg-slate-100 text-slate-500'}`}>
                        {wfh.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Past Leaves */}
            {(data.past_leaves.length > 0 || data.past_wfh.length > 0) && (
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Past 30 Days
                </h3>
                <div className="space-y-2">
                  {data.past_leaves.map((leave) => (
                    <div key={leave.leave_id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="mt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${LEAVE_TYPE_COLORS[leave.leave_type] || 'bg-slate-100 text-slate-600'}`}>
                          {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-600">{formatDateRange(leave.start_date, leave.end_date)}</p>
                        {leave.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{leave.reason}</p>}
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[leave.status] || 'bg-slate-100 text-slate-500'}`}>
                        {leave.status}
                      </span>
                    </div>
                  ))}
                  {data.past_wfh.map((wfh) => (
                    <div key={wfh.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="mt-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                          🏠 WFH
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-600">{new Date(wfh.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</p>
                        {wfh.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{wfh.reason}</p>}
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[wfh.status] || 'bg-slate-100 text-slate-500'}`}>
                        {wfh.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.upcoming_leaves.length === 0 && data.upcoming_wfh.length === 0 &&
             data.past_leaves.length === 0 && data.past_wfh.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No leave or WFH records in the past or next 30 days.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

const ALLOWED_DESIGNATIONS = ['Admin', 'Annotator/ Reviewer', 'Program Manager', 'Developer'];

// Custom Multi-Select Dropdown Component
const MultiSelectDropdown = ({ name, defaultValue = [], predefinedSkills, queryClient, required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState(defaultValue);
  const [customSkill, setCustomSkill] = useState('');
  const [allSkills, setAllSkills] = useState(predefinedSkills);
  const dropdownRef = useRef(null);

  // Update allSkills when predefinedSkills changes
  useEffect(() => {
    setAllSkills(predefinedSkills);
  }, [predefinedSkills]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const addCustomSkill = async () => {
    const skill = customSkill.trim();
    if (skill && !allSkills.includes(skill)) {
      // Add to local state immediately
      setAllSkills(prev => [...prev, skill]);
      setSelectedSkills(prev => [...prev, skill]);
      setCustomSkill('');

      // Create skill in backend and refresh the list
      try {
        await skillApi.create({ name: skill });
        queryClient.invalidateQueries(['skills']);
      } catch (error) {
        console.error('Failed to create skill:', error);
        toast.error('Failed to create custom skill');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomSkill();
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Hidden input to submit form data */}
      <input
        type="hidden"
        name={name}
        value={selectedSkills.join(',')}
      />

      {/* Dropdown trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white cursor-pointer flex items-center justify-between min-h-[42px]"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedSkills.length > 0 ? (
            selectedSkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 border border-blue-200"
              >
                {skill}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleSkill(skill); }}
                  className="hover:text-red-600 transition-colors"
                  title="Remove skill"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">Select skills...</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {allSkills.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No skills available. Add one below!
              </div>
            ) : (
              allSkills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <label className="flex items-center flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill)}
                      onChange={() => toggleSkill(skill)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">{skill}</span>
                  </label>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const skillObj = (queryClient.getQueryData(['skills']) || []).find(s => s.name === skill);
                        if (skillObj) {
                          await skillApi.delete(skillObj.id);
                          queryClient.invalidateQueries(['skills']);
                        }
                        setAllSkills(prev => prev.filter(s => s !== skill));
                        setSelectedSkills(prev => prev.filter(s => s !== skill));
                        toast.success(`Skill "${skill}" deleted`);
                      } catch (err) {
                        toast.error('Failed to delete skill');
                      }
                    }}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                    title="Delete skill"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add custom skill section */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add custom skill..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Press Enter or click Add</p>
          </div>
        </div>
      )}
    </div>
  );
};

const DesignationMultiSelect = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none min-w-[160px] justify-between"
      >
        <span className={value.length === 0 ? 'text-slate-500' : 'text-slate-800 font-medium'}>
          {value.length === 0 ? 'All Designations' : value.length === 1 ? value[0] : `${value.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {value.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full text-left px-4 py-1.5 text-xs text-slate-400 hover:text-slate-600 border-b border-slate-100 mb-1"
            >
              Clear all
            </button>
          )}
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={value.includes(opt)}
                onChange={() => toggle(opt)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-slate-700">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const EmployeesPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [availabilityEmployee, setAvailabilityEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState([]);
  const [idleOnly, setIdleOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeApi.getAll,
  });

  // Fetch all allocations so we can show assigned projects per employee
  const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
    queryKey: ['allocations'],
    queryFn: allocationApi.getAll,
  });

  // Build employee_id → Set<project_name> map
  const employeeProjectsMap = allocations.reduce((map, alloc) => {
    const projectName = alloc.sub_project_name || alloc.project_name;
    if (!projectName) return map;
    if (!map[alloc.employee_id]) map[alloc.employee_id] = new Set();
    map[alloc.employee_id].add(projectName);
    return map;
  }, {});

  // Fetch skills from API
  const { data: skillsData = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: skillApi.getAll,
  });

  // Extract skill names from the API response
  const predefinedSkills = skillsData.map(skill => skill.name);

  const createMutation = useMutation({
    mutationFn: employeeApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      queryClient.invalidateQueries(['skills']); // Refresh skills in case new ones were added
      setIsModalOpen(false);
      toast.success('Employee created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to create employee');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => employeeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      queryClient.invalidateQueries(['skills']); // Refresh skills in case new ones were added
      setIsModalOpen(false);
      setEditingEmployee(null);
      toast.success('Employee updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update employee');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: employeeApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      toast.success('Employee deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to delete employee');
    }
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, converted_by }) => employeeApi.convertToFulltime(id, { converted_by }),
    onSuccess: (emp) => {
      queryClient.invalidateQueries(['employees']);
      toast.success(`${emp.name} converted to Full-time`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to convert employee');
    },
  });

  const handleConvertToFulltime = (employee) => {
    if (!window.confirm(
      `Convert ${employee.name} from Intern to Full-time employee?\n\n` +
      `This updates the existing record in place — all leave, payroll, performance and ` +
      `other history is preserved. Full-time leave entitlements will apply going forward.`
    )) return;
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    convertMutation.mutate({ id: employee.id, converted_by: currentUser.id || null });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const skillsRaw = formData.get('skills');
    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (skills.length === 0) {
      toast.error('Please select at least one skill');
      return;
    }

    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      razorpay_email: formData.get('razorpay_email') || null,
      employee_type: formData.get('employee_type'),
      designation: formData.get('designation') || 'Annotator/ Reviewer',
      working_hours_per_day: parseFloat(formData.get('working_hours_per_day')),
      weekly_availability: parseFloat(formData.get('weekly_availability')),
      skills,
      // productivity_baseline removed
      status: formData.get('status') || 'active',
    };

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': 'badge-green',
      'inactive': 'badge-gray',
      'on-leave': 'badge-yellow',
    };
    return badges[status?.toLowerCase()] || 'badge-blue';
  };

  const getTypeBadge = (type) => {
    const badges = {
      'Full-time': 'badge-blue',
      'Part-time': 'badge-purple',
      'Intern': 'badge-orange',
      'Contract': 'badge-gray',
    };
    return badges[type] || 'badge-gray';
  };

  const designationOptions = Array.from(
    new Set(employees.map((employee) => employee.designation).filter(Boolean))
  ).sort();

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employee.designation && employee.designation.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSkill = !skillFilter || (employee.skills && employee.skills.includes(skillFilter));
    const matchesDesignation = designationFilter.length === 0 || designationFilter.includes(employee.designation);
    const isIdle = !employeeProjectsMap[employee.id];
    const matchesIdle = !idleOnly || isIdle;
    return matchesSearch && matchesSkill && matchesDesignation && matchesIdle;
  });

  const totalPages = Math.ceil(filteredEmployees.length / PAGE_SIZE);
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading || skillsLoading || allocationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      {/* Page Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
              <p className="text-slate-500 text-sm mt-0.5">Manage team members and their availability</p>
            </div>
            <div className="flex flex-col items-center px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
              <span className="text-2xl font-bold text-indigo-700 leading-none">{filteredEmployees.length}</span>
              <span className="text-xs text-indigo-500 mt-0.5">{filteredEmployees.length === employees.length ? 'employees' : `of ${employees.length}`}</span>
            </div>
          </div>
        </div>
        {/* Filters + Search + Add button on one row */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={skillFilter}
            onChange={(e) => { setSkillFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none bg-white"
          >
            <option value="">All Skills</option>
            {predefinedSkills.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <DesignationMultiSelect
            options={designationOptions}
            value={designationFilter}
            onChange={(val) => { setDesignationFilter(val); setCurrentPage(1); }}
          />

          <button
            onClick={() => { setIdleOnly(v => !v); setCurrentPage(1); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              idleOnly
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
            title="Show only employees not assigned to any project"
          >
            Idle Only
          </button>

          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none w-full sm:w-64"
            />
          </div>

          <button
            onClick={() => {
              setEditingEmployee(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Modern Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Employee</th>
                <th className="px-5 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Designation</th>
                <th className="px-5 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-5 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Hours/Day</th>
                <th className="px-5 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Skills</th>
                <th className="px-5 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Assigned Projects</th>
                <th className="px-5 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-16 text-center">
                    <div className="text-slate-400">
                      <p className="text-lg font-medium mb-1">No employees found</p>
                      <p className="text-sm">Try adjusting your search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmployees
                  .map((employee) => (
                    <tr key={employee.id} className="hover:bg-slate-50 transition-colors">
                      {/* Employee Info */}
                      <td className="px-5 py-4">
                        <button
                          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                          onClick={() => setAvailabilityEmployee(employee)}
                          title="View availability"
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors">{employee.name}</div>
                            <div className="text-sm text-slate-400">{employee.email}</div>
                          </div>
                        </button>
                      </td>

                      {/* Designation */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-700">{employee.designation || 'Annotator'}</span>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${employee.employee_type === 'Full-time' ? 'bg-emerald-50 text-emerald-700' :
                          employee.employee_type === 'Part-time' ? 'bg-blue-50 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                          {employee.employee_type}
                        </span>
                        {employee.converted_to_fulltime_at && (
                          <p
                            className="mt-1 text-[10px] text-slate-400"
                            title={`Promoted from ${employee.previous_employee_type || 'Intern'} on ${new Date(employee.converted_to_fulltime_at).toLocaleDateString()}`}
                          >
                            promoted {new Date(employee.converted_to_fulltime_at).toLocaleDateString()}
                          </p>
                        )}
                      </td>

                      {/* Hours */}
                      <td className="px-5 py-4 text-center">
                        <div className="font-semibold text-slate-800">{employee.working_hours_per_day}h</div>
                      </td>

                      {/* Skills */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {employee.skills && employee.skills.length > 0 ? (
                            <>
                              {employee.skills.slice(0, 3).map((skill, idx) => (
                                <span key={idx} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {skill}
                                </span>
                              ))}
                              {employee.skills.length > 3 && (
                                <span className="text-xs text-slate-400">+{employee.skills.length - 3}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* Assigned Projects */}
                      <td className="px-5 py-4">
                        {(() => {
                          const projects = employeeProjectsMap[employee.id];
                          if (!projects || projects.size === 0) {
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Idle
                              </span>
                            );
                          }
                          const list = [...projects];
                          return (
                            <div className="flex flex-wrap gap-1">
                              {list.slice(0, 2).map((name, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 max-w-[140px] truncate" title={name}>
                                  {name}
                                </span>
                              ))}
                              {list.length > 2 && (
                                <span className="text-xs text-slate-400 self-center" title={list.slice(2).join(', ')}>
                                  +{list.length - 2}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${employee.status === 'active' ? 'bg-emerald-500' :
                            employee.status === 'on-leave' ? 'bg-amber-500' :
                              'bg-slate-400'
                            }`}></span>
                          <span className="text-sm text-slate-600 capitalize">{employee.status}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {employee.employee_type === 'Intern' && (
                            <button
                              onClick={() => handleConvertToFulltime(employee)}
                              disabled={convertMutation.isPending}
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Convert to Full-time employee"
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingEmployee(employee);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const allocs = await allocationApi.getByEmployee(employee.id);
                                if (allocs && allocs.length > 0) {
                                  alert(`Cannot delete ${employee.name} as they are allocated to projects.`);
                                  return;
                                }
                                if (window.confirm(`Delete ${employee.name}?`)) {
                                  deleteMutation.mutate(employee.id);
                                }
                              } catch (err) {
                                console.error("Failed to check allocations", err);
                                // Fallback to normal delete if check fails? Or block?
                                // alert("Error checking allocations.");
                              }
                            }}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredEmployees.length)} of {filteredEmployees.length} employees
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        currentPage === p
                          ? 'bg-indigo-600 border-indigo-600 text-white font-medium'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Availability Modal */}
      {availabilityEmployee && (
        <EmployeeAvailabilityModal
          employee={availabilityEmployee}
          onClose={() => setAvailabilityEmployee(null)}
        />
      )}

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingEmployee ? 'Edit Employee' : 'Add Employee'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingEmployee(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="p-4 sm:p-6" id="employee-form">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={editingEmployee?.name}
                        className="input"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slack Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        defaultValue={editingEmployee?.email}
                        className="input"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Razorpay Email
                      </label>
                      <input
                        type="email"
                        name="razorpay_email"
                        defaultValue={editingEmployee?.razorpay_email}
                        className="input"
                        placeholder="john.razorpay@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="designation"
                        required
                        defaultValue={editingEmployee?.designation || 'Annotator/ Reviewer'}
                        className="input"
                      >
                        {ALLOWED_DESIGNATIONS.map((designation) => (
                          <option key={designation} value={designation}>
                            {designation}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="employee_type"
                        required
                        defaultValue={editingEmployee?.employee_type || 'Full-time'}
                        className="input"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Intern">Intern</option>
                        <option value="Contract">Contract</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hours/Day <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="working_hours_per_day"
                        required
                        step="0.5"
                        min="1"
                        max="24"
                        defaultValue={editingEmployee?.working_hours_per_day || 8}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hours/Week <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="weekly_availability"
                        required
                        step="0.5"
                        min="1"
                        max="168"
                        defaultValue={editingEmployee?.weekly_availability || 40}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="status"
                        required
                        defaultValue={editingEmployee?.status || 'active'}
                        className="input"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="on-leave">On Leave</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Skills
                    </label>
                    <MultiSelectDropdown
                      name="skills"
                      defaultValue={editingEmployee?.skills || []}
                      predefinedSkills={predefinedSkills}
                      queryClient={queryClient}
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Fixed Footer with Buttons */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEmployee(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="employee-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn btn-primary"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingEmployee
                    ? 'Update Employee'
                    : 'Create Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
