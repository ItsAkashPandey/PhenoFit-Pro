import React from 'react';
import { KeyPoints, FitParameters, CurveModel } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';

interface ResultsPanelProps {
    stats: { r2: number; rmse: number };
    keyPoints: KeyPoints;
    parameters: FitParameters;
    curveModel: CurveModel;
    isDateAxis: boolean;
    isDataLoaded: boolean;
    onDownload: () => void;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ stats, keyPoints, onDownload }) => {
    return (
        <div className="bg-panel-bg p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-on-panel-primary">
                <div className="md:col-span-1">
                    <h3 className="text-md font-semibold text-accent-blue-on-panel">Goodness of Fit</h3>
                    <div className="space-y-2 text-sm mt-2">
                      <div className="flex justify-between text-on-panel-secondary"><span>R²:</span><span className="font-semibold text-on-panel-primary">{stats.r2.toFixed(4)}</span></div>
                      <div className="flex justify-between text-on-panel-secondary"><span>RMSE:</span><span className="font-semibold text-on-panel-primary">{stats.rmse.toFixed(4)}</span></div>
                    </div>
                </div>

                <div className="md:col-span-1">
                    <h3 className="text-md font-semibold text-accent-blue-on-panel">Phenological Parameters</h3>
                    <table className="w-full text-sm text-left mt-2">
                      <thead><tr className="border-b border-panel-border"><th className="pb-1 font-medium text-on-panel-secondary">Phase</th><th className="pb-1 text-right font-medium text-on-panel-secondary">X</th><th className="pb-1 text-right font-medium text-on-panel-secondary">Y</th></tr></thead>
                      <tbody>
                        <tr><td className="py-1">SOS</td><td className="text-right">{keyPoints.sos?.x.toFixed(2) ?? 'N/A'}</td><td className="text-right">{keyPoints.sos?.y.toFixed(2) ?? 'N/A'}</td></tr>
                        <tr><td className="py-1">EOS</td><td className="text-right">{keyPoints.eos?.x.toFixed(2) ?? 'N/A'}</td><td className="text-right">{keyPoints.eos?.y.toFixed(2) ?? 'N/A'}</td></tr>
                        <tr><td className="py-1">Peak</td><td className="text-right">{keyPoints.peak?.x.toFixed(2) ?? 'N/A'}</td><td className="text-right">{keyPoints.peak?.y.toFixed(2) ?? 'N/A'}</td></tr>
                      </tbody>
                    </table>
                </div>

                <div className="md:col-span-1 flex items-center justify-center">
                     <Button onClick={onDownload} className="w-full max-w-xs" variant="secondary">Download Results</Button>
                </div>
            </div>
        </div>
    );
};

export default ResultsPanel;