

import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { Point, FitParameters, GroupingData, KeyPoints, CurveModel } from '../types';
import { doubleLogistic, singleLogistic, loess, movingAverage, savitzkyGolay } from './curveFitService';

/**
 * Saves a blob to the user's disk, preferring the "Save As" dialog.
 * @param blob The blob to save.
 * @param fileName The suggested file name.
 * @param fileType The MIME type for the file picker.
 * @returns A promise that resolves to `true` on success, or `false` if the user cancelled the action.
 */
async function saveBlob(blob: Blob, fileName: string, fileType: string): Promise<boolean> {
    const options = {
        suggestedName: fileName,
        types: [{
            description: 'Files',
            accept: { [fileType]: [`.${fileName.split('.').pop()}`] },
        }],
    };

    if ((window as any).showSaveFilePicker) {
        try {
            const handle = await (window as any).showSaveFilePicker(options);
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return true; // Success
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.log("User cancelled the save dialog.");
                return false; // User cancelled
            }
            console.warn(`showSaveFilePicker failed, falling back to anchor download.`, error);
        }
    }

    try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    } catch (fallbackError) {
        console.error('Fallback download method failed:', fallbackError);
        throw new Error('File could not be saved.');
    }
}


export async function downloadChartImage(element: HTMLElement, fileName: string = 'phenofit-chart.png'): Promise<boolean> {
    if (!element) {
        throw new Error('Chart container element not provided for export.');
    }

    try {
        const dataUrl = await toPng(element, { 
            backgroundColor: '#ffffff',
            pixelRatio: 6.25,
            width: element.clientWidth,
            height: element.clientHeight,
        });
        
        const blob = await (await fetch(dataUrl)).blob();
        if (!blob || blob.size === 0) {
            throw new Error('Failed to create image blob or blob is empty.');
        }
        return await saveBlob(blob, fileName, 'image/png');

    } catch (error) {
        console.error("Chart image generation failed:", error);
        throw new Error("Could not generate chart image. " + (error instanceof Error ? error.message : ""));
    }
}

function getFittedYValues(observed: Point[], curveModel: CurveModel, parameters: FitParameters): (number | null)[] {
    switch(curveModel) {
        case CurveModel.DOUBLE_LOGISTIC:
            return observed.map(p => doubleLogistic(p.x, parameters));
        case CurveModel.SINGLE_LOGISTIC:
            return observed.map(p => singleLogistic(p.x, parameters));
        case CurveModel.LOESS:
            return loess(observed, parameters.span).map(p => p.y);
        case CurveModel.MOVING_AVERAGE:
             return movingAverage(observed, parameters.windowSize).map(p => p.y);
        case CurveModel.SAVITZKY_GOLAY:
             return savitzkyGolay(observed, parameters.windowSize).map(p => p.y);
        default:
            return observed.map(() => null);
    }
}

type ExcelDataPayload = {
    observed: Point[];
    removed: Point[];
    parameters: FitParameters;
    stats: { r2: number; rmse: number };
    keyPoints: KeyPoints;
    groupingData: GroupingData[] | null;
    curveModel: CurveModel;
    xColName: string;
    yColName: string;
};

export async function downloadExcelData(data: ExcelDataPayload, fileName: string = 'phenofit-results.xlsx'): Promise<boolean> {
    const wb = XLSX.utils.book_new();

    const allData = [...data.observed, ...data.removed].sort((a, b) => a.x - b.x);
    const removedSet = new Set(data.removed.map(p => `${p.originalX}-${p.y}`));

    const fittedYValues = getFittedYValues(data.observed, data.curveModel, data.parameters);
    const fittedMap = new Map(data.observed.map((p, i) => [`${p.originalX}-${p.y}`, fittedYValues[i]]));

    const combinedDataSheet = allData.map(p => ({
        [data.xColName]: p.originalX ?? p.x,
        [data.yColName]: p.y,
        [`fitted_${data.yColName}`]: fittedMap.get(`${p.originalX}-${p.y}`) ?? null,
        is_outlier: removedSet.has(`${p.originalX}-${p.y}`)
    }));
    const dataSheet = XLSX.utils.json_to_sheet(combinedDataSheet);
    XLSX.utils.book_append_sheet(wb, dataSheet, 'Data');

    const keyPointsArray = [
        { Phase: 'Start of Season (SOS)', X: data.keyPoints.sos?.x, Y: data.keyPoints.sos?.y },
        { Phase: 'End of Season (EOS)', X: data.keyPoints.eos?.x, Y: data.keyPoints.eos?.y },
        { Phase: 'Peak', X: data.keyPoints.peak?.x, Y: data.keyPoints.peak?.y },
    ].filter(p => p.X != null && p.Y != null);

    if (keyPointsArray.length > 0) {
        const phenoSheet = XLSX.utils.json_to_sheet(keyPointsArray);
        XLSX.utils.book_append_sheet(wb, phenoSheet, 'Phenophases');
    }

    const activeParams: { [key: string]: any } = {};
    switch(data.curveModel) {
        case CurveModel.DOUBLE_LOGISTIC:
            ['baseline', 'amplitude', 'start', 'end', 'growthRate', 'senescenceRate'].forEach(k => activeParams[k] = (data.parameters as any)[k]);
            break;
        case CurveModel.SINGLE_LOGISTIC:
             ['L', 'k', 'x0'].forEach(k => activeParams[k] = (data.parameters as any)[k]);
             break;
        case CurveModel.LOESS:
            activeParams['span'] = data.parameters.span;
            break;
        case CurveModel.MOVING_AVERAGE:
        case CurveModel.SAVITZKY_GOLAY:
            activeParams['windowSize'] = data.parameters.windowSize;
            break;
    }
    const paramsArray = Object.entries(activeParams).map(([Parameter, Value]) => ({ Parameter, Value }));
    const paramsSheet = XLSX.utils.json_to_sheet(paramsArray);
    XLSX.utils.book_append_sheet(wb, paramsSheet, 'Model_Parameters');

    const statsSheet = XLSX.utils.json_to_sheet([
        { Metric: 'R-squared', Value: data.stats.r2 },
        { Metric: 'RMSE', Value: data.stats.rmse },
    ]);
    XLSX.utils.book_append_sheet(wb, statsSheet, 'Statistics');

    if (data.groupingData && data.groupingData.length > 0) {
        const groupsSheet = XLSX.utils.json_to_sheet(data.groupingData.map(g => ({...g, color: undefined})));
        XLSX.utils.book_append_sheet(wb, groupsSheet, 'Grouping_Data');
    }

    const wb_out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wb_out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return await saveBlob(blob, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}