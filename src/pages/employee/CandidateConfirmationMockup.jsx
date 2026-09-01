import React, { useEffect, useState } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CandidateConfirmationMockup = () => {
  const navigate = useNavigate();
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("pendingCandidateConfirmation");
    if (stored) {
      setPendingConfirmation(JSON.parse(stored));
    }
  }, []);

  const handleAccept = () => {
    if (!pendingConfirmation) return;

    // Simulate backend processing
    const state = JSON.parse(localStorage.getItem("onboardingMockupState") || "{}");
    
    // Remove from unassigned pool
    const newPool = (state.pool || []).filter(c => c.id !== pendingConfirmation.id);
    
    // Add to active pipeline tracker
    const newPipeline = [...(state.pipeline || []), {
      id: Math.random(),
      candidate: pendingConfirmation.name,
      project: pendingConfirmation.assignedProject,
      buddy: pendingConfirmation.assignedBuddy,
      role: pendingConfirmation.assignedRole,
      start_date: new Date().toISOString().split('T')[0],
      days_elapsed: 0,
      status: "in_progress"
    }];

    // Update global mockup state
    localStorage.setItem("onboardingMockupState", JSON.stringify({
      ...state,
      pool: newPool,
      pipeline: newPipeline,
      activeTab: "pipeline" // Auto-switch tab to pipeline to see the result
    }));

    // Clear the pending confirmation
    localStorage.removeItem("pendingCandidateConfirmation");

    // Redirect back to Admin Tracker (Simulating the PM checking the tracker after the candidate accepts)
    navigate("/admin/onboarding-mockup");
  };

  const handleDecline = () => {
      alert("In a real scenario, this might notify HR or prevent login until resolved.");
  };

  if (!pendingConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center border border-gray-200">
            <h2 className="text-xl font-bold mb-4">No Pending Confirmations</h2>
            <p className="text-gray-500 mb-6">You don't have any onboarding tracks assigned to you at the moment.</p>
            <button onClick={()=>navigate("/admin/onboarding-mockup")} className="text-indigo-600 hover:text-indigo-800 underline font-medium">Return to Admin Tracker Mockup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center p-4 z-[9999] overflow-y-auto">
      {/* High z-index and dark background simulate "intercepting" the app immediately after login */}
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden mt-10 mb-10 relative">
        <div className="bg-indigo-600 p-8 text-white text-center relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500 rounded-full opacity-50 blur-2xl"></div>
          
          <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-indigo-200 relative z-10" />
          <h2 className="text-2xl font-bold relative z-10">Welcome to Autonex, {pendingConfirmation.name.split(' ')[0]}!</h2>
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
              <p className="font-bold text-gray-900 text-lg">{pendingConfirmation.assignedProject}</p>
            </div>
            <div className="border-b border-gray-200 pb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Buddy / Mentor</p>
              <p className="font-bold text-gray-900 text-lg">{pendingConfirmation.assignedBuddy}</p>
            </div>
            <div className="pb-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Role Designation</p>
              <p className="font-bold text-gray-900 text-lg">{pendingConfirmation.assignedRole}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleAccept}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Accept & Start Onboarding
            </button>
            <button 
              onClick={handleDecline}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
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

export default CandidateConfirmationMockup;
