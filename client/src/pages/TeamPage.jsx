import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { STAFF_ROLES, roleLabel } from '../lib/roles';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'Employee',
  department: '',
  title: '',
};

export const TeamPage = () => {
  const { showToast, user } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setPeople(res.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async (event) => {
    event.preventDefault();
    try {
      await api.post('/auth/users', form);
      setForm(emptyForm);
      showToast('Account created. They can sign in with that email and password.', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        role: editing.role,
        status: editing.status,
        department: editing.department,
        title: editing.title,
      };
      if (editing.password) payload.password = editing.password;
      await api.patch(`/auth/users/${editing.id}`, payload);
      setEditing(null);
      showToast('Account updated', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-[#1C2B24]">Team access</h1>
        <p className="text-sm text-[#6B6256] mt-1">Only the owner can issue accounts. Signed in as {user?.name}.</p>
      </div>

      <form onSubmit={createUser} className="bg-white border border-[#DDD4C4] rounded-md p-5 grid sm:grid-cols-2 gap-3">
        <h2 className="sm:col-span-2 font-medium">New account</h2>
        {[
          ['name', 'Name', 'text'],
          ['email', 'Work email', 'email'],
          ['password', 'Temporary password', 'text'],
          ['department', 'Department', 'text'],
          ['title', 'Job title', 'text'],
        ].map(([key, label, type]) => (
          <label key={key} className="text-sm">
            <span className="text-[#6B6256]">{label}</span>
            <input
              required={key !== 'title'}
              type={type}
              value={form[key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2"
            />
          </label>
        ))}
        <label className="text-sm">
          <span className="text-[#6B6256]">Role</span>
          <select
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2 bg-white"
          >
            {STAFF_ROLES.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <button className="bg-[#1C2B24] text-[#F7F1E8] px-4 py-2 rounded-md text-sm">Create account</button>
        </div>
      </form>

      <div className="bg-white border border-[#DDD4C4] rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[#6B6256] border-b border-[#EFE8DC]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-4 py-6 text-[#6B6256]" colSpan={5}>Loading accounts…</td></tr>
            )}
            {people.map((person) => (
              <tr key={person.id} className="border-b border-[#EFE8DC]">
                <td className="px-4 py-3">
                  <p className="font-medium">{person.name}</p>
                  <p className="text-xs text-[#6B6256]">{person.email}</p>
                </td>
                <td className="px-4 py-3">{roleLabel(person.role)}</td>
                <td className="px-4 py-3">{person.department}</td>
                <td className="px-4 py-3">{person.status}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing({ ...person, password: '' })} className="text-[#8A6A3B]">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <form onSubmit={saveEdit} className="bg-white border border-[#DDD4C4] rounded-md p-5 grid sm:grid-cols-2 gap-3">
          <h2 className="sm:col-span-2 font-medium">Edit {editing.name}</h2>
          <label className="text-sm">
            Role
            <select value={editing.role === 'Super Admin' ? 'Owner' : editing.role} onChange={(e) => setEditing((prev) => ({ ...prev, role: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2 bg-white">
              {STAFF_ROLES.map((role) => <option key={role}>{role}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Status
            <select value={editing.status} onChange={(e) => setEditing((prev) => ({ ...prev, status: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2 bg-white">
              <option>Active</option>
              <option>Suspended</option>
            </select>
          </label>
          <label className="text-sm">
            Department
            <input value={editing.department || ''} onChange={(e) => setEditing((prev) => ({ ...prev, department: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">
            Title
            <input value={editing.title || ''} onChange={(e) => setEditing((prev) => ({ ...prev, title: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">
            New password (leave blank to keep the current one)
            <input value={editing.password || ''} onChange={(e) => setEditing((prev) => ({ ...prev, password: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button className="bg-[#1C2B24] text-[#F7F1E8] px-4 py-2 rounded-md text-sm">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TeamPage;
