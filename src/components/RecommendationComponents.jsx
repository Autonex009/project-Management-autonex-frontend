import {
  Activity,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  AlertCircle as Alert,
} from "lucide-react";

/**
 * Recommendation Card Component
 * Displays capacity analysis and recommendations for a project
 */
const RecommendationCard = ({ projectId, projectName, recommendations }) => {
  if (!recommendations) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">{projectName}</h3>
        </div>
        <p className="text-sm text-gray-500">Loading recommendations...</p>
      </div>
    );
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case "overburdened":
        return {
          color: "red",
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-800",
          icon: AlertTriangle,
        };
      case "balanced":
        return {
          color: "green",
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-800",
          icon: CheckCircle,
        };
      case "underutilized":
      case "significantly_underutilized":
        return {
          color: "yellow",
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          text: "text-yellow-800",
          icon: TrendingUp,
        };
      default:
        return {
          color: "gray",
          bg: "bg-gray-50",
          border: "border-gray-200",
          text: "text-gray-800",
          icon: Alert,
        };
    }
  };

  const config = getStatusConfig(recommendations.status);
  const StatusIcon = config.icon;

  return (
    <div className={`border ${config.border} rounded-lg p-6 ${config.bg}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-5 h-5 ${config.text}`} />
          <h3 className="font-semibold text-gray-900">{projectName}</h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${config.bg} ${config.text} border ${config.border}`}
        >
          {recommendations.status.replace("_", " ")}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-md p-3 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Utilization</p>
          <p className="text-xl font-bold text-gray-900">
            {(recommendations.utilization_ratio * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-md p-3 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Team Size</p>
          <p className="text-xl font-bold text-gray-900 flex items-center gap-1">
            <Users className="w-4 h-4" />
            {recommendations.team_size}
          </p>
        </div>
        <div className="bg-white rounded-md p-3 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Working Days</p>
          <p className="text-xl font-bold text-gray-900 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {recommendations.working_days}
          </p>
        </div>
      </div>

      {/* Capacity Details */}
      <div className="bg-white rounded-md p-4 border border-gray-200 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Workload</span>
          <span className="text-sm font-bold text-gray-900">
            {recommendations.total_estimated_hours}h
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Net Capacity
          </span>
          <span className="text-sm font-bold text-gray-900">
            {recommendations.net_capacity}h
          </span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${recommendations.utilization_ratio > 1.1 ? "bg-red-600" : recommendations.utilization_ratio >= 0.7 ? "bg-green-600" : "bg-yellow-600"}`}
            style={{
              width: `${Math.min(recommendations.utilization_ratio * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.recommendations &&
        recommendations.recommendations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase mb-2">
              Recommendations
            </p>
            <ul className="space-y-2">
              {recommendations.recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span
                    className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${config.text} mt-1.5`}
                  />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
};

/**
 * Capacity Analysis Component
 * Extended analysis with daily breakdown
 */
const CapacityAnalysis = ({ recommendations }) => {
  if (!recommendations || !recommendations.daily_breakdown) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <h4 className="font-semibold text-gray-900 mb-4">
        Daily Capacity Breakdown
      </h4>

      <div className="space-y-3">
        {recommendations.daily_breakdown.map((day, idx) => (
          <div
            key={idx}
            className="border border-gray-100 rounded-md p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {new Date(day.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-sm font-bold text-gray-900">
                {day.total_hours}h
              </span>
            </div>

            {day.employees && day.employees.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {day.employees.map((emp, empIdx) => (
                  <span
                    key={empIdx}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      emp.status === "on_leave"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                    title={`${emp.employee_name}: ${emp.hours}h`}
                  >
                    {emp.employee_name?.split(" ")[0]} ({emp.hours}h)
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export { RecommendationCard, CapacityAnalysis };
