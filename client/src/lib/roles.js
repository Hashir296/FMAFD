export const ROLE_LABELS = {
  Owner: 'Owner',
  'Super Admin': 'Owner',
  'Finance Manager': 'Finance Manager',
  Accountant: 'Accountant',
  'Fraud Analyst': 'Fraud Analyst',
  'Department Manager': 'Department Manager',
  Employee: 'Employee',
};

export const STAFF_ROLES = [
  'Owner',
  'Finance Manager',
  'Accountant',
  'Fraud Analyst',
  'Department Manager',
  'Employee',
];

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || 'Staff';
}

export function isOwner(role) {
  return role === 'Owner' || role === 'Super Admin';
}

const ACCESS = {
  '/': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Fraud Analyst', 'Department Manager', 'Employee'],
  '/transactions': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Fraud Analyst', 'Department Manager', 'Employee'],
  '/claims': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Fraud Analyst', 'Department Manager', 'Employee'],
  '/departments': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Department Manager'],
  '/recurring': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant'],
  '/finance': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant'],
  '/budgets': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Department Manager'],
  '/invoices': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant'],
  '/accounts-receivable': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant'],
  '/accounts-payable': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant'],
  '/banks': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant'],
  '/customers': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant'],
  '/vendors': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Fraud Analyst'],
  '/employees': ['Owner', 'Super Admin', 'Finance Manager', 'Department Manager'],
  '/team': ['Owner', 'Super Admin'],
  '/fraud-detection': ['Owner', 'Super Admin', 'Finance Manager', 'Fraud Analyst'],
  '/investigations': ['Owner', 'Super Admin', 'Finance Manager', 'Fraud Analyst'],
  '/ai-insights': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Fraud Analyst', 'Department Manager'],
  '/reports': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Fraud Analyst', 'Department Manager'],
  '/audit-logs': ['Owner', 'Super Admin', 'Finance Manager', 'Fraud Analyst'],
  '/settings': ['Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Fraud Analyst', 'Department Manager', 'Employee'],
};

export function canAccessPath(role, path) {
  return (ACCESS[path] || []).includes(role);
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}
