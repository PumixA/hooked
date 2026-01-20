/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#1E1E1E",
                primary: "#C4B5FD",
                secondary: "#2A2A2A",
            }
        },
    },
    plugins: [],
}