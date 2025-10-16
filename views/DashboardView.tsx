
import React, { useState, useEffect } from 'react';
import MenuEditorModal from '../components/MenuEditorModal';
import { useSupabaseData } from '../hooks/useSupabaseData';
import BusinessOverview from '../components/BusinessOverview';
import SalesChart from '../components/SalesChart';
import DailyPriceUpdateModal from '../components/DailyPriceUpdateModal';
import MarginAlerts from '../components/MarginAlerts';
import DetailedPerformance from '../components/DetailedPerformance';
import ActiveCampaignPanel from '../components/ActiveCampaignPanel';
import OpportunityCard from '../components/OpportunityCard';
import { TagIcon } from '../components/icons/TagIcon';
import Toast from '../components/Toast';
import type { View, MenuItem, MenuEngineeringAnalysis } from '../types';
import { getMenuEngineeringAnalysis } from '../services/geminiService';
import MenuEngineeringMatrix from '../components/MenuEngineeringMatrix';
import SkeletonLoader from '../components/SkeletonLoader';

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
} | null;

interface DashboardViewProps {
  onNavigate: (view: View, props?: Record<string, any>) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { 
    menuItems, 
    ingredients, 
    updateMenuItemPrice,
    salesHistory,
    dashboardStats,
    chartData,
    comparisonChartData,
    updateIngredientPrices,
    marginAlerts,
    detailedPerformanceStats,
    activeCampaign,
    campaignPerformance,
    endCampaign,
    dateRange,
    setDateRange,
    isComparing,
    toggleComparison,
  } = useSupabaseData();

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [matrixAnalysis, setMatrixAnalysis] = useState<MenuEngineeringAnalysis | null>(null);
  const [isMatrixLoading, setIsMatrixLoading] = useState(true);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatrixAnalysis = async () => {
        setIsMatrixLoading(true);
        setMatrixError(null);
        try {
            const result = await getMenuEngineeringAnalysis(menuItems, salesHistory);
            setMatrixAnalysis(result);
        } catch (err) {
            setMatrixError("Gagal memuat analisis matriks menu.");
            console.error(err);
        } finally {
            setIsMatrixLoading(false);
        }
    };
    fetchMatrixAnalysis();
  }, [menuItems, salesHistory]);

  const handleEndCampaign = () => {
    if (window.confirm('Apakah Anda yakin ingin mengakhiri kampanye ini?')) {
        endCampaign();
        setToast({ show: true, message: 'Kampanye telah diakhiri.', type: 'success' });
    }
  }

  const dateRangeButtonClasses = (range: number) => 
    `px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
      dateRange === range
        ? 'bg-brand-primary text-white'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`;


  return (
    <div className="space-y-8">
      {toast?.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {activeCampaign && campaignPerformance ? (
          <ActiveCampaignPanel 
            campaign={activeCampaign}
            performance={campaignPerformance}
            onEndCampaign={handleEndCampaign}
          />
      ) : (
         <OpportunityCard onNavigate={onNavigate} />
      )}

      <MarginAlerts alerts={marginAlerts} />

      <div>
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Tinjauan Bisnis (Rentang {dateRange} Hari)</h1>
          <div className="flex items-center gap-2">
            <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
                <button onClick={() => setDateRange(7)} className={dateRangeButtonClasses(7)}>7 Hari</button>
                <button onClick={() => setDateRange(30)} className={dateRangeButtonClasses(30)}>30 Hari</button>
            </div>
            <button
                onClick={() => setIsPriceModalOpen(true)}
                className="flex items-center justify-center bg-brand-secondary hover:bg-brand-primary text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 shadow-lg"
            >
                <TagIcon className="w-5 h-5 mr-2" />
                Update Harga
            </button>
          </div>
        </div>
        <BusinessOverview stats={dashboardStats} onNavigate={onNavigate} />
      </div>

      <div>
         <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Pendapatan {dateRange} Hari Terakhir</h2>
            <button 
                onClick={toggleComparison}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                    isComparing ? 'bg-brand-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
                {isComparing ? 'Sembunyikan Perbandingan' : 'Bandingkan Periode'}
            </button>
         </div>
         <SalesChart chartData={chartData} comparisonData={isComparing ? comparisonChartData.data : undefined} />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Analisis Performa Mendalam</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <DetailedPerformance stats={detailedPerformanceStats} />
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-white mb-4">Matriks Menu Engineering (AI)</h3>
                {isMatrixLoading && <SkeletonLoader className="h-96" />}
                {matrixError && <p className="text-alert-red text-center py-10">{matrixError}</p>}
                {matrixAnalysis && <MenuEngineeringMatrix analysis={matrixAnalysis} />}
            </div>
        </div>
      </div>
       
       <DailyPriceUpdateModal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        ingredients={ingredients}
        onSave={updateIngredientPrices}
      />
    </div>
  );
};

export default DashboardView;
