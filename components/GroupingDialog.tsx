
import React, { useState } from 'react';
import { GroupingConfig } from '../types';
import Button from './ui/Button';

interface GroupingDialogProps {
    columns: string[];
    onSubmit: (config: GroupingConfig) => void;
    onCancel: () => void;
}

const GroupingDialog: React.FC<GroupingDialogProps> = ({ columns, onSubmit, onCancel }) => {
    const [startCol, setStartCol] = useState(columns[0] || '');
    const [endCol, setEndCol] = useState<string>('');
    const [labelCol, setLabelCol] = useState<string>(columns.length > 1 ? columns[1] : columns[0] || '');

    const handleSubmit = () => {
        if (!startCol) {
            alert("Start Column is required.");
            return;
        }
        onSubmit({
            startCol,
            endCol: endCol || null,
            labelCol: labelCol === '' ? null : labelCol,
            colorCol: null,
        });
    };
    
    const renderSelect = (label: string, value: string, setter: (val: string) => void, optional = false) => (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <select
                value={value}
                onChange={e => setter(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
                {optional && <option value="">-- Optional --</option>}
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Configure Grouping Data</h2>
                <p className="text-sm text-gray-600">Map the columns from your grouping file to the required fields.</p>
                
                {renderSelect("Start Column (e.g., event date)", startCol, setStartCol)}
                {renderSelect("End Column (optional)", endCol, setEndCol, true)}
                {renderSelect("Group Label Column", labelCol, setLabelCol, true)}
                

                <div className="flex justify-end space-x-4 pt-4">
                    <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSubmit}>Apply Grouping</Button>
                </div>
            </div>
        </div>
    );
};

export default GroupingDialog;
