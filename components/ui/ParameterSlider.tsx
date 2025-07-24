import React, { useState, useEffect, useRef } from 'react';

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onSliderChange: (value: number) => void; // New prop for slider changes
  onInputChange: (value: number) => void; // Prop for when input value is finalized (onBlur/Enter)
  isLocked: boolean;
  onLockToggle: () => void;
  disabled?: boolean;
}

const ParameterSlider: React.FC<ParameterSliderProps> = ({ label, value, min, max, step, onSliderChange, onInputChange, isLocked, onLockToggle, disabled = false }) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null); // Ref to the number input

  useEffect(() => {
    // Update internal input value when the external 'value' prop changes,
    // but only if the input is not currently focused (user is not typing)
    // or if the current inputValue is not a valid number (meaning user is typing something invalid)
    // or if the external value is significantly different from the current input value
    if (inputRef.current && document.activeElement !== inputRef.current) {
      setInputValue(value.toFixed(3)); // Format to 3 decimal places for display
    }
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setInputValue(newValue.toString()); // Update internal state for immediate visual feedback
    onSliderChange(newValue); // Immediately update parent for slider changes
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value); // Only update internal state while typing
  };

  const handleInputBlur = () => {
    const newValue = parseFloat(inputValue);
    if (!isNaN(newValue)) {
      onInputChange(newValue); // Update parent only on blur
    } else {
      setInputValue(value.toString()); // Revert to last valid value if input is invalid
    }
  };

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newValue = parseFloat(inputValue);
      if (!isNaN(newValue)) {
        onInputChange(newValue); // Update parent on Enter
      } else {
        setInputValue(value.toString()); // Revert to last valid value if input is invalid
      }
      e.currentTarget.blur(); // Blur the input to dismiss keyboard on mobile, etc.
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
              ref={inputRef} // Assign the ref here
              type="number"
              value={inputValue}
              min={min}
              max={max}
              step={step}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyPress={handleInputKeyPress}
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