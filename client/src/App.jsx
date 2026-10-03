import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/common/Sidebar';
import { Navbar } from './components/common/Navbar';
import { ToastContainer } from './components/common/ToastContainer';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { useAuth } from './context/AuthContext';
import { canAccessPath } from './lib/roles';
import { LoginPage } from './pages/LoginPage';

import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ClaimsPage } from './pages/ClaimsPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { RecurringPage } from './pages/RecurringPage';
import { FinancePage } from './pages/FinancePage';
import { BudgetsPage } from './pages/BudgetsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { AccountsReceivablePage } from './pages/AccountsReceivablePage';
import { AccountsPayablePage } from './pages/AccountsPayablePage';
import { VendorsPage } from './pages/VendorsPage';
import { BanksPage } from './pages/BanksPage';
import { CustomersPage } from './pages/CustomersPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { TeamPage } from './pages/TeamPage';
import { FraudDetectionPage } from './pages/FraudDetectionPage';
import { InvestigationsPage } from './pages/InvestigationsPage';
import { AIInsightsPage } from './pages/AIInsightsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

function Guard({ path, children }) {
  const { user } = useAuth();
  if (!canAccessPath(user?.role, path)) {
    return (
      <div className="max-w-lg border border-[#D9D0C3] bg-white rounded-md p-6">
        <h1 className="font-serif text-3xl">This desk is closed for your role</h1>
        <p className="text-sm text-[#6B6256] mt-2">
          {user?.name} is signed in as {user?.role}. Ask the owner if this work should be on your account.
        </p>
      </div>
    );
  }
  return children;
}

function AppLayout({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { toasts, removeToast } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-[#EFE8DC]">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <div className="flex flex-col flex-1 min-w-0 lg:ml-64">
        <Navbar onMenuClick={() => setIsMobileOpen(true)} onOpenSearch={() => setIsSearchOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EFE8DC] flex items-center justify-center font-serif text-2xl text-[#1C2B24]">
        Opening the ledger…
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Guard path="/"><DashboardPage /></Guard>} />
        <Route path="/transactions" element={<Guard path="/transactions"><TransactionsPage /></Guard>} />
        <Route path="/claims" element={<Guard path="/claims"><ClaimsPage /></Guard>} />
        <Route path="/departments" element={<Guard path="/departments"><DepartmentsPage /></Guard>} />
        <Route path="/recurring" element={<Guard path="/recurring"><RecurringPage /></Guard>} />
        <Route path="/finance" element={<Guard path="/finance"><FinancePage /></Guard>} />
        <Route path="/budgets" element={<Guard path="/budgets"><BudgetsPage /></Guard>} />
        <Route path="/invoices" element={<Guard path="/invoices"><InvoicesPage /></Guard>} />
        <Route path="/accounts-receivable" element={<Guard path="/accounts-receivable"><AccountsReceivablePage /></Guard>} />
        <Route path="/accounts-payable" element={<Guard path="/accounts-payable"><AccountsPayablePage /></Guard>} />
        <Route path="/banks" element={<Guard path="/banks"><BanksPage /></Guard>} />
        <Route path="/customers" element={<Guard path="/customers"><CustomersPage /></Guard>} />
        <Route path="/vendors" element={<Guard path="/vendors"><VendorsPage /></Guard>} />
        <Route path="/employees" element={<Guard path="/employees"><EmployeesPage /></Guard>} />
        <Route path="/team" element={<Guard path="/team"><TeamPage /></Guard>} />
        <Route path="/fraud-detection" element={<Guard path="/fraud-detection"><FraudDetectionPage /></Guard>} />
        <Route path="/investigations" element={<Guard path="/investigations"><InvestigationsPage /></Guard>} />
        <Route path="/ai-insights" element={<Guard path="/ai-insights"><AIInsightsPage /></Guard>} />
        <Route path="/reports" element={<Guard path="/reports"><ReportsPage /></Guard>} />
        <Route path="/audit-logs" element={<Guard path="/audit-logs"><AuditLogsPage /></Guard>} />
        <Route path="/settings" element={<Guard path="/settings"><SettingsPage /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
