import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge, RiskBadge } from '../components/common/Badge';
import { DataTable } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { isOwner } from '../lib/roles';
import { Users, Search, DollarSign, UserCheck, Eye } from 'lucide-react';

const emptyForm = {
  name: '',
  email: '',
  department: '',
  role: '',
  jobTitle: '',
  phone: '',
  location: '',
  salary: '',
  monthlySpendLimit: '5000',
};

export const EmployeesPage = () => {
  const { user, showToast } = useAuth();
  const canEdit = isOwner(user?.role) || user?.role === 'Finance Manager';
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [confirmPayroll, setConfirmPayroll] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...(search && { search }),
        ...(departmentFilter !== 'All' && { department: departmentFilter }),
      };
      const res = await api.get('/employees', params);
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const fmt = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);

  const departments = ['All', ...new Set(employees.map((e) => e.department).filter(Boolean))];
  const payrollKnown = employees.filter((e) => e.salary > 0);
  const totalPayroll = payrollKnown.reduce((s, e) => s + e.salary, 0);
  const activeCount = employees.filter((e) => (e.status || '').toLowerCase() === 'active').length;

  const createEmployee = async (event) => {
    event.preventDefault();
    try {
      await api.post('/employees', {
        ...form,
        salary: Number(form.salary) || 0,
        monthlySpendLimit: Number(form.monthlySpendLimit) || 0,
      });
      setForm(emptyForm);
      setShowForm(false);
      showToast('Employee added to the register', 'success');
      fetchEmployees();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Employee',
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.name}</p>
          <p className="text-xs text-[#6B6256]">{row.jobTitle || row.role}</p>
        </div>
      ),
    },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'risk', label: 'Risk', render: (row) => <RiskBadge level={row.riskLevel} score={row.riskScore} /> },
    {
      key: 'spend',
      label: 'This month',
      render: (row) => <span>{fmt(row.currentMonthSpend)} / {fmt(row.monthlySpendLimit)}</span>,
    },
    {
      key: 'salary',
      label: 'Salary',
      render: (row) => <span>{row.salary > 0 ? `${fmt(row.salary)}/yr` : 'Not set'}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button onClick={() => setSelectedEmployee(row)} className="p-1.5 text-[#6B6256] hover:text-[#1C2B24]">
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl text-[#1C2B24]">Employees</h1>
          <p className="text-sm text-[#6B6256] mt-1">Staff register, spend limits, and salary only where it has been entered.</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!confirmPayroll) {
                  setConfirmPayroll(true);
                  return;
                }
                try {
                  const res = await api.post('/employees/payroll');
                  showToast(`Posted ${res.count} salaries, ${fmt(res.total)}, from ${res.account}.`, 'success');
                } catch (err) {
                  showToast(err.message, 'error');
                } finally {
                  setConfirmPayroll(false);
                }
              }}
              className="border border-[#1C2B24] px-3 py-2 rounded-md text-sm"
            >
              {confirmPayroll ? 'Confirm payroll' : 'Run payroll'}
            </button>
            <button onClick={() => setShowForm((v) => !v)} className="bg-[#1C2B24] text-[#F7F1E8] px-3 py-2 rounded-md text-sm">
              Add employee
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="On the register" value={employees.length} icon={Users} iconBg="bg-[#E7EFE8] text-[#1F4D3A]" loading={loading} />
        <StatCard title="Active" value={activeCount} icon={UserCheck} iconBg="bg-[#E7EFE8] text-[#1F4D3A]" loading={loading} />
        <StatCard title="Salary on file" value={fmt(totalPayroll)} subtext={`${payrollKnown.length} people have a salary`} icon={DollarSign} iconBg="bg-[#F3E6D8] text-[#8A6A3B]" loading={loading} />
      </div>

      {showForm && (
        <form onSubmit={createEmployee} className="bg-white border border-[#DDD4C4] rounded-md p-5 grid sm:grid-cols-2 gap-3">
          {[
            ['name', 'Name'],
            ['email', 'Email'],
            ['department', 'Department'],
            ['role', 'Role'],
            ['jobTitle', 'Job title'],
            ['phone', 'Phone'],
            ['location', 'Location'],
            ['salary', 'Annual salary'],
            ['monthlySpendLimit', 'Monthly spend limit'],
          ].map(([key, label]) => (
            <label key={key} className="text-sm">
              <span className="text-[#6B6256]">{label}</span>
              <input
                required={['name', 'email', 'department', 'role'].includes(key)}
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2"
              />
            </label>
          ))}
          <div className="sm:col-span-2">
            <button className="bg-[#1C2B24] text-[#F7F1E8] px-4 py-2 rounded-md text-sm">Save employee</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-[#DDD4C4] rounded-md p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6256]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees"
            className="w-full pl-9 pr-4 py-2 text-sm border border-[#DDD4C4] rounded-md"
          />
        </div>
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="px-3 py-2 text-sm border border-[#DDD4C4] rounded-md bg-white">
          {departments.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={employees} isLoading={loading} emptyMessage="No employees found" />

      <Modal isOpen={!!selectedEmployee} onClose={() => setSelectedEmployee(null)} title={selectedEmployee?.name}>
        {selectedEmployee && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-[#6B6256]">Department</p><p>{selectedEmployee.department}</p></div>
            <div><p className="text-xs text-[#6B6256]">Status</p><StatusBadge status={selectedEmployee.status} /></div>
            <div><p className="text-xs text-[#6B6256]">Role</p><p>{selectedEmployee.jobTitle || selectedEmployee.role}</p></div>
            <div><p className="text-xs text-[#6B6256]">Salary</p><p>{selectedEmployee.salary > 0 ? fmt(selectedEmployee.salary) : 'Not set'}</p></div>
            <div><p className="text-xs text-[#6B6256]">Email</p><p>{selectedEmployee.email}</p></div>
            <div><p className="text-xs text-[#6B6256]">Joined</p><p>{selectedEmployee.joinedDate ? new Date(selectedEmployee.joinedDate).toLocaleDateString() : '—'}</p></div>
            <div><p className="text-xs text-[#6B6256]">Month spend</p><p>{fmt(selectedEmployee.currentMonthSpend)} of {fmt(selectedEmployee.monthlySpendLimit)}</p></div>
            <div><p className="text-xs text-[#6B6256]">Phone</p><p>{selectedEmployee.phone || '—'}</p></div>
          </div>
        )}
      </Modal>
    </div>
  );
};
