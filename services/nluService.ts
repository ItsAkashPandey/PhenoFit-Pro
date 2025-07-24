<<<<<<< Updated upstream
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
=======
import { ChartStyles, ApiService } from '../types';
import { toHex } from './colorUtils';

// This is the structured format we expect the LLM to return.
export interface NLUIntent {
    actions: Array<{ action: 'PLOT' | 'STYLE' | 'SET_AXIS' | 'TOGGLE_VISIBILITY' | 'OPTIMIZE' | 'SET_LABEL' | 'REVERT' | 'MOVE_ELEMENT' | 'SET_PARAMETER' | 'TOGGLE_PARAM_LOCK' | 'UNKNOWN'; payload: any; response: string; confidence: number; }>;
    response: string;   // A natural language response to show the user.
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
>>>>>>> Stashed changes

// This function constructs the detailed prompt for the LLM.
const buildPrompt = (command: string, columns: string[], chartState: any): string => {
    return `
You are an expert AI assistant integrated into a charting application called PhenoFit Pro.
<<<<<<< Updated upstream
Your task is to interpret a user's natural language command and translate it into a single, valid, structured JSON object that the application can execute.

**IMPORTANT**: You must only respond with a single, valid JSON object and nothing else. Do not wrap it in markdown or any other text.
=======
Your task is to interpret a user's natural language command and translate it into a single, valid, structured JSON object that the application can execute. This JSON object should contain an array of actions if multiple distinct actions are implied by the user's command.

**IMPORTANT**: You must only respond with a single, valid JSON object and nothing else. Do not wrap it in markdown or any other text. The top-level JSON object must have an 'actions' key which is an array of action objects, and a 'response' key for a natural language reply. Each action object within the 'actions' array must have an 'action', 'payload', 'confidence', and 'response' key.
>>>>>>> Stashed changes

Here are the possible actions and their corresponding JSON formats:

1.  **PLOT**: When the user wants to plot data. The payload should contain the x and y columns.
    - Keywords: plot, show, draw, graph, chart, vs, with
    - Example: "Plot NDVI vs DAS" -> { "action": "PLOT", "payload": { "y_column": "NDVI", "x_column": "DAS" }, "confidence": 0.9, "response": "OK, plotting NDVI against DAS." }
    - **NOTE**: The Y-axis value (like 'NDVI', 'EVI') usually comes first in the user's command.

2.  **STYLE**: When the user wants to change the visual style of a chart element.
<<<<<<< Updated upstream
    - Keywords: style, color, background, change, set, opacity, font size, line width
    - Payload contains the target element and a 'properties' object with CSS-like values.
    - Valid targets are: 'chartBackground', 'fitted' (the curve), 'observed' (the data points), 'xAxis', 'yAxis', 'grid', 'legend'.
    - Opacity should be a number between 0 and 1 (e.g., "50% opacity" -> 0.5).
    - Example: "change the background to light blue with 20% opacity" -> { "action": "STYLE", "payload": { "target": "chartBackground", "properties": { "color": "lightblue", "opacity": 0.2 } }, "confidence": 0.95, "response": "OK, I've set the chart background to light blue with 20% opacity." }
=======
    - Keywords: style, color, background, change, set, opacity, font size, line width, thickness
    - Payload contains the target element and a 'properties' object with CSS-like values.
    - Valid targets are: 'chartBackground', 'fitted' (the curve), 'observed' (the data points), 'xAxis', 'yAxis', 'grid', 'legend'.
    - Opacity should be a number between 0 and 1 (e.g., "50% opacity" -> 0.5).
    - Line width/thickness should be a number.
    - Example: "change the background to light blue with 20% opacity" -> { "action": "STYLE", "payload": { "target": "chartBackground", "properties": { "color": "#ADD8E6", "opacity": 0.2 } }, "confidence": 0.95, "response": "OK, I've set the chart background to light blue with 20% opacity." }
    - Example: "set line thickness to 3" -> { "action": "STYLE", "payload": { "target": "fitted", "properties": { "lineWidth": 3 } }, "confidence": 0.9, "response": "OK, I've set the line thickness to 3." }
    - **NOTE**: Always use hex color codes (e.g., #RRGGBB) for colors. If a color name is given, convert it to its hex equivalent. Common colors and their hex values:
        - red: #FF0000
        - green: #008000
        - blue: #0000FF
        - yellow: #FFFF00
        - black: #000000
        - white: #FFFFFF
        - lightblue: #ADD8E6
        - gray: #808080
        - darkgray: #A9A9A9
        - lightgray: #D3D3D3
        - orange: #FFA500
        - purple: #800080
        - pink: #FFC0CB
        - brown: #A52A2A
        - cyan: #00FFFF
        - magenta: #FF00FF
        - lime: #00FF00
        - teal: #008080
        - indigo: #4B0082
        - violet: #EE82EE
        - gold: #FFD700
        - silver: #C0C0C0
        - maroon: #800000
        - olive: #808000
        - navy: #000080
        - turquoise: #40E0D0
        - coral: #FF7F50
        - chocolate: #D2691E
        - crimson: #DC143C
        - fuchsia: #FF00FF
        - khaki: #F0E68C
        - lavender: #E6E6FA
        - plum: #DDA0DD
        - salmon: #FA8072
        - sienna: #A0522D
        - skyblue: #87CEEB
        - tan: #D2B48C
        - thistle: #D8BFD8
        - tomato: #FF6347
        - wheat: #F5DEB3
        - tortoise: #81613C
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
6.  **UNKNOWN**: If the command is ambiguous or doesn't fit any other category.
=======
6.  **SET_LABEL**: To change the text label of an axis.
    - Keywords: label, title, name, change, set, x-axis, y-axis
    - The payload must specify the axis ('x' or 'y') and the new text.
    - Example: "change x-axis label to Days" -> { "action": "SET_LABEL", "payload": { "axis": "x", "text": "Days" }, "confidence": 0.97, "response": "OK, the X-axis label is now 'Days'." }

7.  **REVERT**: To undo the last change made by the assistant.
    - Keywords: revert, undo, go back, previous
    - Example: "revert that" -> { "action": "REVERT", "payload": {}, "confidence": 0.99, "response": "OK, I have reverted the last change." }

8.  **MOVE_ELEMENT**: To move a chart element to a specific position.
    - Keywords: move, position, place, legend, top, bottom, left, right, center
    - The payload must specify the element and the position.
    - Example: "move legend to top right" -> { "action": "MOVE_ELEMENT", "payload": { "element": "legend", "position": "top right" }, "confidence": 0.98, "response": "OK, I've moved the legend to the top right." }

9.  **SET_PARAMETER**: To set the value of a model parameter.
    - Keywords: set, change, parameter, baseline, amplitude, start, end, growthRate, senescenceRate, L, k, x0, span, windowSize
    - The payload must specify the parameter name and the new value.
    - Example: "set baseline to 0.2" -> { "action": "SET_PARAMETER", "payload": { "parameter": "baseline", "value": 0.2 }, "confidence": 0.99, "response": "OK, I've set the baseline to 0.2." }

10. **TOGGLE_PARAM_LOCK**: To lock or unlock a model parameter.
    - Keywords: lock, unlock, parameter, baseline, amplitude, start, end, growthRate, senescenceRate, L, k, x0, span, windowSize
    - The payload must specify the parameter name and the lock state.
    - Example: "lock amplitude" -> { "action": "TOGGLE_PARAM_LOCK", "payload": { "parameter": "amplitude", "locked": true }, "confidence": 0.99, "response": "OK, I've locked the amplitude parameter." }

11. **UNKNOWN**: If the command is ambiguous or doesn't fit any other category.
>>>>>>> Stashed changes
    - Example: "hello there" -> { "action": "UNKNOWN", "payload": {}, "confidence": 0.9, "response": "Sorry, I can only help with charting. You can ask me to 'plot NDVI vs Date' or 'change the background color to blue'." }

**Current Context:**
- Available columns for plotting: [${columns.join(', ')}]
- Current chart state: ${JSON.stringify(chartState)}

User Command: "${command}"
<<<<<<< Updated upstream
=======

Respond with a JSON object like this: { "actions": [ { "action": "ACTION_TYPE", "payload": { ... }, "response": "..." }, { ... } ], "response": "Overall response to user." }
>>>>>>> Stashed changes
`;
}

// Utility to find and parse JSON from the LLM's text response
const extractJson = (text: string): any | null => {
    const match = text.match(/\{.*\}/s);
    if (!match) {
<<<<<<< Updated upstream
        return null;
    }
    try {
        return JSON.parse(match[0]);
    } catch (e) {
        console.error("Failed to parse JSON from text:", text);
=======
        console.error("extractJson: No JSON object found in text:", text);
        return null;
    }
    try {
        const jsonString = match[0];
        console.log("extractJson: Attempting to parse JSON string:", jsonString);
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("extractJson: Failed to parse JSON from text:", text, "Error:", e);
>>>>>>> Stashed changes
        return null;
    }
}

<<<<<<< Updated upstream
export const parseCommand = async (command: string, columns: string[], styles: ChartStyles): Promise<NLUIntent> => {
=======
export const parseCommand = async (command: string, columns: string[], styles: ChartStyles, modelConfig: ModelConfig): Promise<NLUIntent> => {
>>>>>>> Stashed changes
    const chartState = {
        columns,
        styles
    };

    const prompt = buildPrompt(command, columns, chartState);

<<<<<<< Updated upstream
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
=======
    let apiUrl: string;
    let apiKey: string | undefined;
    let headers: HeadersInit;

    if (modelConfig.service === ApiService.OPENROUTER) {
        apiUrl = OPENROUTER_API_URL;
        apiKey = OPENROUTER_API_KEY;
        headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://phenofit-pro.com', // Recommended by OpenRouter
            'X-Title': 'PhenoFit Pro' // Recommended by OpenRouter
        };
    } else { // ApiService.GEMINI
        apiUrl = `${GEMINI_API_URL}${modelConfig.modelName}:generateContent`;
        apiKey = GEMINI_API_KEY;
        headers = {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey || '' // Gemini uses x-goog-api-key header
        };
    }

    if (!apiKey) {
        return { actions: [], response: `Please provide a valid API key for ${modelConfig.service} in your .env file.` };
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(
                modelConfig.service === ApiService.OPENROUTER ?
                {
                    model: modelConfig.modelName,
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                } : // Gemini API structure
                {
                    contents: [
                        { role: 'user', parts: [{ text: prompt }] }
                    ]
                }
            )
>>>>>>> Stashed changes
        });

        if (!response.ok) {
            const errorBody = await response.text();
<<<<<<< Updated upstream
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
=======
            console.error("LLM API Error: Status", response.status, "Body:", errorBody);
            let userMessage = `Sorry, the AI service returned an error (${response.status}). Please check the console for details.`
            if (response.status === 404 && modelConfig.service === ApiService.GEMINI) {
                userMessage = `Gemini model '${modelConfig.modelName}' not found or accessible. Please ensure your API key is correct, the model is available in your region, and you have sufficient quota.`;
            }
            return { actions: [], confidence: 1, response: userMessage };
        }

        const data = await response.json();
        console.log("LLM Raw Data:", data); // Log the raw data
        let rawContent: string;
        if (modelConfig.service === ApiService.OPENROUTER) {
            rawContent = data.choices[0].message.content;
        } else { // ApiService.GEMINI
            rawContent = data.candidates[0].content.parts[0].text;
        }
        const jsonResponse = extractJson(rawContent);

        if (jsonResponse && Array.isArray(jsonResponse.actions)) {
            console.log("NLU: JSON Response before processing:", JSON.stringify(jsonResponse));

            // Process each action in the array
            jsonResponse.actions.forEach((actionItem: any) => {
                if (actionItem.action === 'STYLE' && actionItem.payload && actionItem.payload.properties) {
                    const { properties } = actionItem.payload;
                    if (properties.lineWidth) {
                        properties.lineWidth = Number(properties.lineWidth);
                    }
                }
            });

            console.log("NLU: JSON Response after processing:", JSON.stringify(jsonResponse));
            return jsonResponse as NLUIntent;
        } else {
            console.error("Invalid or missing JSON in LLM response:", rawContent);
            return { actions: [], response: "Sorry, I received an invalid response from the AI service." };
>>>>>>> Stashed changes
        }

    } catch (error) {
        console.error("Error calling NLU service:", error);
        return { action: 'UNKNOWN', payload: {}, confidence: 1, response: "An error occurred while processing your command." };
    }
};