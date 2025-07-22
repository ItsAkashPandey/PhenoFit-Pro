import React, { useState } from 'react';
import Button from './ui/Button';

interface SheetSelectionDialogProps {
  sheetNames: string[];
  onSelect: (sheetName: string) => void;
  onCancel: () => void;
}

const SheetSelectionDialog: React.FC<SheetSelectionDialogProps> = ({ sheetNames, onSelect, onCancel }) => {
  const [selectedSheet, setSelectedSheet] = useState(sheetNames[0]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Select Excel Sheet</h2>
        <p className="text-sm text-gray-600">This Excel file contains multiple sheets. Please select one to load:</p>
        
        <select
          value={selectedSheet}
          onChange={(e) => setSelectedSheet(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          {sheetNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <div className="flex justify-end space-x-4 pt-4">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSelect(selectedSheet)}>Load Sheet</Button>
        </div>
      </div>
    </div>
  );
};

export default SheetSelectionDialog;
