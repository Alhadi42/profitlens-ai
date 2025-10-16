
import React, { useState, useMemo } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import Toast from '../components/Toast';
import WasteLogForm from '../components/WasteLogForm';
import WasteHistoryTable from '../components/WasteHistoryTable';
import WasteBreakdownChart from '../components/WasteBreakdownChart';
import EmptyState from '../components/EmptyState';
import { ArchiveBoxXMarkIcon } from '../components/icons/ArchiveBoxXMarkIcon';
import { LightBulbIcon } from '../components/icons/LightBulbIcon';
import { formatRupiah } from '../utils/formatters';
import type { WasteRecord } from '../types';
import AiWasteAdvisorModal from '../components/AiWasteAdvisorModal';

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
} | null;

const WasteView: React.FC = () => {
    const {
        wasteHistory,
        addWasteRecord,
        deleteWasteRecord,
        ingredients,
        wasteSummary,
        salesHistory,
        menuItems
    } = useSupabaseData();

    const [toast, setToast] = useState<ToastState>(null);
    const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
    
    const totalWasteCost = useMemo(() => {
        return wasteSummary.data.reduce((sum, current) => sum + current, 0);
    }, [wasteSummary]);
    
    const handleAddWaste = (record: Omit<WasteRecord, 'id' | 'cost' | 'outletId'>) => {
        addWasteRecord(record);
        setToast({ show: true, message: 'Catatan buangan berhasil ditambahkan.', type: 'success' });
    };

    const handleDeleteWaste = (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus catatan ini? Stok tidak akan dikembalikan.')) {
            deleteWasteRecord(id);
            setToast({ show: true, message: 'Catatan buangan berhasil dihapus.', type: 'success' });
        }
    };

    return (
        <div className="space-y-8">
            {toast?.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Pencatatan & Analisis Buangan</h1>
                    <p className="text-gray-400">Catat bahan baku yang terbuang dan dapatkan saran AI untuk mencegahnya di masa depan.</p>
                </div>
                <button
                    onClick={() => setIsAdvisorOpen(true)}
                    disabled={wasteHistory.length < 5}
                    className="flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-md transition-colors duration-200 shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                    title={wasteHistory.length < 5 ? "Butuh lebih banyak data buangan untuk analisis" : "Dapatkan Saran Pencegahan dari AI"}
                >
                    <LightBulbIcon className="w-5 h-5 mr-2" />
                    Penasihat Pencegahan AI
                </button>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                    <WasteLogForm ingredients={ingredients} onSave={handleAddWaste} />
                </div>
                <div className="lg:col-span-2 bg-gray-800 rounded-lg shadow-lg p-6">
                     <h2 className="text-xl font-bold text-white mb-2">Rincian Kerugian</h2>
                     <p className="text-gray-400 mb-4">Total: <span className="font-bold text-alert-red">{formatRupiah(totalWasteCost)}</span></p>
                    <WasteBreakdownChart data={wasteSummary.data} labels={wasteSummary.labels} />
                </div>
            </div>

            {wasteHistory.length > 0 ? (
                <WasteHistoryTable wasteHistory={wasteHistory} ingredients={ingredients} onDelete={handleDeleteWaste} />
            ) : (
                <EmptyState
                    Icon={ArchiveBoxXMarkIcon}
                    title="Tidak Ada Catatan Buangan"
                    message="Bagus! Sepertinya tidak ada pemborosan. Jika ada bahan yang terbuang, catat di sini untuk analisis."
                />
            )}

            {isAdvisorOpen && (
                <AiWasteAdvisorModal
                    isOpen={isAdvisorOpen}
                    onClose={() => setIsAdvisorOpen(false)}
                    wasteHistory={wasteHistory}
                    salesHistory={salesHistory}
                    ingredients={ingredients}
                    menuItems={menuItems}
                />
            )}
        </div>
    );
};

export default WasteView;
