
import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { getBasketAnalysis, getMarketingCampaignSuggestion, getMenuEngineeringAnalysis, getCompetitorAnalysis } from '../services/geminiService';
import type { BasketAnalysis, MarketingCampaignSuggestion, MenuEngineeringAnalysis, CompetitorAnalysis } from '../types';
import { LightBulbIcon } from '../components/icons/LightBulbIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import { MegaphoneIcon } from '../components/icons/MegaphoneIcon';
import MenuEngineeringMatrix from '../components/MenuEngineeringMatrix';
import Toast from '../components/Toast';
import { SparklesIcon } from '../components/icons/SparklesIcon';
import SkeletonLoader from '../components/SkeletonLoader';

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
} | null;

const PerformanceAnalysisView: React.FC = () => {
    const { outlets, currentOutletId, salesHistory, menuItems, profitLossStats, activeCampaign, launchCampaign } = useSupabaseData();
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [basketAnalysis, setBasketAnalysis] = useState<BasketAnalysis | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
    const [campaignSuggestion, setCampaignSuggestion] = useState<MarketingCampaignSuggestion | null>(null);
    const [campaignError, setCampaignError] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState>(null);

    const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
    const [matrixAnalysis, setMatrixAnalysis] = useState<MenuEngineeringAnalysis | null>(null);
    const [matrixError, setMatrixError] = useState<string | null>(null);

    // State for Competitor Analysis
    const [competitorQuery, setCompetitorQuery] = useState('Kopi Susu Gula Aren');
    const [isLoadingCompetitor, setIsLoadingCompetitor] = useState(false);
    const [competitorResult, setCompetitorResult] = useState<CompetitorAnalysis | null>(null);
    const [competitorError, setCompetitorError] = useState<string | null>(null);


    const handleGetBasketAnalysis = async () => {
        setIsLoadingAnalysis(true);
        setAnalysisError(null);
        setBasketAnalysis(null);
        setCampaignSuggestion(null); 
        setCampaignError(null);
        try {
            const result = await getBasketAnalysis(salesHistory, menuItems);
            setBasketAnalysis(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
            setAnalysisError(errorMessage);
            console.error(err);
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

    const handleGetCampaignSuggestion = async () => {
        if (!basketAnalysis) return;
        setIsLoadingCampaign(true);
        setCampaignError(null);
        setCampaignSuggestion(null);
        try {
            const result = await getMarketingCampaignSuggestion(basketAnalysis, profitLossStats);
            setCampaignSuggestion(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
            setCampaignError(errorMessage);
            console.error(err);
        } finally {
            setIsLoadingCampaign(false);
        }
    };

    const handleLaunchCampaign = () => {
        if (!campaignSuggestion) return;
        launchCampaign(campaignSuggestion);
        setToast({ show: true, message: 'Kampanye berhasil diluncurkan!', type: 'success' });
    }
    
    const handleGetMatrixAnalysis = async () => {
        setIsLoadingMatrix(true);
        setMatrixError(null);
        setMatrixAnalysis(null);
        try {
            const result = await getMenuEngineeringAnalysis(menuItems, salesHistory);
            setMatrixAnalysis(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
            setMatrixError(errorMessage);
        } finally {
            setIsLoadingMatrix(false);
        }
    };

    const handleGetCompetitorAnalysis = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!competitorQuery.trim()) return;
        setIsLoadingCompetitor(true);
        setCompetitorError(null);
        setCompetitorResult(null);
        try {
            const currentOutlet = outlets.find(o => o.id === currentOutletId);
            const location = currentOutlet?.name.split(' ').pop() || 'Jakarta';
            const result = await getCompetitorAnalysis(competitorQuery, location);
            setCompetitorResult(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
            setCompetitorError(errorMessage);
        } finally {
            setIsLoadingCompetitor(false);
        }
    };

    const renderBasketAnalysisResults = () => {
        if (!basketAnalysis) return null;

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-gray-900/50 p-5 rounded-lg">
                    <h3 className="text-lg font-semibold text-brand-secondary mb-2">Ringkasan Perilaku Pelanggan</h3>
                    <p className="text-gray-300">{basketAnalysis.summary}</p>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Pasangan Populer</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {basketAnalysis.pairings.map((pair, index) => (
                            <div key={index} className="bg-gray-800 rounded-lg shadow-lg p-4">
                                <div className="flex items-center justify-center space-x-2 mb-4">
                                    <img src={pair.item1ImageUrl} alt={pair.item1Name} className="w-20 h-20 rounded-lg object-cover" />
                                    <PlusIcon className="w-8 h-8 text-gray-500" />
                                    <img src={pair.item2ImageUrl} alt={pair.item2Name} className="w-20 h-20 rounded-lg object-cover" />
                                </div>
                                <h4 className="font-bold text-white text-center">{pair.item1Name} & {pair.item2Name}</h4>
                                <p className="text-sm text-gray-400 mt-2 text-center italic">"{pair.analysis}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    };

    const renderCampaignSuggestion = () => {
         if (!campaignSuggestion) return null;
         return (
            <div className="bg-brand-dark/30 border border-brand-secondary p-6 rounded-lg animate-fade-in">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-1">{campaignSuggestion.campaignName}</h3>
                        <p className="text-yellow-300 font-semibold mb-4">{campaignSuggestion.promoMechanic}</p>
                    </div>
                    <button
                        onClick={handleLaunchCampaign}
                        disabled={!!activeCampaign}
                        className="flex items-center bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {activeCampaign ? 'Kampanye Aktif' : 'Luncurkan Kampanye Ini'}
                    </button>
                </div>
                
                <h4 className="font-semibold text-white mt-4">Copywriting untuk Promosi:</h4>
                <p className="text-gray-300 italic">"{campaignSuggestion.marketingCopy}"</p>
                
                <h4 className="font-semibold text-white mt-4">Justifikasi AI:</h4>
                <p className="text-gray-300">{campaignSuggestion.justification}</p>
            </div>
         );
    };

    const renderCompetitorAnalysis = () => {
        if (isLoadingCompetitor) {
            return (
                <div className="mt-6 space-y-4">
                  <SkeletonLoader className="h-6 w-1/3" />
                  <SkeletonLoader className="h-4 w-full" />
                  <SkeletonLoader className="h-4 w-5/6" />
                  <SkeletonLoader className="h-6 w-1/4 mt-4" />
                   <SkeletonLoader className="h-4 w-full" />
                   <SkeletonLoader className="h-4 w-3/4" />
                </div>
            );
        }
        if (competitorError) {
            return <div className="mt-6 text-alert-red bg-alert-red/10 p-4 rounded-lg">Error: {competitorError}</div>;
        }
        if (competitorResult) {
            const formatted = competitorResult.analysisText
                .split('\n')
                .map(line => {
                    if (line.startsWith('### ')) return `<h3 class="text-xl font-bold text-brand-secondary mt-4 mb-2">${line.substring(4)}</h3>`;
                    if (line.startsWith('**')) return `<p class="text-gray-200 font-semibold mt-2">${line.replace(/\*\*/g, '')}</p>`;
                    if (line.startsWith('* ')) return `<li class="ml-5 list-disc">${line.substring(2)}</li>`;
                    return `<p class="mb-1 text-gray-300">${line}</p>`;
                })
                .join('');
            return (
                <div className="mt-6 animate-fade-in">
                    <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formatted }} />
                    {competitorResult.sources.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-700">
                            <h4 className="font-semibold text-gray-400">Sumber Data dari Google Search:</h4>
                            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                {competitorResult.sources.map((source, i) => (
                                    <li key={i}>
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-brand-secondary hover:underline">
                                            {source.title || new URL(source.uri).hostname}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };


    return (
        <div className="space-y-8">
            {toast?.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div>
                <h1 className="text-3xl font-bold text-white">Analisis Performa & Wawasan Pelanggan</h1>
                <p className="text-gray-400">Temukan pola dalam data penjualan Anda untuk membuat keputusan yang lebih cerdas.</p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center"><SparklesIcon className="w-6 h-6 mr-3 text-brand-secondary" />Intelijen Pasar & Analisis Kompetitor (AI)</h2>
                 <p className="text-gray-400 mb-4 max-w-3xl">Ingin tahu harga jual kompetitor atau apa kata pelanggan mereka? Masukkan nama menu, dan biarkan AI melakukan riset untuk Anda menggunakan Google Search.</p>
                 <form onSubmit={handleGetCompetitorAnalysis} className="flex items-center gap-2">
                     <input 
                        type="text"
                        value={competitorQuery}
                        onChange={(e) => setCompetitorQuery(e.target.value)}
                        placeholder="Contoh: Kopi Susu Gula Aren"
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg text-white p-2.5 focus:ring-2 focus:ring-brand-primary"
                     />
                     <button type="submit" disabled={isLoadingCompetitor} className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-2.5 px-6 rounded-lg disabled:bg-gray-600">
                        {isLoadingCompetitor ? 'Mencari...' : 'Analisis'}
                     </button>
                 </form>
                 {renderCompetitorAnalysis()}
            </div>
            
             <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-4">AI Menu Engineering (Matriks BCG)</h2>
                {!matrixAnalysis && !isLoadingMatrix && (
                    <div className="text-center py-4">
                        <p className="text-gray-400 mb-4 max-w-2xl mx-auto">Pahami menu Anda lebih dalam. AI akan memetakan setiap item berdasarkan popularitas dan profitabilitasnya, memberikan Anda peta jalan strategis untuk meningkatkan keuntungan.</p>
                        <button
                            onClick={handleGetMatrixAnalysis}
                            className="inline-flex items-center justify-center bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-6 rounded-md transition-colors duration-200 shadow-lg"
                        >
                            <LightBulbIcon className="w-5 h-5 mr-2" />
                           Jalankan Analisis Matriks
                        </button>
                    </div>
                )}
                {isLoadingMatrix && (
                    <div className="flex flex-col items-center justify-center min-h-[200px] text-gray-400">
                        <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-lg">AI sedang memproses data penjualan dan profit...</p>
                    </div>
                )}
                 {matrixError && <div className="text-alert-red bg-alert-red/10 p-4 rounded-lg">Error: {matrixError}</div>}
                 {matrixAnalysis && <MenuEngineeringMatrix analysis={matrixAnalysis} />}
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-4">Analisis Keranjang Belanja</h2>
                
                {!basketAnalysis && !isLoadingAnalysis && (
                    <div className="text-center py-4">
                        <p className="text-gray-400 mb-4 max-w-2xl mx-auto">Klik tombol di bawah untuk menggunakan AI dalam menganalisis item menu mana yang paling sering dibeli bersamaan oleh pelanggan Anda. Gunakan wawasan ini untuk membuat paket bundling yang menarik!</p>
                        <button
                            onClick={handleGetBasketAnalysis}
                            className="inline-flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-md transition-colors duration-200 shadow-lg"
                        >
                            <LightBulbIcon className="w-5 h-5 mr-2" />
                            Temukan Pasangan Populer
                        </button>
                    </div>
                )}

                {isLoadingAnalysis && (
                    <div className="flex flex-col items-center justify-center min-h-[200px] text-gray-400">
                        <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-lg">AI sedang menganalisis riwayat penjualan Anda...</p>
                    </div>
                )}
                
                {analysisError && <div className="text-alert-red bg-alert-red/10 p-4 rounded-lg">Error: {analysisError}</div>}

                {renderBasketAnalysisResults()}
            </div>

            {basketAnalysis && (
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-white mb-4">Asisten Kampanye Pemasaran AI</h2>
                    
                    {!campaignSuggestion && !isLoadingCampaign && (
                         <div className="text-center py-4">
                            <p className="text-gray-400 mb-4 max-w-2xl mx-auto">Wawasan sudah didapat! Sekarang, biarkan AI mengubah data ini menjadi kampanye pemasaran yang kreatif dan siap dijalankan.</p>
                            <button
                                onClick={handleGetCampaignSuggestion}
                                className="inline-flex items-center justify-center bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-6 rounded-md transition-colors duration-200 shadow-lg"
                            >
                                <MegaphoneIcon className="w-5 h-5 mr-2" />
                                Buat Ide Kampanye
                            </button>
                        </div>
                    )}

                    {isLoadingCampaign && (
                        <div className="flex flex-col items-center justify-center min-h-[200px] text-gray-400">
                             <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-lg">AI sedang merancang kampanye pemasaran...</p>
                        </div>
                    )}
                    
                    {campaignError && <div className="text-alert-red bg-alert-red/10 p-4 rounded-lg">Error: {campaignError}</div>}

                    {renderCampaignSuggestion()}
                </div>
            )}
        </div>
    );
};

export default PerformanceAnalysisView;
