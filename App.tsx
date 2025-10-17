import React, { useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import SkeletonLoader from './components/SkeletonLoader';
import ConnectionStatus from './components/ConnectionStatus';
import type { View } from './types';
import { useSupabaseData } from './hooks/useSupabaseData';
import { safeLocalStorage } from './utils/performance';

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
const AuthView = lazy(() => import('./views/AuthView'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <SkeletonLoader />
  </div>
);

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(() => 
    safeLocalStorage.getItem('onboardingComplete') === 'true'
  );
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [viewProps, setViewProps] = useState<Record<string, any>>({});

  const {
      loading,
      error,
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
    safeLocalStorage.setItem('onboardingComplete', 'true');
    setIsOnboardingComplete(true);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <AuthView />
        </Suspense>
        <ConnectionStatus />
      </ErrorBoundary>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Memuat data...</p>
        </div>
        <ConnectionStatus />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Muat Ulang
          </button>
        </div>
        <ConnectionStatus />
      </div>
    );
  }

  if (!isOnboardingComplete) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <OnboardingView onComplete={handleOnboardingComplete} />
        </Suspense>
        <ConnectionStatus />
      </ErrorBoundary>
    );
  }

  const renderView = () => {
    const viewComponents = {
      inventory: <InventoryView {...viewProps} />,
      waste: <WasteView />,
      forecasting: <ForecastingView />,
      sales: <SalesView />,
      menu: <MenuView />,
      operational: <OperationalView />,
      profitLoss: <ProfitLossView />,
      performanceAnalysis: <PerformanceAnalysisView />,
      suppliers: <SuppliersView />,
      integrations: <IntegrationsView />,
      profile: <ProfileView />,
      dashboard: <DashboardView onNavigate={handleNavigate} />
    };

    return viewComponents[currentView] || viewComponents.dashboard;
  };

  return (
    <ErrorBoundary>
      <Layout 
          currentView={currentView} 
          onNavigate={handleNavigate}
          outlets={outlets}
          currentOutletId={currentOutletId}
          onOutletChange={setCurrentOutletId}
          notifications={notifications}
          onMarkNotificationsAsRead={markNotificationsAsRead}
      >
        <Suspense fallback={<LoadingFallback />}>
          {renderView()}
        </Suspense>
      </Layout>
      <ConnectionStatus />
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;