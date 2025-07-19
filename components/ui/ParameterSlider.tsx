import React from 'react';

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  isLocked: boolean;
  onLockToggle: () => void;
  disabled?: boolean;
}

const ParameterSlider: React.FC<ParameterSliderProps> = ({ label, value, min, max, step, onChange, isLocked, onLockToggle, disabled = false }) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange(val);
    }
  };
  
  const isDisabled = disabled || isLocked;

  return (
    <div className="space-y-1">
        <label className="text-sm font-medium text-on-panel-primary">{label}</label>
        <div className="flex gap-x-2 items-center">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={handleSliderChange}
              disabled={isDisabled}
              className="flex-grow h-2 bg-on-panel-muted rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <input
              type="number"
              value={value.toFixed(4)}
              min={min}
              max={max}
              step={step}
              onChange={handleInputChange}
              disabled={isDisabled}
              className="w-24 text-sm p-1 rounded-md border-panel-border bg-item-bg-on-panel text-on-panel-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex-shrink-0">
                <input
                    id={`lock-${label}`}
                    type="checkbox"
                    checked={isLocked}
                    onChange={onLockToggle}
                    disabled={disabled}
                    title={`Lock ${label}`}
                    className="h-4 w-4 rounded text-accent-pink focus:ring-accent-pink bg-item-bg-on-panel border-panel-border cursor-pointer"
                />
            </div>
        </div>
    </div>
  );
};

export default ParameterSlider;