import { Point, FitParameters } from '../types';

// Sigmoid (logistic) function, equivalent to scipy.special.expit
function expit(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function doubleLogistic(t: number, p: FitParameters): number {
  return p.baseline + (p.amplitude * expit(p.growthRate * (t - p.start))) * (1 - expit(p.senescenceRate * (t - p.end)));
}

export function singleLogistic(t: number, p: FitParameters): number {
  // Using L, k, x0 for standard logistic function
  return p.L / (1 + Math.exp(-p.k * (t - p.x0)));
}

// A simple implementation of LOESS for demonstration
export function loess(data: Point[], span: number): Point[] {
    if (data.length < 3) return data;

    const sortedData = [...data].sort((a, b) => a.x - b.x);
    const n = sortedData.length;
    const smoothPoints: Point[] = [];

    for (let i = 0; i < n; i++) {
        const x0 = sortedData[i].x;
        const halfSpan = Math.floor(n * span / 2);
        
        let start = Math.max(0, i - halfSpan);
        let end = Math.min(n - 1, i + halfSpan);
        
        const window = sortedData.slice(start, end + 1);

        if (window.length < 2) {
             smoothPoints.push({ x: x0, y: sortedData[i].y });
             continue;
        }

        const xs = window.map(p => p.x);
        const ys = window.map(p => p.y);

        // Simple linear regression on the window
        const sumX = xs.reduce((a, b) => a + b, 0);
        const sumY = ys.reduce((a, b) => a + b, 0);
        const sumXY = xs.reduce((sum, x, j) => sum + x * ys[j], 0);
        const sumX2 = xs.reduce((sum, x) => sum + x * x, 0);
        const N = window.length;

        const m = (N * sumXY - sumX * sumY) / (N * sumX2 - sumX * sumX);
        const b = (sumY - m * sumX) / N;

        const y0 = m * x0 + b;
        smoothPoints.push({ x: x0, y: y0 });
    }

    return smoothPoints;
}

export function movingAverage(data: Point[], windowSize: number): Point[] {
    if (windowSize < 1) return data;
    const sortedData = [...data].sort((a, b) => a.x - b.x);
    const result: Point[] = [];
    for (let i = 0; i < sortedData.length; i++) {
        const halfWindow = Math.floor(windowSize / 2);
        const start = Math.max(0, i - halfWindow);
        const end = Math.min(sortedData.length - 1, i + halfWindow);
        const window = sortedData.slice(start, end + 1);
        const avgY = window.reduce((sum, p) => sum + p.y, 0) / window.length;
        result.push({ x: sortedData[i].x, y: avgY });
    }
    return result;
}

// Simplified Savitzky-Golay filter implementation using local polynomial regression.
export function savitzkyGolay(data: Point[], windowSize: number, polynomialOrder: number = 2): Point[] {
    const sortedData = [...data].sort((a, b) => a.x - b.x);
    if (windowSize % 2 === 0 || windowSize <= polynomialOrder || sortedData.length < windowSize) {
        // Fallback to moving average if params are invalid for SG
        return movingAverage(data, windowSize);
    }

    const halfWindow = Math.floor(windowSize / 2);
    const result: Point[] = [];

    for (let i = 0; i < sortedData.length; i++) {
        const start = Math.max(0, i - halfWindow);
        const end = Math.min(sortedData.length, i + halfWindow + 1);
        const window = sortedData.slice(start, end);

        // Vandermonde matrix for least-squares
        const X = window.map(p => {
            const row = [];
            for (let j = 0; j <= polynomialOrder; j++) {
                row.push(Math.pow(p.x - sortedData[i].x, j));
            }
            return row;
        });
        const y = window.map(p => [p.y]);

        try {
            // (X^T * X)^-1 * X^T * y
            const Xt = transpose(X);
            const XtX = multiply(Xt, X);
            const XtX_inv = invert(XtX); // This is the hard part
            if (!XtX_inv) { // Inversion failed
                 result.push({ x: sortedData[i].x, y: sortedData[i].y });
                 continue;
            }
            const XtY = multiply(Xt, y);
            const coeffs = multiply(XtX_inv, XtY);

            result.push({ x: sortedData[i].x, y: coeffs[0][0] });
        } catch (e) {
            // Fallback for singular matrix etc.
            result.push({ x: sortedData[i].x, y: sortedData[i].y });
        }
    }
    return result;
}

// --- Matrix math helpers for Savitzky-Golay ---
function transpose(matrix: number[][]): number[][] {
    if (!matrix || matrix.length === 0) return [];
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
}
function multiply(a: number[][], b: number[][]): number[][] {
    const result = new Array(a.length).fill(0).map(() => new Array(b[0].length).fill(0));
    return result.map((row, i) => {
        return row.map((_, j) => {
            return a[i].reduce((sum, _, k) => sum + a[i][k] * b[k][j], 0);
        });
    });
}
function invert(matrix: number[][]): number[][] | null {
    // This function only handles up to 3x3 matrix inversion for polyOrder<=2
    if (!matrix || matrix.length !== matrix[0].length) return null;
    const dim = matrix.length;

    if (dim === 1) return [[1 / matrix[0][0]]];
    if (dim === 2) {
        const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
        if (det === 0) return null;
        return [
            [matrix[1][1] / det, -matrix[0][1] / det],
            [-matrix[1][0] / det, matrix[0][0] / det]
        ];
    }
    if (dim === 3) {
        const m = matrix.flat();
        const det = m[0]*(m[4]*m[8]-m[5]*m[7]) - m[1]*(m[3]*m[8]-m[5]*m[6]) + m[2]*(m[3]*m[7]-m[4]*m[6]);
        if (det === 0) return null;
        const invdet = 1 / det;
        return [
            [(m[4]*m[8]-m[5]*m[7])*invdet, (m[2]*m[7]-m[1]*m[8])*invdet, (m[1]*m[5]-m[2]*m[4])*invdet],
            [(m[5]*m[6]-m[3]*m[8])*invdet, (m[0]*m[8]-m[2]*m[6])*invdet, (m[2]*m[3]-m[0]*m[5])*invdet],
            [(m[3]*m[7]-m[4]*m[6])*invdet, (m[1]*m[6]-m[0]*m[7])*invdet, (m[0]*m[4]-m[1]*m[3])*invdet]
        ];
    }
    return null; // Not implemented for other sizes
}
// --- End Matrix helpers ---


export async function optimizeParameters(
  data: Point[],
  initialParams: FitParameters,
  modelFunction: (t: number, p: FitParameters) => number,
  paramNames: (keyof FitParameters)[],
  lockedParams: Set<keyof FitParameters>
): Promise<FitParameters> {
  let bestParams = { ...initialParams };
  
  const unlockedParamNames = paramNames.filter(p => !lockedParams.has(p));

  const calculateError = (params: FitParameters) => {
    return data.reduce((sum, pt) => {
      const predictedY = modelFunction(pt.x, params);
      return sum + Math.pow(pt.y - predictedY, 2);
    }, 0) / data.length;
  };

  let minError = calculateError(bestParams);

  // More robust multi-pass optimization
  for (let pass = 0; pass < 3; pass++) {
      const stepSizes: { [key in keyof FitParameters]?: number } = {};
      unlockedParamNames.forEach(p => {
          // Reset step size each pass based on current best param
          stepSizes[p] = (Math.abs(bestParams[p] * 0.1) || 0.01) / Math.pow(1.5, pass);
      });
      
      let improvedInPass = true;
      for (let iter = 0; iter < 50 && improvedInPass; iter++) {
          improvedInPass = false;
          unlockedParamNames.forEach(paramKey => {
              const currentParamValue = bestParams[paramKey];
              const step = stepSizes[paramKey]!;
              if(!step) return;
              
              const paramsUp = { ...bestParams, [paramKey]: currentParamValue + step };
              const errorUp = calculateError(paramsUp);
              
              const paramsDown = { ...bestParams, [paramKey]: currentParamValue - step };
              const errorDown = calculateError(paramsDown);

              if (errorUp < minError) {
                  minError = errorUp;
                  bestParams = paramsUp;
                  improvedInPass = true;
              } else if (errorDown < minError) {
                  minError = errorDown;
                  bestParams = paramsDown;
                  improvedInPass = true;
              } else {
                  stepSizes[paramKey] = step * 0.98; // More gradual step reduction
              }
          });
      }
  }

  // Final constraint check
  if (modelFunction === doubleLogistic && bestParams.start >= bestParams.end) {
      if (bestParams.start > data[Math.floor(data.length / 2)].x) {
        bestParams.end = bestParams.start + 20;
      } else {
        const temp = bestParams.start;
        bestParams.start = bestParams.end;
        bestParams.end = temp;
      }
  }

  return Promise.resolve(bestParams);
}