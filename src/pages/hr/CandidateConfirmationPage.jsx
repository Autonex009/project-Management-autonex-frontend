import React, { useEffect } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";

const CandidateConfirmationPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding_my_status"],
    queryFn: async () => {
      const res = await api.get("/onboarding/pipeline/my-status");
      return res.data;
    }
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/onboarding/pipeline/confirm");
      return res.data;
    },
    onSuccess: () => {
      // Instead of navigating, we invalidate the query so it re-fetches and returns null,
      // unblocking the dashboard.
      queryClient.invalidateQueries(["onboarding_my_status"]);
    }
  });

  const handleAccept = () => {
    confirmMutation.mutate();
  };

  const handleDecline = () => {
      alert("In a real scenario, this might notify HR or prevent login until resolved.");
  };

  if (isLoading) {
    return null; // Fail silently while loading so we don't flash a white screen
  }

  if (!data?.has_pending || !data?.pipeline) {
    return null; // No pending assignment, don't intercept
  }

  const pipeline = data.pipeline;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center p-4 z-[9999] overflow-y-auto">
      {/* High z-index and dark background simulate "intercepting" the app immediately after login */}
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden mt-10 mb-10 relative">
        <div className="bg-indigo-600 p-8 text-white text-center relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500 rounded-full opacity-50 blur-2xl"></div>
          
          <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-indigo-200 relative z-10" />
          <h2 className="text-2xl font-bold relative z-10">Welcome to Autonex, {pipeline.candidate_name?.split(' ')[0]}!</h2>
          <p className="mt-2 text-indigo-100 relative z-10">Your onboarding track has been configured.</p>
        </div>
        
        <div className="p-8">
          <div className="flex items-start bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-8 shadow-sm">
             <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5 mr-3 flex-shrink-0" />
             <p className="text-sm text-indigo-800 leading-relaxed">
               Before you can access the portal, please review and accept your training assignment below.
             </p>
          </div>

          <div className="space-y-5 mb-10 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div className="border-b border-gray-200 pb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Assigned Project</p>
              <p className="font-bold text-gray-900 text-lg">{pipeline.project_name}</p>
            </div>
            <div className="border-b border-gray-200 pb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Buddy / Mentor</p>
              <p className="font-bold text-gray-900 text-lg">{pipeline.buddy_name}</p>
            </div>
            <div className="pb-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Role Designation</p>
              <p className="font-bold text-gray-900 text-lg">Annotator / Reviewer</p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleAccept}
              disabled={confirmMutation.isLoading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {confirmMutation.isLoading ? "Confirming..." : "Accept & Start Onboarding"}
            </button>
            <button 
              onClick={handleDecline}
              disabled={confirmMutation.isLoading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors disabled:opacity-50"
            >
              There's a mistake here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for the icon since we didn't import it directly at the top
const SparklesIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);

export default CandidateConfirmationPage;
