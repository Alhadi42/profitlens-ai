import React, { useState, useEffect } from 'react';

const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showStatus && isOnline) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-300 ${
      isOnline 
        ? 'bg-green-600 translate-y-0 opacity-100' 
        : 'bg-red-600 translate-y-0 opacity-100'
    }`}>
      {isOnline ? (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
          Koneksi pulih
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-300 rounded-full"></div>
          Tidak ada koneksi internet
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;