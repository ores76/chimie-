import React from 'react';
import { IPT_LOGO_MODERN_B64 } from '../constants';
import { type User, type Page, Role } from '../types';
import { DashboardIcon, FlaskIcon, UsersIcon, ArchiveIcon, InventoryIcon, ChartBarIcon, BellIcon, SparklesIcon, EnvelopeIcon, HistoryIcon } from './icons/Icons';

interface SidebarProps {
  user: User;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  pendingSubmissionsCount: number;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  notificationCount?: number;
}> = ({ icon, label, isActive, onClick, notificationCount = 0 }) => (
  <li>
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`flex items-center p-3 my-1 rounded-lg transition-colors text-base font-medium ${
        isActive
          ? 'bg-white/20 text-white'
          : 'text-gray-200 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      <span className="ml-3 flex-1 whitespace-nowrap">{label}</span>
      {notificationCount > 0 && (
        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">{notificationCount}</span>
      )}
    </a>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ user, currentPage, setCurrentPage, isSidebarOpen, setSidebarOpen, pendingSubmissionsCount }) => {

  const handleNavigation = (page: Page) => {
    setCurrentPage(page);
    if (window.innerWidth < 1024) { // Close sidebar on mobile after navigation
      setSidebarOpen(false);
    }
  };

  const adminNavItems: { page: Page; label: string; icon: React.ReactNode; notificationCount?: number }[] = [
    { page: 'dashboard', label: 'Tableau de bord', icon: <DashboardIcon className="w-6 h-6" />, notificationCount: pendingSubmissionsCount },
    { page: 'products', label: 'Produits Chimiques', icon: <FlaskIcon className="w-6 h-6" /> },
    { page: 'users', label: 'Utilisateurs', icon: <UsersIcon className="w-6 h-6" /> },
    { page: 'depots', label: 'Dépôts/Labos', icon: <ArchiveIcon className="w-6 h-6" /> },
    { page: 'depot-management', label: 'Gestion Inventaire Dépôts', icon: <InventoryIcon className="w-6 h-6" /> },
    { page: 'movements', label: 'Gestion Mouvements', icon: <EnvelopeIcon className="w-6 h-6" /> },
    { page: 'history', label: 'Historique Mouvements', icon: <HistoryIcon className="w-6 h-6" /> },
    { page: 'ai-analysis', label: 'Analyse IA Avancée', icon: <SparklesIcon className="w-6 h-6" /> },
    { page: 'statistics', label: 'Statistiques', icon: <ChartBarIcon className="w-6 h-6" /> },
    { page: 'alerts', label: 'Alertes', icon: <BellIcon className="w-6 h-6" /> },
  ];

  const depotNavItems: { page: Page; label: string; icon: React.ReactNode; notificationCount?: number }[] = [
    { page: 'depot-inventory', label: 'Gestion d\'Inventaire', icon: <InventoryIcon className="w-6 h-6" /> },
    { page: 'ai-analysis', label: 'Analyse IA Avancée', icon: <SparklesIcon className="w-6 h-6" /> },
  ];

  const navigationItems = user.role === Role.Admin ? adminNavItems : depotNavItems;

  return (
    <>
      <aside className={`fixed lg:relative inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-ipt-dark-blue to-ipt-blue shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-center h-20 border-b border-white/10">
                <img src={IPT_LOGO_MODERN_B64} alt="IPT Logo" className="h-10 w-10" />
                <span className="ml-3 text-xl font-semibold text-white">IPT Gestion</span>
            </div>
            <nav className="flex-1 px-3 py-4">
                <ul className="space-y-2">
                    {navigationItems.map(item => (
                        <NavItem
                            key={item.page}
                            icon={item.icon}
                            label={item.label}
                            isActive={currentPage === item.page}
                            onClick={() => handleNavigation(item.page)}
                            notificationCount={item.notificationCount}
                        />
                    ))}
                </ul>
            </nav>
        </div>
      </aside>
       {/* Overlay for mobile */}
       {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)}></div>}
    </>
  );
};

export default Sidebar;