import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { roleLabel } from '../lib/roles';

export const SettingsPage = () => {
  const { user, refreshUser, showToast } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    title: user?.title || '',
    department: user?.department || '',
  });
  const [prefs, setPrefs] = useState({
    fraudAlerts: user?.preferences?.fraudAlerts !== false,
    weeklyReports: user?.preferences?.weeklyReports !== false,
    budgetWarnings: user?.preferences?.budgetWarnings !== false,
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/profile', { ...profile, preferences: prefs });
      await refreshUser();
      showToast('Profile saved', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    try {
      await api.post('/auth/change-password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      showToast('Password updated', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-4xl text-[#1C2B24]">Settings</h1>
        <p className="text-sm text-[#6B6256] mt-1">{roleLabel(user?.role)} · {user?.email}</p>
      </div>

      <form onSubmit={saveProfile} className="bg-white border border-[#DDD4C4] rounded-md p-5 space-y-4">
        <h2 className="font-medium">Your record</h2>
        {['name', 'title', 'department', 'phone'].map((field) => (
          <label key={field} className="block text-sm">
            <span className="capitalize text-[#6B6256]">{field}</span>
            <input
              value={profile[field]}
              onChange={(e) => setProfile((prev) => ({ ...prev, [field]: e.target.value }))}
              className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2"
            />
          </label>
        ))}
        <div className="space-y-2 text-sm">
          {[
            ['fraudAlerts', 'Show fraud alerts in the header'],
            ['weeklyReports', 'Include me on weekly report notes'],
            ['budgetWarnings', 'Warn me when a budget crosses its line'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={() => setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))}
              />
              {label}
            </label>
          ))}
        </div>
        <button disabled={saving} className="bg-[#1C2B24] text-[#F7F1E8] px-4 py-2 rounded-md text-sm">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>

      <form onSubmit={savePassword} className="bg-white border border-[#DDD4C4] rounded-md p-5 space-y-4">
        <h2 className="font-medium">Password</h2>
        <input
          type="password"
          required
          placeholder="Current password"
          value={passwords.currentPassword}
          onChange={(e) => setPasswords((prev) => ({ ...prev, currentPassword: e.target.value }))}
          className="w-full border border-[#DDD4C4] rounded-md px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="New password (8+ characters)"
          value={passwords.newPassword}
          onChange={(e) => setPasswords((prev) => ({ ...prev, newPassword: e.target.value }))}
          className="w-full border border-[#DDD4C4] rounded-md px-3 py-2 text-sm"
        />
        <button className="bg-[#1C2B24] text-[#F7F1E8] px-4 py-2 rounded-md text-sm">Update password</button>
      </form>
    </div>
  );
};

export default SettingsPage;
