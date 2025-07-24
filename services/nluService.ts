import { ChartStyles } from '../types';

// This is the structured format we expect the LLM to return.
export interface NLUIntent {
    action: 'PLOT' | 'STYLE' | 'SET_AXIS' | 'TOGGLE_VISIBILITY' | 'OPTIMIZE' | 'UNKNOWN';
    payload: any;
    confidence: number; // A score from 0 to 1 indicating the model's confidence.
    response: string;   // A natural language response to show the user.
}

const API_KEY = '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// This function constructs the detailed prompt for the LLM.
const buildPrompt = (command: string, columns: string[], chartState: any): string => {
    return `
You are an expert AI assistant integrated into a charting application called PhenoFit Pro.
Your task is to interpret a user's natural language command and translate it into a single, valid, structured JSON object that the application can execute.

**IMPORTANT**: You must only respond with a single, valid JSON object and nothing else. Do not wrap it in markdown or any other text.

Here are the possible actions and their corresponding JSON formats:

1.  **PLOT**: When the user wants to plot data. The payload should contain the x and y columns.
    - Keywords: plot, show, draw, graph, chart, vs, with
    - Example: "Plot NDVI vs DAS" -> { "action": "PLOT", "payload": { "y_column": "NDVI", "x_column": "DAS" }, "confidence": 0.9, "response": "OK, plotting NDVI against DAS." }
    - **NOTE**: The Y-axis value (like 'NDVI', 'EVI') usually comes first in the user's command.

2.  **STYLE**: When the user wants to change the visual style of a chart element.
    - Keywords: style, color, background, change, set, opacity, font size, line width
    - Payload contains the target element and a 'properties' object with CSS-like values.
    - Valid targets are: 'chartBackground', 'fitted' (the curve), 'observed' (the data points), 'xAxis', 'yAxis', 'grid', 'legend'.
    - Opacity should be a number between 0 and 1 (e.g., "50% opacity" -> 0.5).
    - Example: "change the background to light blue with 20% opacity" -> { "action": "STYLE", "payload": { "target": "chartBackground", "properties": { "color": "lightblue", "opacity": 0.2 } }, "confidence": 0.95, "response": "OK, I've set the chart background to light blue with 20% opacity." }

3.  **SET_AXIS**: When the user wants to set the min or max limits of an axis.
    - Keywords: limit, range, min, max, x-axis, y-axis
    - The payload must specify the axis ('x' or 'y') and the min/max values.
    - Example: "set x axis limits from 0 to 150" -> { "action": "SET_AXIS", "payload": { "axis": "x", "min": 0, "max": 150 }, "confidence": 0.98, "response": "OK, X-axis limits are now 0 to 150." }

4.  **TOGGLE_VISIBILITY**: To show or hide a chart element.
    - Keywords: show, hide, enable, disable, toggle, legend, key points
    - Valid elements are: 'legend', 'keyPoints' (which includes SOS, EOS, Peak).
    - Example: "hide the legend" -> { "action": "TOGGLE_VISIBILITY", "payload": { "element": "legend", "visible": false }, "confidence": 0.99, "response": "OK, the legend is now hidden." }

5.  **OPTIMIZE**: To run the curve-fitting optimization process.
    - Keywords: optimize, run optimization, fit the curve
    - Example: "optimize the parameters" -> { "action": "OPTIMIZE", "payload": {}, "confidence": 0.98, "response": "OK, starting parameter optimization." }

6.  **UNKNOWN**: If the command is ambiguous or doesn't fit any other category.
    - Example: "hello there" -> { "action": "UNKNOWN", "payload": {}, "confidence": 0.9, "response": "Sorry, I can only help with charting. You can ask me to 'plot NDVI vs Date' or 'change the background color to blue'." }

**Current Context:**
- Available columns for plotting: [${columns.join(', ')}]
- Current chart state: ${JSON.stringify(chartState)}

User Command: "${command}"
`;
}

// Utility to find and parse JSON from the LLM's text response
const extractJson = (text: string): any | null => {
    const match = text.match(/\{.*\}/s);
    if (!match) {
        return null;
    }
    try {
        return JSON.parse(match[0]);
    } catch (e) {
        console.error("Failed to parse JSON from text:", text);
        return null;
    }
}

export const parseCommand = async (command: string, columns: string[], styles: ChartStyles): Promise<NLUIntent> => {
    const chartState = {
        columns,
        styles
    };

    const prompt = buildPrompt(command, columns, chartState);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://phenofit-pro.com', // Recommended by OpenRouter
                'X-Title': 'PhenoFit Pro' // Recommended by OpenRouter
            },
            body: JSON.stringify({
                model: 'mistralai/mistral-7b-instruct', // A known free and capable model
                messages: [
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("LLM API Error:", response.status, errorBody);
            const userMessage = `Sorry, the AI service returned an error (${response.status}). Please check the console for details.`
            return { action: 'UNKNOWN', payload: {}, confidence: 1, response: userMessage };
        }

        const data = await response.json();
        const rawContent = data.choices[0].message.content;
        const jsonResponse = extractJson(rawContent);

        if (jsonResponse && jsonResponse.action && typeof jsonResponse.confidence === 'number') {
            return jsonResponse as NLUIntent;
        } else {
            console.error("Invalid or missing JSON in LLM response:", rawContent);
            return { action: 'UNKNOWN', payload: {}, confidence: 1, response: "Sorry, I received an invalid response from the AI service." };
        }

    } catch (error) {
        console.error("Error calling NLU service:", error);
        return { action: 'UNKNOWN', payload: {}, confidence: 1, response: "An error occurred while processing your command." };
    }
};