import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { getProfitLossAnalysis } from '../services/geminiService';
import CostBreakdownChart from '../components/CostBreakdownChart';
import { LightBulbIcon } from '../components/icons/LightBulbIcon';
import type { ProfitLossStats } from '../types';
import { formatRupiah } from '../utils/formatters';

const ProfitLossView: React.FC = () => {
    const { profitLossStats } = useSupabaseData();
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGetAnalysis = async () => {
        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        try {
            const result = await getProfitLossAnalysis(profitLossStats);
            setAnalysis(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderAnalysis = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-gray-400">
                  <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-4 text-lg">AI sedang menganalisis laporan keuangan Anda...</p>
                </div>
            );
        }
        if (error) {
            return <div className="text-alert-red bg-alert-red/10 p-4 rounded-lg">Error: {error}</div>;
        }
        if (analysis) {
            const formatted = analysis
                .split('\n')
                .map(line => {
                    if (line.startsWith('### ')) return `<h3 class="text-xl font-bold text-brand-secondary mt-4 mb-2">${line.substring(4)}</h3>`;
                    if (line.startsWith('*   ')) return `<li class="ml-5 list-disc text-gray-300">${line.substring(4)}</li>`;
                    if (line.trim() === '') return `<br />`;
                    return `<p class="text-gray-300 mb-2">${line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')}</p>`;
                })
                .join('');
            return <div className="prose prose-invert max-w-none animate-fade-in" dangerouslySetInnerHTML={{ __html: formatted }} />;
        }
        return null;
    };


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Analisis Laba & Rugi</h1>
                <p className="text-gray-400">Tinjauan keuangan berdasarkan data penjualan, biaya, dan buangan selama {profitLossStats.periodDays} hari terakhir.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Pendapatan" value={formatRupiah(profitLossStats.totalRevenue)} />
                <StatCard title="Total Modal (HPP)" value={formatRupiah(profitLossStats.totalCogs)} />
                <StatCard title="Laba Kotor" value={formatRupiah(profitLossStats.grossProfit)} subtitle={`${profitLossStats.grossProfitMargin.toFixed(1)}% Margin`} />
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold text-white mb-4">Rincian Biaya</h2>
                    <CostBreakdownChart 
                        cogs={profitLossStats.totalCogs}
                        operational={profitLossStats.totalOperationalCost}
                        waste={profitLossStats.totalWasteCost}
                    />
                 </div>
                 <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col justify-center">
                    <StatCard title="Biaya Operasional" value={formatRupiah(profitLossStats.totalOperationalCost)} className="bg-transparent shadow-none p-0 mb-6" />
                    <StatCard title="Kerugian Buangan" value={formatRupiah(profitLossStats.totalWasteCost)} className="bg-transparent shadow-none p-0 mb-6 border-t border-gray-700 pt-6" />
                    <div className="border-t-2 border-brand-primary pt-6">
                        <StatCard 
                            title="Estimasi Laba Bersih" 
                            value={formatRupiah(profitLossStats.netProfit)} 
                            subtitle={`${profitLossStats.netProfitMargin.toFixed(1)}% Margin`}
                            valueClassName={profitLossStats.netProfit >= 0 ? 'text-safe-green' : 'text-alert-red'}
                            className="bg-transparent shadow-none p-0" 
                        />
                    </div>
                 </div>
             </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-4">Analisis Keuangan AI</h2>
                {!analysis && !isLoading && (
                    <div className="text-center py-4">
                        <p className="text-gray-400 mb-4">Dapatkan wawasan dan rekomendasi yang dapat ditindaklanjuti dari AI untuk meningkatkan profitabilitas bisnis Anda.</p>
                        <button
                            onClick={handleGetAnalysis}
                            className="inline-flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-md transition-colors duration-200 shadow-lg"
                        >
                            <LightBulbIcon className="w-5 h-5 mr-2" />
                            Dapatkan Analisis AI
                        </button>
                    </div>
                )}
                {renderAnalysis()}
            </div>

        </div>
    );
};

const StatCard: React.FC<{title: string, value: string, subtitle?: string, className?: string, valueClassName?: string}> = ({title, value, subtitle, className, valueClassName}) => (
    <div className={`bg-gray-800 p-6 rounded-lg shadow-lg ${className || ''}`}>
        <p className="text-sm text-gray-400">{title}</p>
        <p className={`text-3xl font-bold text-white ${valueClassName || ''}`}>{value}</p>
        {subtitle && <p className="text-sm text-gray-400 font-semibold">{subtitle}</p>}
    </div>
);

export default ProfitLossView;
