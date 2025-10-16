
import React, { useState, lazy, Suspense } from 'react';
import Layout from './components/Layout';
import type { View } from './types';
import { useSupabaseData } from './hooks/useSupabaseData';

// Lazy load all the views for code-splitting
const DashboardView = lazy(() => import('./views/DashboardView'));
const InventoryView = lazy(() => import('./views/InventoryView'));
const ForecastingView = lazy(() => import('./views/ForecastingView'));
const SalesView = lazy(() => import('./views/SalesView'));
const MenuView = lazy(() => import('./views/MenuView'));
const OperationalView = lazy(() => import('./views/OperationalView'));
const WasteView = lazy(() => import('./views/WasteView'));
const ProfitLossView = lazy(() => import('./views/ProfitLossView'));
const PerformanceAnalysisView = lazy(() => import('./views/PerformanceAnalysisView'));
const SuppliersView = lazy(() => import('./views/SuppliersView'));
const IntegrationsView = lazy(() => import('./views/IntegrationsView'));
const OnboardingView = lazy(() => import('./views/OnboardingView'));
const ProfileView = lazy(() => import('./views/ProfileView'));

function App() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(() => localStorage.getItem('onboardingComplete') === 'true');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [viewProps, setViewProps] = useState<Record<string, any>>({});

  const {
      loading,
      outlets,
      currentOutletId,
      setCurrentOutletId,
      notifications,
      markNotificationsAsRead
  } = useSupabaseData();

  const handleNavigate = (view: View, props: Record<string, any> = {}) => {
    setCurrentView(view);
    setViewProps(props);
    window.scrollTo(0, 0);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboardingComplete', 'true');
    setIsOnboardingComplete(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Memuat data...</div>;
  }

  if (!isOnboardingComplete) {
    return <OnboardingView onComplete={handleOnboardingComplete} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'inventory':
        return <InventoryView {...viewProps} />;
      case 'waste':
        return <WasteView />;
      case 'forecasting':
        return <ForecastingView />;
      case 'sales':
        return <SalesView />;
      case 'menu':
        return <MenuView />;
      case 'operational':
        return <OperationalView />;
      case 'profitLoss':
        return <ProfitLossView />;
      case 'performanceAnalysis':
        return <PerformanceAnalysisView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'integrations':
        return <IntegrationsView />;
      case 'profile':
        return <ProfileView />;
      case 'dashboard':
      default:
        return <DashboardView onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout 
        currentView={currentView} 
        onNavigate={handleNavigate}
        outlets={outlets}
        currentOutletId={currentOutletId}
        onOutletChange={setCurrentOutletId}
        notifications={notifications}
        onMarkNotificationsAsRead={markNotificationsAsRead}
    >
      <Suspense fallback={<div className="flex items-center justify-center h-full text-white">Memuat...</div>}>
        {renderView()}
      </Suspense>
    </Layout>
  );
}

export default App;
