import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, BarChart2, Star } from "lucide-react";
import api from "../../services/api";

const HRDashboard = () => {
  // Fetch pending leaves
  const { data: leaves = [] } = useQuery({
    queryKey: ["leaves-all"],
    queryFn: async () => {
      const res = await api.get("/leaves");
      return res.data;
    },
  });

  const pendingLeaves = leaves.filter((l) => l.status === "Pending");

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HR Operations Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of pending actions, employee stats, and leave approvals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Widget 1: Onboarding Pipeline */}
        <Link to="/hr/onboarding-pipeline" className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Onboarding Pipeline</h3>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">Active</p>
          <p className="mt-2 text-sm text-blue-600 font-medium">Manage pipeline →</p>
        </Link>

        {/* Widget 2: Pending Leaves */}
        <Link to="/hr/leaves" className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Pending Leaves</h3>
            <Calendar className="w-5 h-5 text-purple-500" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{pendingLeaves.length}</p>
          <p className="mt-2 text-sm text-purple-600 font-medium">Review requests →</p>
        </Link>

        {/* Widget 3: Employees */}
        <Link to="/hr/employees" className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Employee Roster</h3>
            <BarChart2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">View All</p>
          <p className="mt-2 text-sm text-emerald-600 font-medium">Manage directory →</p>
        </Link>

        {/* Widget 4: Performance */}
        <Link to="/hr/performance" className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Performance</h3>
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">Reviews</p>
          <p className="mt-2 text-sm text-amber-600 font-medium">View scores →</p>
        </Link>
      </div>
    </div>
  );
};

export default HRDashboard;
