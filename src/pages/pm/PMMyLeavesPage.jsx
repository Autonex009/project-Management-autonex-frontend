import MyLeavesPanel from '../../components/MyLeavesPanel';

// PM self-service leave & WFH. Mirrors the employee experience exactly (shared
// MyLeavesPanel); PM requests route to Admin for approval/rejection.
const PMMyLeavesPage = () => (
    <MyLeavesPanel
        title="My Leaves & Attendance"
        subtitle="Apply for leave or WFH — requests are routed to Admin for approval"
    />
);

export default PMMyLeavesPage;
