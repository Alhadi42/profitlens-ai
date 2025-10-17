import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import AiAssistantChat from './AiAssistantChat';
import BottomNavBar from './BottomNavBar';
import type { View, Outlet, Notification } from '../types';

interface LayoutProps {
  currentView: string;
  onNavigate: (view: View, props?: Record<string, any>) => void;
  children: React.ReactNode;
  outlets: Outlet[];
  currentOutletId: string;
  onOutletChange: (id: string) => void;
  notifications: Notification[];
  onMarkNotificationsAsRead: (ids: string[]) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
    currentView, 
    onNavigate, 
    children,
    outlets,
    currentOutletId,
    onOutletChange,
    notifications,
    onMarkNotificationsAsRead
}) => {
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar 
        currentView={currentView} 
        onNavigate={onNavigate}
      />
      <div className="flex-1 flex flex-col overflow-hidden lg:pl-64 pb-16 lg:pb-0">
        <Header 
            outlets={outlets}
            currentOutletId={currentOutletId}
            onOutletChange={onOutletChange}
            notifications={notifications}
            onNavigate={onNavigate}
            onMarkNotificationsAsRead={onMarkNotificationsAsRead}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <AiAssistantChat />
      <BottomNavBar currentView={currentView} onNavigate={onNavigate} />
    </div>
  );
};

export default Layout;