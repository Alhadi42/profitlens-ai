
import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import OperationalCostsTable from '../components/OperationalCostsTable';
import OperationalCostEditorModal from '../components/OperationalCostEditorModal';
import OperationalCostSummary from '../components/OperationalCostSummary';
import EmptyState from '../components/EmptyState';
import { PlusIcon } from '../components/icons/PlusIcon';
import { BuildingStorefrontIcon } from '../components/icons/BuildingStorefrontIcon';
import Toast from '../components/Toast';
import type { OperationalCost } from '../types';

type EditorState = {
  mode: 'closed';
} | {
  mode: 'new';
} | {
  mode: 'edit';
  costId: string;
};

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
} | null;

const OperationalView: React.FC = () => {
    const {
        operationalCosts,
        addOperationalCost,
        updateOperationalCost,
        deleteOperationalCost,
    } = useSupabaseData();

    const [editorState, setEditorState] = useState<EditorState>({ mode: 'closed' });
    const [toast, setToast] = useState<ToastState>(null);

    const costToEdit = editorState.mode === 'edit'
        ? operationalCosts.find(c => c.id === editorState.costId) || null
        : null;
    
    // FIX: Updated `cost` type to omit `outletId` to match the data hook.
    const handleSave = (cost: Omit<OperationalCost, 'id' | 'outletId'>) => {
        addOperationalCost(cost);
        setToast({ show: true, message: 'Biaya berhasil ditambahkan.', type: 'success' });
    };

    const handleUpdate = (cost: OperationalCost) => {
        updateOperationalCost(cost);
        setToast({ show: true, message: 'Biaya berhasil diperbarui.', type: 'success' });
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus biaya ini?')) {
            deleteOperationalCost(id);
            setToast({ show: true, message: 'Biaya berhasil dihapus.', type: 'success' });
        }
    };

    return (
        <div>
            {toast?.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Biaya Operasional</h1>
                <button
                    onClick={() => setEditorState({ mode: 'new' })}
                    className="flex items-center justify-center bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 shadow-lg"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Tambah Biaya
                </button>
            </div>

            <div className="mb-8">
                <OperationalCostSummary costs={operationalCosts} />
            </div>

            {operationalCosts.length > 0 ? (
                <OperationalCostsTable
                    costs={operationalCosts}
                    onEdit={(id) => setEditorState({ mode: 'edit', costId: id })}
                    onDelete={handleDelete}
                />
            ) : (
                <EmptyState
                    Icon={BuildingStorefrontIcon}
                    title="Belum Ada Biaya Operasional"
                    message="Catat semua biaya non-bahan baku Anda di sini, seperti sewa, gaji, dan listrik, untuk mendapatkan gambaran laba-rugi yang akurat."
                    actionText="Tambah Biaya"
                    onAction={() => setEditorState({ mode: 'new' })}
                />
            )}

            {editorState.mode !== 'closed' && (
                <OperationalCostEditorModal
                    isOpen={true}
                    onClose={() => setEditorState({ mode: 'closed' })}
                    onSave={editorState.mode === 'new' ? handleSave : handleUpdate}
                    cost={costToEdit}
                />
            )}
        </div>
    );
};

export default OperationalView;