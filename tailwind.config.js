/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
      },
      colors: {
        // Light theme (main area)
        'body-bg': '#f0f2f5',
        'chart-area-bg': '#ffffff',
        'primary': '#212529',
        'secondary': '#0056b3',
        'muted': '#6c757d',
        
        // Dark theme (panels)
        'panel-bg': '#2d3748',
        'panel-border': '#4a5568',
        'on-panel-primary': '#f7fafc',
        'on-panel-secondary': '#a0aec0',
        'on-panel-muted': '#718096',
        'item-bg-on-panel': '#4a5568',
        'item-hover-on-panel': '#2c3e50',

        // Accents
        'accent-blue': '#007bff',
        'accent-blue-on-panel': '#3498db',
        'accent-green': '#28a745',
        'accent-red': '#dc3545',
        'accent-yellow': '#ffc107',
        'accent-pink': '#d63384',
        'outlier': '#ef4444',
        'outlier-pending': '#f97316',
      }
    }
  },
  plugins: [],
}
