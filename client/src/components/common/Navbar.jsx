import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { canAccessPath, initials, roleLabel } from '../../lib/roles';
import { Menu, Bell, Search, LogOut } from 'lucide-react';

export const Navbar = ({ onMenuClick, onOpenSearch }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!canAccessPath(user?.role, '/fraud-detection') || user?.preferences?.fraudAlerts === false) return;
    api.get('/fraud/alerts')
      .then((res) => {
        setAlerts((res.data || []).filter((alert) => ['New', 'Under Review', 'Escalated'].includes(alert.status)).slice(0, 6));
      })
      .catch(() => setAlerts([]));
  }, [user?.role, user?.preferences?.fraudAlerts]);

  return (
    <header className="h-16 bg-[#F7F1E8] border-b border-[#DDD4C4] sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-md text-[#2C261C] hover:bg-[#E7DFD2]">
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 w-full max-w-xs text-sm bg-white border border-[#DDD4C4] rounded-md text-[#6B6256] text-left"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 truncate">Search the books</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden md:inline text-sm text-[#6B6256]">{roleLabel(user?.role)}</span>

        {canAccessPath(user?.role, '/fraud-detection') && (
          <div className="relative">
            <button
              onClick={() => setNotifOpen((open) => !open)}
              className="relative p-2 rounded-md text-[#2C261C] hover:bg-[#E7DFD2]"
            >
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#C4622D]" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#DDD4C4] rounded-md shadow-lg z-50 p-3 text-sm">
                <p className="font-medium text-[#1C2B24] pb-2 border-b border-[#EFE8DC]">Open fraud alerts</p>
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="text-[#6B6256] py-3 text-center">Nothing is waiting.</p>
                  ) : (
                    alerts.map((alert) => (
                      <button
                        key={alert._id}
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/fraud-detection');
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-[#F7F1E8]"
                      >
                        <div className="flex justify-between gap-3 font-medium">
                          <span className="truncate">{alert.detectionType}</span>
                          <span>${(alert.amount || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-[#6B6256] truncate">{alert.entityName}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="w-8 h-8 rounded-full bg-[#1C2B24] text-[#F4EFE6] text-xs font-semibold flex items-center justify-center">
          {initials(user?.name)}
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-md text-[#2C261C] hover:bg-[#E7DFD2]"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
