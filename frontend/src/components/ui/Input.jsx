import { forwardRef, useState } from 'react';

export const Input = forwardRef(({ 
  label,
  error,
  hint,
  icon: Icon,
  rightIcon: RightIcon,
  className = '',
  containerClassName = '',
  ...props 
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        
        <input
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full rounded-xl px-4 py-2.5 text-gray-900 dark:text-white
            bg-white dark:bg-gray-800
            border-2 transition-all duration-200
            ${error 
              ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/20' 
              : isFocused
                ? 'border-primary-500 ring-4 ring-primary-500/20'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            }
            ${Icon ? 'pl-11' : ''}
            ${RightIcon ? 'pr-11' : ''}
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none
            ${className}
          `}
          {...props}
        />
        
        {RightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <RightIcon className="w-5 h-5" />
          </div>
        )}
      </div>
      
      {(error || hint) && (
        <p className={`mt-2 text-sm ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export const SearchInput = forwardRef(({ placeholder = 'Search...', ...props }, ref) => {
  const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
  );

  return <Input ref={ref} icon={SearchIcon} placeholder={placeholder} {...props} />;
});

SearchInput.displayName = 'SearchInput';
