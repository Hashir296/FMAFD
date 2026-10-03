import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPath, initials, roleLabel } from '../../lib/roles';
import { api } from '../../api/client';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Wallet,
  Contact,
  PieChart,
  FileText,
  TrendingDown,
  TrendingUp,
  Building2,
  Users,
  ShieldAlert,
  SearchCheck,
  BookOpen,
  BarChart3,
  History,
  Settings,
  UserCog,
  Receipt,
  Network,
  Repeat,
} from 'lucide-react';

const NAV = [
  {
    group: 'Day book',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
      { label: 'Claims', to: '/claims', icon: Receipt },
    ],
  },
  {
    group: 'Books',
    items: [
      { label: 'Finance', to: '/finance', icon: Landmark },
      { label: 'Banks', to: '/banks', icon: Wallet },
      { label: 'Customers', to: '/customers', icon: Contact },
      { label: 'Budgets', to: '/budgets', icon: PieChart },
      { label: 'Departments', to: '/departments', icon: Network },
      { label: 'Recurring', to: '/recurring', icon: Repeat },
      { label: 'Invoices', to: '/invoices', icon: FileText },
      { label: 'Receivable', to: '/accounts-receivable', icon: TrendingUp },
      { label: 'Payable', to: '/accounts-payable', icon: TrendingDown },
    ],
  },
  {
    group: 'People',
    items: [
      { label: 'Vendors', to: '/vendors', icon: Building2 },
      { label: 'Employees', to: '/employees', icon: Users },
      { label: 'Team access', to: '/team', icon: UserCog },
    ],
  },
  {
    group: 'Risk',
    items: [
      { label: 'Fraud queue', to: '/fraud-detection', icon: ShieldAlert, alert: true },
      { label: 'Investigations', to: '/investigations', icon: SearchCheck },
      { label: 'Ledger notes', to: '/ai-insights', icon: BookOpen },
    ],
  },
  {
    group: 'Record',
    items: [
      { label: 'Reports', to: '/reports', icon: BarChart3 },
      { label: 'Audit log', to: '/audit-logs', icon: History },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];

export const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const { user } = useAuth();
  const [openAlerts, setOpenAlerts] = useState(0);

  useEffect(() => {
    if (!canAccessPath(user?.role, '/fraud-detection')) return;
    api.get('/fraud/alerts')
      .then((res) => {
        const open = (res.data || []).filter((alert) => ['New', 'Under Review', 'Escalated'].includes(alert.status)).length;
        setOpenAlerts(open);
      })
      .catch(() => setOpenAlerts(0));
  }, [user?.role]);

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#1C2B24]/50 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#1C2B24] text-[#E7E0D4] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-white/10 flex items-center">
          <div>
            <p className="font-serif text-2xl text-[#F7F1E8] leading-none">FinGuard</p>
            <p className="text-[11px] text-[#C9B59A] mt-1">Company finance desk</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV.map((section) => {
            const items = section.items.filter((item) => canAccessPath(user?.role, item.to));
            if (!items.length) return null;
            return (
              <div key={section.group}>
                <div className="px-3 mb-1.5 text-[11px] text-[#C9B59A]">{section.group}</div>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setIsMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-md text-[13px] ${
                          isActive ? 'bg-[#F4EFE6] text-[#1C2B24] font-medium' : 'text-[#E7E0D4] hover:bg-white/5'
                        }`
                      }
                    >
                      <span className="flex items-center gap-2.5">
                        <item.icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </span>
                      {item.alert && openAlerts > 0 && (
                        <span className="text-[11px] font-medium bg-[#C4622D] text-white px-1.5 rounded">{openAlerts}</span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-[#C9B59A] text-[#1C2B24] text-xs font-semibold flex items-center justify-center">
              {initials(user?.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-[#C9B59A] truncate">{roleLabel(user?.role)}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
