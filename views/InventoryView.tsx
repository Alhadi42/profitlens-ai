import React, { useState, useMemo, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import IngredientsTable from '../components/IngredientsTable';
import InventoryStatus from '../components/InventoryStatus';
import AddIngredientModal from '../components/AddIngredientModal';
import AiReorderModal from '../components/AiReorderModal';
import PendingOrders from '../components/PendingOrders';
import PurchaseOrderModal from '../components/PurchaseOrderModal';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { PlusIcon } from '../components/icons/PlusIcon';
import { LightBulbIcon } from '../components/icons/LightBulbIcon';
import { InventoryIcon } from '../components/icons/InventoryIcon';
import { DocumentArrowDownIcon } from '../components/icons/DocumentArrowDownIcon';
import { exportToCsv } from '../utils/export';
import type { PendingOrder, Supplier } from '../types';

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
} | null;

interface InventoryViewProps {
  filter?: 'low_stock' | null;
}

const InventoryView: React.FC<InventoryViewProps> = (props) => {
    const { 
        ingredients, 
        inventoryOverviewStats,
        addIngredient,
        deleteIngredient,
        updateIngredientPrice,
        updateIngredientStock,
        updateIngredientUnit,
        addPendingOrder,
        pendingOrders,
        receiveStock,
        suppliers,
        wasteHistory,
    } = useSupabaseData();

    const [isEditing, setIsEditing] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
    const [isPOModalOpen, setIsPOModalOpen] = useState(false);
    const [viewingOrder, setViewingOrder] = useState<PendingOrder | null>(null);
    const [toast, setToast] = useState<ToastState>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    useEffect(() => {
        if (props.filter) {
            setActiveFilter(props.filter);
        }
    }, [props.filter]);

    const lowStockIngredients = useMemo(() => 
        ingredients.filter(ing => ing.stockLevel <= ing.reorderPoint),
        [ingredients]
    );

    const filteredIngredients = useMemo(() => {
        return ingredients.filter(ing => {
            const searchMatch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
            const filterMatch = !activeFilter || (activeFilter === 'low_stock' && ing.stockLevel <= ing.reorderPoint);
            return searchMatch && filterMatch;
        });
    }, [ingredients, searchTerm, activeFilter]);

    const handleDeleteIngredient = (id: string) => {
        const result = deleteIngredient(id);
        if (result.success) {
            setToast({ show: true, message: 'Bahan baku berhasil dihapus.', type: 'success' });
        } else {
            setToast({ show: true, message: result.message || 'Gagal menghapus.', type: 'error' });
        }
    };
    
    const handleReceiveStock = (orderId: string) => {
        if (window.confirm('Apakah Anda yakin ingin menandai pesanan ini sebagai diterima? Stok akan diperbarui.')) {
            receiveStock(orderId);
            setToast({ show: true, message: 'Stok berhasil diterima dan diperbarui.', type: 'success' });
        }
    };
    
    const handleViewPO = (order: PendingOrder) => {
        setViewingOrder(order);
        setIsPOModalOpen(true);
    };
    
    const handleFilterChange = (filter: 'low_stock' | null) => {
        setActiveFilter(current => current === filter ? null : filter);
    };

    const handleExport = () => {
        const dataToExport = filteredIngredients.map(({ id, name, unit, price, stockLevel, reorderPoint, wasteCostLast30Days }) => ({
            id,
            nama: name,
            satuan: unit,
            harga: price,
            level_stok: stockLevel,
            titik_pemesanan_ulang: reorderPoint,
            biaya_buangan_30_hari: wasteCostLast30Days || 0,
        }));
        exportToCsv(`inventaris_${new Date().toISOString().split('T')[0]}.csv`, dataToExport);
    }

    const viewingOrderSupplier = useMemo(() => {
        if (!viewingOrder) return null;
        return suppliers.find(s => s.id === viewingOrder.supplier.id);
    }, [viewingOrder, suppliers]);

    return (
        <div className="space-y-8">
            {toast?.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div>
                <h1 className="text-3xl font-bold text-white mb-6">Manajemen Inventaris</h1>
                <InventoryStatus 
                    stats={inventoryOverviewStats} 
                    onFilterChange={handleFilterChange}
                    activeFilter={activeFilter}
                />
            </div>

            <PendingOrders orders={pendingOrders} onReceive={handleReceiveStock} onViewPO={handleViewPO} />

            <div>
                <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Daftar Bahan Baku ({ingredients.length})</h2>
                    <div className="flex items-center space-x-2">
                         <input
                            type="text"
                            placeholder="Cari bahan baku..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:ring-brand-primary focus:border-brand-primary"
                        />
                         {lowStockIngredients.length > 0 && (
                            <button
                                onClick={() => setIsReorderModalOpen(true)}
                                className="flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-md transition-colors duration-200 shadow-lg animate-pulse"
                            >
                                <LightBulbIcon className="w-5 h-5 mr-2" />
                                Saran AI ({lowStockIngredients.length})
                            </button>
                        )}
                        <button onClick={handleExport} className="p-2.5 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-md" aria-label="Ekspor CSV">
                            <DocumentArrowDownIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center justify-center bg-brand-secondary hover:bg-brand-primary text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 shadow-lg"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Tambah
                        </button>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-4 py-2 font-bold rounded-md transition-colors ${isEditing ? 'bg-brand-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                            {isEditing ? 'Selesai' : 'Edit'}
                        </button>
                    </div>
                </div>
                 {ingredients.length > 0 ? (
                    <IngredientsTable 
                        ingredients={filteredIngredients}
                        onPriceChange={updateIngredientPrice}
                        onStockChange={updateIngredientStock}
                        onUnitChange={updateIngredientUnit}
                        onDelete={handleDeleteIngredient}
                        isEditing={isEditing}
                    />
                ) : (
                    <EmptyState
                        Icon={InventoryIcon}
                        title="Inventaris Anda Kosong"
                        message="Mulai dengan menambahkan bahan baku pertama Anda untuk melacak stok dan biaya."
                        actionText="Tambah Bahan Baku"
                        onAction={() => setIsAddModalOpen(true)}
                    />
                )}
            </div>
            
            <AddIngredientModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={(newIngredient) => {
                    addIngredient(newIngredient);
                    setToast({ show: true, message: 'Bahan baku baru berhasil ditambahkan.', type: 'success' });
                }}
            />
            
            {isReorderModalOpen && (
                 <AiReorderModal
                    isOpen={isReorderModalOpen}
                    onClose={() => setIsReorderModalOpen(false)}
                    lowStockIngredients={lowStockIngredients}
                    wasteHistory={wasteHistory}
                    onConfirmOrder={(order) => {
                        addPendingOrder(order);
                        setToast({ show: true, message: 'Purchase Order berhasil dibuat.', type: 'success' });
                    }}
                 />
            )}
            
            {isPOModalOpen && viewingOrder && viewingOrderSupplier && (
                <PurchaseOrderModal 
                    isOpen={isPOModalOpen}
                    onClose={() => {
                        setIsPOModalOpen(false)
                        setViewingOrder(null);
                    }}
                    order={viewingOrder}
                    supplier={viewingOrderSupplier}
                />
            )}
        </div>
    );
};

export default InventoryView;