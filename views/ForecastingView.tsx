import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { getSalesForecast } from '../services/geminiService';
import type { Forecast, MenuItem } from '../types';
import ForecastingControls from '../components/ForecastingControls';
import ForecastingResults from '../components/ForecastingResults';

const ForecastingView: React.FC = () => {
  const { menuItems, salesHistory } = useSupabaseData();
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>(menuItems[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastedItem, setForecastedItem] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateForecast = async () => {
    if (!selectedMenuItemId) {
        setError("Silakan pilih item menu untuk dibuatkan proyeksi.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setForecast(null);
    setForecastedItem(null);
    try {
      const menuItemToForecast = menuItems.find(item => item.id === selectedMenuItemId);
      if (!menuItemToForecast) {
        throw new Error("Item menu yang dipilih tidak ditemukan.");
      }
      const result = await getSalesForecast(menuItemToForecast, salesHistory);
      setForecast(result);
      setForecastedItem(menuItemToForecast);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setForecast(null);
    setError(null);
    setForecastedItem(null);
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-gray-400 bg-gray-800 rounded-lg p-8 h-96">
          <svg className="animate-spin h-10 w-10 text-brand-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xl font-semibold text-white">ProfitLens AI sedang menganalisis...</p>
          <p>Mencari tren dalam data penjualan historis untuk membuat proyeksi akurat.</p>
        </div>
      );
    }

    if (error) {
       return (
        <div className="flex flex-col items-center justify-center text-center text-alert-red bg-alert-red/10 rounded-lg p-8 h-96">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl font-semibold text-white">Gagal Membuat Proyeksi</p>
            <p className="text-red-300 mb-6">{error}</p>
            <button
                onClick={handleGenerateForecast}
                className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-6 rounded-md transition-colors duration-200"
            >
                Coba Lagi
            </button>
        </div>
      );
    }
    
    if (forecast && forecastedItem) {
      return <ForecastingResults forecast={forecast} menuItem={forecastedItem} onReset={handleReset} />;
    }

    return (
        <ForecastingControls 
            menuItems={menuItems}
            selectedMenuItemId={selectedMenuItemId}
            onMenuItemChange={setSelectedMenuItemId}
            onGenerate={handleGenerateForecast} 
            isLoading={isLoading} 
        />
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Proyeksi Penjualan & Stok</h1>
      {renderContent()}
    </div>
  );
};

export default ForecastingView;