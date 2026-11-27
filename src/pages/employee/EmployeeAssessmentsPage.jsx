import MyAssessmentsPanel from "../../components/training/MyAssessmentsPanel";

/**
 * Employee sidebar → "My Assessments".
 * Tests assigned to the signed-in employee (take / resume / retake) and their own result history.
 */
const EmployeeAssessmentsPage = () => (
  <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 py-6 space-y-5">
    <div>
      <h1 className="text-xl font-semibold text-slate-900">My Assessments</h1>
      <p className="text-sm text-slate-500 mt-1">
        Take the tests assigned to you and review your results.
      </p>
    </div>
    <MyAssessmentsPanel />
  </div>
);

export default EmployeeAssessmentsPage;
