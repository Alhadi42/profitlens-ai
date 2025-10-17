import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCircleIcon } from '../components/icons/UserCircleIcon';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';

export default function ProfileView() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Profile & Settings</h1>

        {/* Profile Card */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
              <UserCircleIcon className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {user?.user_metadata?.full_name || 'User'}
              </h2>
              <p className="text-gray-400">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Account Status</p>
              <p className="text-white font-semibold">Active</p>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Member Since</p>
              <p className="text-white font-semibold">
                {new Date(user?.created_at || '').toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Account Settings</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
              <span className="text-white">Edit Profile</span>
              <ArrowRightIcon className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
              <span className="text-white">Change Password</span>
              <ArrowRightIcon className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
              <span className="text-white">Notification Preferences</span>
              <ArrowRightIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Business Settings */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Business Settings</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
              <span className="text-white">Restaurant Information</span>
              <ArrowRightIcon className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
              <span className="text-white">Tax & Currency Settings</span>
              <ArrowRightIcon className="w-5 h-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
              <span className="text-white">Team Management</span>
              <ArrowRightIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-slate-800 rounded-xl p-6 border border-red-900/50">
          <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}