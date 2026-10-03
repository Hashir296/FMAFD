import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SEEDED_ACCOUNTS = [
  ['alex.vance@finguard.internal', 'Owner'],
  ['marcus.sterling@finguard.internal', 'Finance Manager'],
  ['sarah.chen@finguard.internal', 'Accountant'],
  ['elena.rostova@finguard.internal', 'Fraud Analyst'],
  ['david.kim@finguard.internal', 'Department Manager'],
  ['jessica.miller@finguard.internal', 'Employee'],
];

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('alex.vance@finguard.internal');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    await login(email.trim(), password);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#EFE8DC] text-[#2C261C] flex">
      <div className="hidden lg:flex w-[42%] bg-[#1C2B24] text-[#F4EFE6] flex-col justify-between p-12">
        <div>
          <p className="text-xs tracking-[0.18em] uppercase text-[#C9B59A]">FinGuard</p>
          <h1 className="font-serif text-5xl leading-tight mt-6">The company ledger, with the risk desk beside it.</h1>
        </div>
        <p className="text-sm text-[#D9CFC2] max-w-sm">
          Owner, managers, accountants, fraud analysts, and employees each sign in to their own account. The books are the same database.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <p className="text-xs tracking-[0.16em] uppercase text-[#8A6A3B]">Staff sign in</p>
          <h2 className="font-serif text-4xl mt-2">Open the desk</h2>
          <p className="text-sm text-[#6B6256] mt-2">Use the email and password the owner issued.</p>

          <label className="block mt-8 text-sm font-medium">Work email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full bg-white border border-[#D9D0C3] rounded-md px-3 py-2.5 text-sm outline-none focus:border-[#1C2B24]"
          />

          <label className="block mt-4 text-sm font-medium">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full bg-white border border-[#D9D0C3] rounded-md px-3 py-2.5 text-sm outline-none focus:border-[#1C2B24]"
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full bg-[#1C2B24] text-[#F4EFE6] py-2.5 rounded-md text-sm font-medium hover:bg-[#24382F] disabled:opacity-60"
          >
            {submitting ? 'Checking…' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => setShowDirectory((v) => !v)}
            className="mt-4 text-sm text-[#8A6A3B] underline underline-offset-2"
          >
            Seeded company accounts
          </button>
          {showDirectory && (
            <div className="mt-3 border border-[#D9D0C3] bg-white rounded-md p-3 text-sm">
              <p className="text-[#6B6256]">Initial password for every seeded account: FinGuard2026!</p>
              <ul className="mt-2 space-y-1">
                {SEEDED_ACCOUNTS.map(([accountEmail, role]) => (
                  <li key={accountEmail}>
                    <button type="button" className="text-left hover:underline" onClick={() => setEmail(accountEmail)}>
                      {accountEmail}
                    </button>
                    <span className="text-[#6B6256]"> · {role}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
