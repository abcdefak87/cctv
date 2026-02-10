export const Card = ({ 
  children, 
  className = '', 
  glass = false,
  hover = true,
  padding = true,
  ...props 
}) => {
  const baseClasses = 'rounded-2xl transition-all duration-200';
  
  const glassClasses = glass
    ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-glass dark:shadow-glass-dark border border-white/20 dark:border-gray-800/50'
    : 'bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800';
  
  const hoverClasses = hover
    ? 'hover:shadow-2xl hover:-translate-y-0.5'
    : '';
  
  const paddingClasses = padding ? 'p-6' : '';
  
  return (
    <div 
      className={`${baseClasses} ${glassClasses} ${hoverClasses} ${paddingClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-xl font-bold text-gray-900 dark:text-white ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${className}`}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 ${className}`}>
    {children}
  </div>
);
