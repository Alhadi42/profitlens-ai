import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'card' | 'table' | 'chart' | 'text' | 'avatar';
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  className = '', 
  variant = 'card',
  count = 1 
}) => {
  const baseClasses = "animate-pulse bg-gray-700 rounded";
  
  const variants = {
    card: "h-32 w-full",
    table: "h-4 w-full mb-2",
    chart: "h-64 w-full",
    text: "h-4 w-3/4",
    avatar: "h-10 w-10 rounded-full"
  };

  const skeletonClass = `${baseClasses} ${variants[variant]} ${className}`;

  if (count === 1) {
    return <div className={skeletonClass} />;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={skeletonClass} />
      ))}
    </div>
  );
};

export default SkeletonLoader;