

import React, { useMemo } from 'react';
import { CurveModel, FitParameters, ParameterConfig, OutlierMethod } from '../types';
import Button from './ui/Button';
import Select from './ui/Select';
import ParameterSlider from './ui/ParameterSlider';
import Card from './ui/Card';

interface ControlPanelProps {
  onFileLoad: (file: File) => void;
  onGroupingFileLoad: (file: File) => void;
  onClearGrouping: () => void;
  onReconfigureGrouping: () => void;
  isGroupingLoaded: boolean;
  columns: string[];
  selectedXCol: string;
  setSelectedXCol: (col: string) => void;
  selectedYCol: string;
  setSelectedYCol: (col: string) => void;
  curveModel: CurveModel;
  setCurveModel: (model: CurveModel) => void;
  parameters: FitParameters;
  setParameters: (params: FitParameters) => void;
  onOptimize: () => void;
  showKeyPoints: boolean;
  setShowKeyPoints: (show: boolean) => void;
  isDataLoaded: boolean;
  isOptimizing: boolean;
  lockedParams: Set<keyof FitParameters>;
  toggleParamLock: (param: keyof FitParameters) => void;
  isOutlierRemovalEnabled: boolean;
  setIsOutlierRemovalEnabled: (isEnabled: boolean) => void;
  outlierMethod: OutlierMethod;
  setOutlierMethod: (method: OutlierMethod) => void;
  outlierThreshold: number;
  setOutlierThreshold: (threshold: number) => void;
  pendingOutliersCount: number;
  confirmedOutliersCount: number;
  onApplyOutliers: () => void;
  onResetOutliers: () => void;
  isDateAxis: boolean;
  xDomain: [number, number] | null;
}

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const {
    onFileLoad, onGroupingFileLoad, onClearGrouping, onReconfigureGrouping, isGroupingLoaded, columns,
    selectedXCol, setSelectedXCol, selectedYCol, setSelectedYCol, curveModel, setCurveModel,
    parameters, setParameters, onOptimize, showKeyPoints, setShowKeyPoints, isDataLoaded,
    isOptimizing, lockedParams, toggleParamLock,
    isOutlierRemovalEnabled, setIsOutlierRemovalEnabled,
    outlierMethod, setOutlierMethod, outlierThreshold, setOutlierThreshold,
    pendingOutliersCount, confirmedOutliersCount, onApplyOutliers, onResetOutliers,
    isDateAxis, xDomain
  } = props;

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const groupingFileInputRef = React.useRef<HTMLInputElement>(null);
  const [localParameters, setLocalParameters] = React.useState<FitParameters>(parameters);

  React.useEffect(() => {
    setLocalParameters(parameters);
  }, [parameters]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, handler: (file: File) => void) => {
    if (e.target.files && e.target.files[0]) {
      handler(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleParamChange = (name: keyof FitParameters, value: number) => {
    setLocalParameters({ ...localParameters, [name]: value });
    setParameters({ ...parameters, [name]: value }); // Update parent immediately for slider
  };

  const handleParamInputChange = (name: keyof FitParameters, value: number) => {
    setParameters({ ...parameters, [name]: value }); // Update parent only when input is finalized
  };
  
  const isParametric = curveModel === CurveModel.DOUBLE_LOGISTIC || curveModel === CurveModel.SINGLE_LOGISTIC;

  const currentParamConfigs = useMemo(() => {
    const BASE_CONFIGS: { [key in CurveModel]?: ParameterConfig[] } = {
        [CurveModel.DOUBLE_LOGISTIC]: [
            { name: 'baseline', label: 'Baseline', min: -1, max: 1, step: 0.0001 }, { name: 'amplitude', label: 'Amplitude', min: 0, max: 2, step: 0.0001 },
            { name: 'start', label: 'Start (SOS)', min: 0, max: 730, step: 1 }, { name: 'end', label: 'End (EOS)', min: 0, max: 730, step: 1 },
            { name: 'growthRate', label: 'Growth Rate', min: 0.01, max: 1, step: 0.001 }, { name: 'senescenceRate', label: 'Senescence Rate', min: 0.01, max: 1, step: 0.001 },
        ],
        [CurveModel.SINGLE_LOGISTIC]: [ { name: 'L', label: 'Max Value (L)', min: 0, max: 2, step: 0.001 }, { name: 'k', label: 'Steepness (k)', min: 0.01, max: 1, step: 0.001 }, { name: 'x0', label: 'Midpoint (x0)', min: 0, max: 730, step: 1 }, ],
        [CurveModel.LOESS]: [ { name: 'span', label: 'Span', min: 0.05, max: 1, step: 0.01 } ],
        [CurveModel.MOVING_AVERAGE]: [ { name: 'windowSize', label: 'Window Size', min: 3, max: 51, step: 2 } ],
        [CurveModel.SAVITZKY_GOLAY]: [ { name: 'windowSize', label: 'Window Size', min: 5, max: 51, step: 2 } ],
    };

    const configs = BASE_CONFIGS[curveModel] ? JSON.parse(JSON.stringify(BASE_CONFIGS[curveModel])) : [];

    if (isDateAxis && xDomain) {
        const [min, max] = xDomain;
        configs.forEach((config: ParameterConfig) => {
            if (config.name === 'start' || config.name === 'end' || config.name === 'x0') {
                config.min = min;
                config.max = max;
                config.step = 86400000; // One day in ms
            }
        });
    }
    return configs;
  }, [curveModel, isDateAxis, xDomain]);
  
  const cardTitleClass = "text-accent-blue-on-panel";
  const labelClass = "text-on-panel-secondary";

  return (
    <div className="h-full flex flex-col bg-panel-bg text-on-panel-primary overflow-y-auto font-sans">
      <div className="p-4 border-b border-panel-border">
        <h1 className="text-2xl font-bold text-accent-blue-on-panel">PhenoFit Pro</h1>
      </div>

      <div className="p-4 space-y-6 flex-grow">
        <Card title="Data & Setup" className="bg-transparent border-none shadow-none" titleClassName={cardTitleClass}>
            <div className="relative">
                <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, onFileLoad)} accept=".csv, .xlsx, .xls" className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="secondary">Load Data File</Button>
            </div>
            
            <div className="flex items-center mt-2 space-x-2">
              <input type="file" ref={groupingFileInputRef} onChange={(e) => handleFileChange(e, onGroupingFileLoad)} accept=".csv, .xlsx, .xls" className="hidden" />
              <Button onClick={() => groupingFileInputRef.current?.click()} className="w-full" variant="secondary" disabled={!isDataLoaded}>Load Grouping Data</Button>
              {isGroupingLoaded && (
                  <>
                  <Button onClick={onReconfigureGrouping} variant="secondary" className="p-2 w-12 h-10 flex-shrink-0" title="Configure Grouping Data">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </Button>
                  <Button onClick={onClearGrouping} variant="danger" className="p-2 w-12 h-10 flex-shrink-0" title="Clear Grouping Data">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </Button>
                  </>
              )}
            </div>
            
            {isDataLoaded && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-panel-border mt-4">
                <Select label="X Column" options={columns.map(c => ({name: c, value: c}))} value={selectedXCol} onChange={e => setSelectedXCol(e.target.value)} labelClassName={labelClass} />
                <Select label="Y Column" options={columns.map(c => ({name: c, value: c}))} value={selectedYCol} onChange={e => setSelectedYCol(e.target.value)} labelClassName={labelClass} />
              </div>
            )}
        </Card>

        {isDataLoaded && (
          <Card title="Outlier Removal" className="bg-transparent border-none shadow-none" titleClassName={cardTitleClass}>
            <div className="flex items-center">
                <input type="checkbox" id="enable-outlier-removal" checked={isOutlierRemovalEnabled} onChange={(e) => setIsOutlierRemovalEnabled(e.target.checked)} className="h-4 w-4 rounded text-accent-blue-on-panel focus:ring-accent-blue-on-panel bg-item-bg-on-panel border-panel-border" />
                <label htmlFor="enable-outlier-removal" className="ml-2 block text-sm font-medium text-on-panel-primary">Enable Outlier Removal</label>
            </div>
            {isOutlierRemovalEnabled && (
              <div className="mt-4 space-y-4 pt-4 border-t border-panel-border">
                <Select label="Method" options={Object.values(OutlierMethod).map(m => ({name: m, value: m}))} value={outlierMethod} onChange={e => setOutlierMethod(e.target.value as OutlierMethod)} labelClassName={labelClass}/>
                {outlierMethod === OutlierMethod.SD && <ParameterSlider label="Std. Dev. Threshold" min={1} max={5} step={0.1} value={outlierThreshold} onSliderChange={setOutlierThreshold} onInputChange={setOutlierThreshold} isLocked={false} onLockToggle={() => {}} />}
                {outlierMethod === OutlierMethod.IQR && <ParameterSlider label="IQR Multiplier" min={0.5} max={4} step={0.1} value={outlierThreshold} onSliderChange={setOutlierThreshold} onInputChange={setOutlierThreshold} isLocked={false} onLockToggle={() => {}} />}
                {outlierMethod === OutlierMethod.MOVING_WINDOW_SD && <ParameterSlider label="Window Std. Dev." min={1} max={5} step={0.1} value={outlierThreshold} onSliderChange={setOutlierThreshold} onInputChange={setOutlierThreshold} isLocked={false} onLockToggle={() => {}} />}
              </div>
            )}
            {(pendingOutliersCount > 0 || confirmedOutliersCount > 0) && (
                <div className="flex space-x-2 mt-4">
                    <Button onClick={onApplyOutliers} className="w-full" disabled={pendingOutliersCount === 0}>Apply ({pendingOutliersCount})</Button>
                    <Button onClick={onResetOutliers} className="w-full" variant="danger" disabled={confirmedOutliersCount === 0 && pendingOutliersCount === 0}>Reset</Button>
                </div>
            )}
          </Card>
        )}

        {isDataLoaded && (
            <Card title="Model & Parameters" className="bg-transparent border-none shadow-none" titleClassName={cardTitleClass}>
                <Select label="Curve Model" options={Object.values(CurveModel).map(m => ({name: m, value: m}))} value={curveModel} onChange={e => setCurveModel(e.target.value as CurveModel)} labelClassName={labelClass} />
                
                <div className="mt-4 flex items-center">
                    <input type="checkbox" id="show-key-points" checked={showKeyPoints} onChange={(e) => setShowKeyPoints(e.target.checked)} disabled={!isDataLoaded} className="h-4 w-4 rounded text-accent-blue-on-panel focus:ring-accent-blue-on-panel bg-item-bg-on-panel border-panel-border" />
                    <label htmlFor="show-key-points" className="ml-2 block text-sm font-medium text-on-panel-primary">Show SOS/EOS/Peak</label>
                </div>

                <Button onClick={onOptimize} className="w-full mt-4" disabled={!isParametric} isLoading={isOptimizing} variant="secondary">Optimize Fit</Button>
                
                {currentParamConfigs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-panel-border space-y-3">
                     <div className="flex justify-end">
                        <span className="text-xs w-10 text-center font-bold uppercase text-on-panel-muted" title="Lock Parameter">Lock</span>
                    </div>
                    {currentParamConfigs.map((p: ParameterConfig) => (
                        <ParameterSlider key={p.name} label={p.label} min={p.min} max={p.max} step={p.step} 
                          value={localParameters[p.name]} 
                          onSliderChange={value => handleParamChange(p.name, value)}
                          onInputChange={value => handleParamInputChange(p.name, value)}
                          isLocked={lockedParams.has(p.name)}
                          onLockToggle={() => toggleParamLock(p.name)}
                        />
                    ))}
                  </div>
                )}
            </Card>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;