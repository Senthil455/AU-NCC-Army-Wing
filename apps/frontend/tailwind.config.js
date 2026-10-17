/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        olive: { 50: '#f6f7f0', 100: '#e8ebd9', 600: '#5b6236', 700: '#4a4f2c', 800: '#3a3f24', 900: '#2c301b' },
        khaki: '#c9b88a',
        nccred: '#b5342c',
        nccblue: '#1f3a93',
        ncclight: '#7fb3d5',
      },
    },
  },
  plugins: [],
};
