// Debug script for NLU issue
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read the NLU service
const nluPath = join(__dirname, 'src', 'features', 'aiAssistant', 'NLU.service.ts');
const nluContent = readFileSync(nluPath, 'utf8');

console.log('=== Debugging "change background color to blue" ===\n');

const text = 'change background color to blue';
const normalizedText = text.toLowerCase().trim();

console.log('Input:', text);
console.log('Normalized:', normalizedText);

// 1. Intent Classification Test
console.log('\n1. Intent Classification:');
const chartStylingPatterns = [
  /\b(change|set|modify|make|update|alter|increase|decrease)\b.*\b(line|curve|fitted)\b/,
  /\b(line|curve|fitted)\b.*\b(thickness|thick|width)\b/,
  /\b(thickness|thick|width)\b.*\b(line|curve|fitted)\b/,
  /\b(line|curve|fitted)\b.*\b(color|colour|size|shape|thickness|style|opacity)\b/,
  /\b(change|set|make|modify|update|alter)\b.*\b(color|colour|size|shape|thickness|style|opacity)\b/
];

let intentMatched = false;
for (let i = 0; i < chartStylingPatterns.length; i++) {
  const pattern = chartStylingPatterns[i];
  if (pattern.test(normalizedText)) {
    console.log(`✓ Pattern ${i + 1} matched:`, pattern.source);
    intentMatched = true;
    break;
  }
}

if (!intentMatched) {
  console.log('✗ No chart styling patterns matched');
  process.exit(1);
}

// 2. Entity Extraction Test
console.log('\n2. Entity Extraction:');

// Chart element extraction
console.log('\nChart Element Check:');
const chartElementPatterns = [
  /\b(curve|line|fitted curve|fitted line|trend line|fit line)\b/,
  /\bfit\s+line\b/,
  /\bfitted\s+curve\b/,
  /\b(background|chart background|plot background)\b/,
  /\b(grid|gridlines|grid lines)\b/,
  /\b(legend|chart legend)\b/,
  /\b(axis|axes|x-axis|y-axis)\b/,
  /\b(title|chart title|plot title)\b/,
  /\b(marker|markers|data points|points)\b/
];

let chartElement = null;
for (const pattern of chartElementPatterns) {
  if (pattern.test(normalizedText)) {
    if (/\b(background|chart background|plot background)\b/.test(normalizedText)) {
      chartElement = 'background';
    } else if (/\b(fitted curve|fitted line|trend line|fit line)\b/.test(normalizedText)) {
      chartElement = 'fitted curve';
    } else if (/\b(curve|line)\b/.test(normalizedText)) {
      chartElement = 'fitted curve';
    } else if (/\b(grid|gridlines|grid lines)\b/.test(normalizedText)) {
      chartElement = 'grid';
    } else if (/\b(legend|chart legend)\b/.test(normalizedText)) {
      chartElement = 'legend';
    } else if (/\b(axis|axes|x-axis|y-axis)\b/.test(normalizedText)) {
      chartElement = 'axis';
    } else if (/\b(title|chart title|plot title)\b/.test(normalizedText)) {
      chartElement = 'title';
    } else if (/\b(marker|markers|data points|points)\b/.test(normalizedText)) {
      chartElement = 'marker';
    }
    console.log('✓ Found chart element:', chartElement);
    break;
  }
}

if (!chartElement) {
  console.log('✗ No chart element found');
}

// Styling property extraction
console.log('\nStyling Property Check:');
let stylingProperty = null;
let propertyValue = null;

// Color extraction
const colorRegex = /\b(red|blue|green|yellow|orange|purple|pink|black|white|gray|grey|brown|cyan|magenta|lime|maroon|navy|olive|teal|silver|aqua|fuchsia|#[0-9a-fA-F]{3,6}|rgb\(\d+,\s*\d+,\s*\d+\)|rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\))\b/;
const colorMatch = normalizedText.match(colorRegex);

if (colorMatch && /\b(color|colour)\b/.test(normalizedText)) {
  stylingProperty = 'color';
  propertyValue = colorMatch[0];
  console.log('✓ Found styling property:', stylingProperty);
  console.log('✓ Found property value:', propertyValue);
} else if (/\b(thickness|thick|width|stroke)\b/.test(normalizedText) ||
    (chartElement && /\b(line|curve|fitted)\b/.test(chartElement) && /\b(increase|decrease|bigger|smaller|thicker|thinner)\b/.test(normalizedText))) {
  
  const thicknessRegex = /\b(\d+(?:\.\d+)?)\b/;
  const thicknessMatch = normalizedText.match(thicknessRegex);
  
  stylingProperty = 'thickness';
  
  if (thicknessMatch) {
    propertyValue = thicknessMatch[0];
  } else if (/\b(increase|bigger|thicker)\b/.test(normalizedText)) {
    propertyValue = 'increase';
  } else if (/\b(decrease|smaller|thinner)\b/.test(normalizedText)) {
    propertyValue = 'decrease';
  }
  
  console.log('✓ Found styling property:', stylingProperty);
  console.log('✓ Found property value:', propertyValue);
} else {
  console.log('✗ No styling property found');
}

// Final result
console.log('\n3. Final Entity Summary:');
console.log('chart_element:', chartElement || 'MISSING');
console.log('styling_property:', stylingProperty || 'MISSING');
console.log('property_value:', propertyValue || 'MISSING');

const allPresent = chartElement && stylingProperty && propertyValue;
console.log('\n4. Should Execute Action:', allPresent ? 'YES' : 'NO');

if (!allPresent) {
  const missing = [];
  if (!chartElement) missing.push('chart_element');
  if (!stylingProperty) missing.push('styling_property');
  if (!propertyValue) missing.push('property_value');
  console.log('Missing slots:', missing);
}
