const variants = {
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  icon: Icon,
  pulse = false,
  className = '',
  ...props 
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${variants[variant]}
        ${sizes[size]}
        ${pulse ? 'animate-pulse-slow' : ''}
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
};

export const LiveBadge = ({ className = '' }) => (
  <Badge variant="danger" pulse className={className}>
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
    </span>
    LIVE
  </Badge>
);

export const StatusBadge = ({ status, className = '' }) => {
  const statusConfig = {
    online: { variant: 'success', text: 'Online' },
    offline: { variant: 'default', text: 'Offline' },
    maintenance: { variant: 'warning', text: 'Maintenance' },
    error: { variant: 'danger', text: 'Error' },
  };

  const config = statusConfig[status] || statusConfig.offline;

  return (
    <Badge variant={config.variant} className={className}>
      {config.text}
    </Badge>
  );
};
