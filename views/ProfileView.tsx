
import React, { useState, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import type { Outlet, User } from '../types';
import Toast from '../components/Toast';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import { CheckIcon } from '../components/icons/CheckIcon';
import { CloseIcon } from '../components/icons/CloseIcon';

type ToastState = { show: boolean; message: string; type: 'success' | 'error'; } | null;

const ProfileView: React.FC = () => {
    const { user, outlets, updateUser, addOutlet, updateOutlet, deleteOutlet } = useSupabaseData();
    
    const [userData, setUserData] = useState<Omit<User, 'avatarUrl'>>({ name: '', role: '' });
    const [toast, setToast] = useState<ToastState>(null);
    
    // For outlet management
    const [editingOutletId, setEditingOutletId] = useState<string | null>(null);
    const [editingOutletName, setEditingOutletName] = useState('');
    const [isAddingOutlet, setIsAddingOutlet] = useState(false);
    const [newOutletName, setNewOutletName] = useState('');

    useEffect(() => {
        if (user) {
            setUserData({ name: user.name, role: user.role });
        }
    }, [user]);

    const handleUserSave = () => {
        if (!userData.name.trim() || !userData.role.trim()) {
            setToast({ show: true, message: 'Nama dan Jabatan tidak boleh kosong.', type: 'error' });
            return;
        }
        updateUser(userData);
        setToast({ show: true, message: 'Profil berhasil diperbarui.', type: 'success' });
    };

    const handleOutletEditStart = (outlet: Outlet) => {
        setEditingOutletId(outlet.id);
        setEditingOutletName(outlet.name);
    };

    const handleOutletEditCancel = () => {
        setEditingOutletId(null);
        setEditingOutletName('');
    };

    const handleOutletSave = (id: string) => {
        if (!editingOutletName.trim()) {
            setToast({ show: true, message: 'Nama cabang tidak boleh kosong.', type: 'error' });
            return;
        }
        updateOutlet(id, editingOutletName);
        setToast({ show: true, message: 'Nama cabang berhasil diperbarui.', type: 'success' });
        handleOutletEditCancel();
    };

    const handleAddOutlet = () => {
        if (!newOutletName.trim()) {
            setToast({ show: true, message: 'Nama cabang baru tidak boleh kosong.', type: 'error' });
            return;
        }
        addOutlet(newOutletName);
        setToast({ show: true, message: 'Cabang baru berhasil ditambahkan.', type: 'success' });
        setNewOutletName('');
        setIsAddingOutlet(false);
    };

    const handleDeleteOutlet = (id: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus cabang ini? Tindakan ini tidak dapat diurungkan.")) {
            const result = deleteOutlet(id);
            if (result.success) {
                setToast({ show: true, message: 'Cabang berhasil dihapus.', type: 'success' });
            } else {
                setToast({ show: true, message: result.message || 'Gagal menghapus cabang.', type: 'error' });
            }
        }
    };

    if (!user) return <div>Loading...</div>;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {toast?.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <h1 className="text-3xl font-bold text-white">Profil & Pengaturan</h1>

            {/* User Profile Section */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-4">Profil Pengguna</h2>
                <div className="flex items-center space-x-6">
                    <img src={user.avatarUrl} alt="User Avatar" className="w-24 h-24 rounded-full bg-gray-700"/>
                    <div className="flex-grow space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Nama</label>
                            <input 
                                type="text" 
                                value={userData.name}
                                onChange={e => setUserData({...userData, name: e.target.value})}
                                className="w-full bg-gray-900 border border-gray-600 rounded-md text-white p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Jabatan</label>
                            <input 
                                type="text" 
                                value={userData.role}
                                onChange={e => setUserData({...userData, role: e.target.value})}
                                className="w-full bg-gray-900 border border-gray-600 rounded-md text-white p-2"
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={handleUserSave} className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-6 rounded-md">
                        Simpan Perubahan
                    </button>
                </div>
            </div>

            {/* Outlet Management Section */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Manajemen Cabang</h2>
                    {!isAddingOutlet && (
                        <button onClick={() => setIsAddingOutlet(true)} className="flex items-center bg-brand-secondary hover:bg-brand-primary text-white font-bold py-2 px-4 rounded-md">
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Tambah Cabang
                        </button>
                    )}
                </div>
                
                <div className="space-y-3">
                    {isAddingOutlet && (
                        <div className="bg-gray-700 p-3 rounded-md flex items-center gap-2 animate-fade-in">
                           <input
                                type="text"
                                placeholder="Nama Cabang Baru"
                                value={newOutletName}
                                onChange={e => setNewOutletName(e.target.value)}
                                className="flex-grow bg-gray-900 border border-gray-600 rounded-md text-white p-2"
                                autoFocus
                            />
                            <button onClick={handleAddOutlet} className="p-2 bg-safe-green hover:bg-green-600 rounded-md"><CheckIcon className="w-5 h-5 text-white"/></button>
                            <button onClick={() => setIsAddingOutlet(false)} className="p-2 bg-alert-red hover:bg-red-600 rounded-md"><CloseIcon className="w-5 h-5 text-white"/></button>
                        </div>
                    )}
                    
                    {outlets.map(outlet => (
                        <div key={outlet.id} className="bg-gray-700/50 p-3 rounded-md flex justify-between items-center">
                            {editingOutletId === outlet.id ? (
                                <input
                                    type="text"
                                    value={editingOutletName}
                                    onChange={e => setEditingOutletName(e.target.value)}
                                    className="flex-grow bg-gray-900 border border-gray-600 rounded-md text-white p-2"
                                    autoFocus
                                />
                            ) : (
                                <p className="font-semibold text-white">{outlet.name}</p>
                            )}
                            
                            <div className="flex items-center space-x-2">
                                {editingOutletId === outlet.id ? (
                                    <>
                                        <button onClick={() => handleOutletSave(outlet.id)} className="p-2 text-safe-green hover:bg-safe-green/20 rounded-md"><CheckIcon className="w-5 h-5"/></button>
                                        <button onClick={handleOutletEditCancel} className="p-2 text-gray-400 hover:bg-gray-600/50 rounded-md"><CloseIcon className="w-5 h-5"/></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleOutletEditStart(outlet)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-600/50 rounded-md"><PencilIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDeleteOutlet(outlet.id)} className="p-2 text-alert-red hover:text-red-400 hover:bg-red-500/10 rounded-md"><TrashIcon className="w-5 h-5"/></button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
