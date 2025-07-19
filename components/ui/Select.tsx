import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: {name: string, value: string}[];
  labelClassName?: string;
}

const Select: React.FC<SelectProps> = ({ label, options, className = '', labelClassName = '', ...props }) => {
  return (
    <div>
      <label htmlFor={props.id || props.name} className={`block text-sm font-medium ${labelClassName}`}>
        {label}
      </label>
      <select
        className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-panel-border bg-item-bg-on-panel text-on-panel-primary focus:outline-none focus:ring-accent-blue-on-panel focus:border-accent-blue-on-panel sm:text-sm rounded-md ${className}`}
        {...props}
      >
        <option value="" disabled className="text-text-on-panel-muted">-- Select --</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.name}</option>
        ))}
      </select>
    </div>
  );
};

export default Select;