const sizes = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export const Spinner = ({ size = 'md', className = '', text }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg 
        className={`animate-spin ${sizes[size]} ${className}`}
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export const LoadingOverlay = ({ text = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl">
        <Spinner size="lg" text={text} className="text-primary-500" />
      </div>
    </div>
  );
};

export const InlineLoader = ({ text }) => {
  return (
    <div className="flex items-center justify-center py-8">
      <Spinner size="md" text={text} className="text-primary-500" />
    </div>
  );
};
