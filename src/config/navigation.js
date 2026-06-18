import { Users, FolderKanban, Calendar, LayoutDashboard, UserCog, Layers, FileText, UserPlus, Users2, IndianRupee } from 'lucide-react';

export const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/admin/projects', icon: Layers },
    { name: 'Sub-Projects', href: '/admin/sub-projects', icon: FolderKanban },
    { name: 'Employees', href: '/admin/employees', icon: Users },
    { name: 'Signup Requests', href: '/admin/signup-requests', icon: UserPlus },
    { name: 'Allocations', href: '/admin/allocations', icon: UserCog },
    { name: 'Leaves', href: '/admin/leaves', icon: Calendar },
    { name: 'Payroll', href: '/admin/payroll', icon: IndianRupee },
    { name: 'Referrals', href: '/admin/referrals', icon: Users2 },
    { name: 'Guidelines', href: '/admin/guidelines', icon: FileText },
];
