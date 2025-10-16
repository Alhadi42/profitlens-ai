import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import MenuTable from '../components/MenuTable';
import MenuEditorModal from '../components/MenuEditorModal';
import AiCreateMenuModal from '../components/AiCreateMenuModal';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { PlusIcon } from '../components/icons/PlusIcon';
import { LightBulbIcon } from '../components/icons/LightBulbIcon';
import { BookOpenIcon } from '../components/icons/BookOpenIcon';
import type { MenuItem } from '../types';

type EditorState = {
  mode: 'closed';
} | {
  mode: 'new';
} | {
  mode: 'edit';
  itemId: string;
};

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
} | null;


const MenuView: React.FC = () => {
    const { 
        menuItems,
        menuItemsData,
        ingredients,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem
    } = useSupabaseData();

    const [editorState, setEditorState] = useState<EditorState>({ mode: 'closed' });
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    const menuItemToEdit = editorState.mode === 'edit' 
        ? menuItemsData.find(item => item.id === editorState.itemId) || null
        : null;

    const handleSaveMenuItem = (item: Omit<MenuItem, 'cogs' | 'actualMargin' | 'marginStatus'>) => {
        addMenuItem(item);
        setToast({ show: true, message: 'Menu baru berhasil dibuat!', type: 'success' });
    };

    const handleUpdateMenuItem = (item: Omit<MenuItem, 'cogs' | 'actualMargin' | 'marginStatus'> & {id: string}) => {
        updateMenuItem(item);
        setToast({ show: true, message: 'Menu berhasil diperbarui.', type: 'success' });
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus menu ini?')) {
            deleteMenuItem(id);
            setToast({ show: true, message: 'Menu berhasil dihapus.', type: 'success' });
        }
    };

    return (
        <div>
            {toast?.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Manajemen Menu</h1>
                <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setIsAiModalOpen(true)}
                      className="flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-md transition-colors duration-200 shadow-lg"
                    >
                        <LightBulbIcon className="w-5 h-5 mr-2" />
                        Buat dengan AI
                    </button>
                    <button
                      onClick={() => setEditorState({ mode: 'new' })}
                      className="flex items-center justify-center bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 shadow-lg"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Tambah Menu Manual
                    </button>
                </div>
            </div>
            
            {menuItems.length > 0 ? (
                 <MenuTable 
                    menuItems={menuItems}
                    onEdit={(itemId) => setEditorState({ mode: 'edit', itemId })}
                    onDelete={handleDelete}
                />
            ) : (
                <EmptyState
                    Icon={BookOpenIcon}
                    title="Buku Menu Anda Kosong"
                    message="Ciptakan menu andalan Anda. Anda bisa menambahkannya secara manual atau biarkan AI membantu Anda membuat resep baru."
                    actionText="Tambah Menu Manual"
                    onAction={() => setEditorState({ mode: 'new' })}
                    secondaryActionText="Buat dengan AI"
                    onSecondaryAction={() => setIsAiModalOpen(true)}
                />
            )}

            {editorState.mode !== 'closed' && (
                <MenuEditorModal
                  isOpen={true}
                  onClose={() => setEditorState({ mode: 'closed' })}
                  onSave={editorState.mode === 'new' ? handleSaveMenuItem : handleUpdateMenuItem as any}
                  onDelete={deleteMenuItem} // This is for delete from inside modal
                  ingredients={ingredients}
                  menuItem={menuItemToEdit}
                />
            )}
            
            {isAiModalOpen && (
                <AiCreateMenuModal
                    ingredients={ingredients}
                    onClose={() => setIsAiModalOpen(false)}
                    onSave={handleSaveMenuItem}
                />
            )}
        </div>
    );
};

export default MenuView;