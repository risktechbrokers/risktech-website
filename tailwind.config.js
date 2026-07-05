/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind to scan these files for class names
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom brand colors for RiskTech
      colors: {
        brand: {
          blue: '#1B3A6B',       // Deep navy blue — trust, authority
          lightblue: '#2563EB',  // Bright blue — call-to-action buttons
          ash: '#6B7280',        // Medium grey — body text
          lightash: '#F3F4F6',   // Light grey — section backgrounds
          dark: '#111827',       // Near black — headings
        }
      },
      // Custom font family
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],   // Headings — classic, trustworthy
        body: ['"DM Sans"', 'sans-serif'],           // Body text — clean, modern
      },
      // Custom animations
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}

