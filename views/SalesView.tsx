import React, { useState, useMemo, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { getSalesAnalysis, getSalesForecast } from '../services/geminiService';
import SalesAnalysisModal from '../components/SalesAnalysisModal';
import { ExclamationCircleIcon } from '../components/icons/ExclamationCircleIcon';
import type { Forecast } from '../types';

type ForecastForModal = {
    itemName: string;
    forecast: Forecast;
};

const SalesView: React.FC = () => {
    const { menuItems, ingredients, salesHistory, processDailySales, checkStockAvailability } = useSupabaseData();
    const [salesInput, setSalesInput] = useState<Record<string, number>>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [forecastsForModal, setForecastsForModal] = useState<ForecastForModal[] | null>(null);
    const [stockWarnings, setStockWarnings] = useState<Record<string, string>>({});

    useEffect(() => {
        const warnings = checkStockAvailability(salesInput);
        setStockWarnings(warnings);
    }, [salesInput, checkStockAvailability]);


    const handleInputChange = (menuItemId: string, value: string) => {
        const quantity = parseInt(value, 10);
        setSalesInput(prev => ({
            ...prev,
            [menuItemId]: isNaN(quantity) || quantity < 0 ? 0 : quantity
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsModalOpen(true);
        setAnalysisResult(null);
        setForecastsForModal(null);

        const salesDataForAI = menuItems
            .map(item => ({
                menuItem: item,
                sold: salesInput[item.id] || 0
            }))
            .filter(item => item.sold > 0);

        if (salesDataForAI.length === 0) {
            alert("Silakan masukkan jumlah penjualan untuk setidaknya satu item.");
            setIsModalOpen(false);
            return;
        }

        const originalIngredients = JSON.parse(JSON.stringify(ingredients)); // Deep copy
        
        const updatedIngredients = processDailySales(salesInput);

        try {
            // Step 1: Get today's analysis
            const analysis = await getSalesAnalysis(salesDataForAI, originalIngredients, updatedIngredients);
            setAnalysisResult(analysis);

            // Step 2: Get tomorrow's forecast for top sellers
            const topSellers = salesDataForAI.sort((a, b) => b.sold - a.sold).slice(0, 3);
            const forecastPromises = topSellers.map(s => 
                getSalesForecast(s.menuItem, salesHistory).then(forecast => ({ itemName: s.menuItem.name, forecast }))
            );
            const forecasts = await Promise.all(forecastPromises);
            setForecastsForModal(forecasts);

        } catch (error) {
            console.error(error);
            setAnalysisResult("Gagal mendapatkan analisis dari AI. Silakan tutup dan coba lagi.");
        }
    };

    const totalItemsSold = useMemo(() => {
        return Object.values(salesInput).reduce((sum: number, current: number) => sum + (current || 0), 0);
    }, [salesInput]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Rekap Penjualan Harian</h1>
            <p className="text-gray-400 mb-6">Masukkan jumlah unit yang terjual untuk setiap item menu hari ini. Stok inventaris akan diperbarui secara otomatis.</p>
            
            <form onSubmit={handleSubmit}>
                <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="divide-y divide-gray-700">
                        {menuItems.map(item => {
                            const warningMessage = stockWarnings[item.id];
                            return (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors duration-200">
                                    <div className="flex items-center">
                                        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-md object-cover mr-4" />
                                        <div>
                                            <p className="font-bold text-white">{item.name}</p>
                                            <p className={`text-sm ${warningMessage ? 'text-warning-yellow' : 'text-gray-400'}`}>
                                                {warningMessage ? 'Stok berpotensi tidak cukup' : 'Stok Cukup'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-32 relative group flex items-center">
                                        {warningMessage && (
                                            <ExclamationCircleIcon className="w-6 h-6 text-warning-yellow mr-2" />
                                        )}
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={salesInput[item.id] || ''}
                                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                                            className={`w-full bg-gray-900 border ${warningMessage ? 'border-warning-yellow' : 'border-gray-600'} text-white text-lg text-center font-bold rounded-lg focus:ring-brand-primary focus:border-brand-primary block p-2 transition-colors`}
                                        />
                                        {warningMessage && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-3 bg-gray-700 text-white text-sm rounded-lg shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                {warningMessage}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                 <div className="mt-6 flex justify-end">
                    <button 
                        type="submit"
                        disabled={isModalOpen || totalItemsSold === 0}
                        className="bg-brand-primary hover:bg-brand-dark disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 text-lg shadow-lg"
                    >
                        Proses Rekap & Analisis AI
                    </button>
                </div>
            </form>

            {isModalOpen && (
                 <SalesAnalysisModal
                    analysisResult={analysisResult}
                    forecasts={forecastsForModal}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSalesInput({}); // Reset form
                    }}
                />
            )}
        </div>
    );
};

export default SalesView;