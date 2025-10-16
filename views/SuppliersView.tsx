import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import Toast from '../components/Toast';
import SupplierEditorModal from '../components/SupplierEditorModal';
import SupplierIngredientsPanel from '../components/SupplierIngredientsPanel';
import EmptyState from '../components/EmptyState';
import { PlusIcon } from '../components/icons/PlusIcon';
import { TruckIcon } from '../components/icons/TruckIcon';
import type { Supplier } from '../types';

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
} | null;

const SuppliersView: React.FC = () => {
    const {
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
    } = useSupabaseData();

    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(suppliers[0] || null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorSupplier, setEditorSupplier] = useState<Supplier | null>(null);
    const [toast, setToast] = useState<ToastState>(null);
    
    const handleSave = (supplier: Omit<Supplier, 'id'> | Supplier) => {
        if ('id' in supplier) {
            updateSupplier(supplier);
            setToast({ show: true, message: 'Data supplier berhasil diperbarui.', type: 'success' });
        } else {
            addSupplier(supplier);
            setToast({ show: true, message: 'Supplier baru berhasil ditambahkan.', type: 'success' });
        }
    };
    
    const handleDelete = (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus supplier ini? Semua data harga terkait akan dihapus.')) {
            deleteSupplier(id);
            setSelectedSupplier(null);
            setToast({ show: true, message: 'Supplier berhasil dihapus.', type: 'success' });
        }
    };
    
    const openNewModal = () => {
        setEditorSupplier(null);
        setIsEditorOpen(true);
    };

    const openEditModal = (supplier: Supplier) => {
        setEditorSupplier(supplier);
        setIsEditorOpen(true);
    };

    return (
        <div className="space-y-8">
            {toast?.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Manajemen Supplier</h1>
                <button
                    onClick={openNewModal}
                    className="flex items-center justify-center bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 shadow-lg"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Tambah Supplier
                </button>
            </div>

            {suppliers.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 bg-gray-800 rounded-lg shadow-lg p-4 h-fit">
                        <h2 className="text-xl font-bold text-white mb-4">Daftar Supplier</h2>
                        <ul className="space-y-2">
                            {suppliers.map(s => (
                                <li key={s.id} onClick={() => setSelectedSupplier(s)}
                                    className={`p-3 rounded-md cursor-pointer transition-colors ${selectedSupplier?.id === s.id ? 'bg-brand-primary text-white' : 'hover:bg-gray-700'}`}
                                >
                                    <p className="font-semibold">{s.name}</p>
                                    <p className="text-sm opacity-80">{s.contactPerson}</p>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:col-span-2">
                        {selectedSupplier ? (
                            <SupplierIngredientsPanel 
                                key={selectedSupplier.id} // Re-mount component on supplier change
                                supplier={selectedSupplier}
                                onEdit={openEditModal}
                                onDelete={handleDelete}
                            />
                        ) : (
                            <div className="bg-gray-800 rounded-lg shadow-lg p-8 h-full flex items-center justify-center text-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Pilih Supplier</h2>
                                    <p className="text-gray-400 mt-2">Pilih supplier dari daftar di sebelah kiri untuk melihat detail dan mengelola harga bahan baku.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
             ) : (
                <EmptyState
                    Icon={TruckIcon}
                    title="Tidak Ada Supplier"
                    message="Tambahkan daftar supplier Anda untuk mengelola harga bahan baku dan mempermudah proses pemesanan ulang."
                    actionText="Tambah Supplier"
                    onAction={openNewModal}
                />
            )}


            <SupplierEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSave}
                supplier={editorSupplier}
            />
        </div>
    );
};

export default SuppliersView;