import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    fontFamily: {
      sans: ['"SF Pro Display"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Premium accent colors
        azure: {
          50: "hsl(211 100% 97%)",
          100: "hsl(211 100% 94%)",
          200: "hsl(211 100% 86%)",
          300: "hsl(211 100% 74%)",
          400: "hsl(211 100% 62%)",
          500: "hsl(211 100% 50%)",
          600: "hsl(211 100% 42%)",
          700: "hsl(211 100% 34%)",
          800: "hsl(211 100% 26%)",
          900: "hsl(211 100% 18%)",
        },
        violet: {
          50: "hsl(280 100% 97%)",
          100: "hsl(280 100% 94%)",
          200: "hsl(280 100% 86%)",
          300: "hsl(280 100% 74%)",
          400: "hsl(280 100% 68%)",
          500: "hsl(280 100% 65%)",
          600: "hsl(280 100% 55%)",
          700: "hsl(280 100% 45%)",
          800: "hsl(280 100% 35%)",
          900: "hsl(280 100% 25%)",
        },
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'glass': 'var(--shadow-glass)',
        'elevated': 'var(--shadow-elevated)',
        'glow': 'var(--shadow-glow)',
        'glow-sm': '0 0 20px -5px hsl(211 100% 50% / 0.3)',
        'glow-lg': '0 0 60px -10px hsl(211 100% 50% / 0.5)',
        'inner-glow': 'inset 0 1px 0 0 hsl(0 0% 100% / 0.1)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(2deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            opacity: "1",
            boxShadow: "0 0 0 0 hsl(211 100% 50% / 0.7)",
          },
          "50%": { 
            opacity: "0.8",
            boxShadow: "0 0 0 15px hsl(211 100% 50% / 0)",
          },
        },
        "shimmer": {
          "0%": { left: "-100%" },
          "100%": { left: "200%" },
        },
        "scale-in": {
          "0%": { 
            opacity: "0",
            transform: "scale(0.9) translateY(10px)",
          },
          "100%": { 
            opacity: "1",
            transform: "scale(1) translateY(0)",
          },
        },
        "slide-up": {
          "0%": { 
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": { 
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-in-right": {
          "0%": { 
            opacity: "0",
            transform: "translateX(20px)",
          },
          "100%": { 
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "rotate-3d": {
          "0%": { transform: "rotateY(0deg) rotateX(0deg)" },
          "25%": { transform: "rotateY(5deg) rotateX(2deg)" },
          "50%": { transform: "rotateY(0deg) rotateX(0deg)" },
          "75%": { transform: "rotateY(-5deg) rotateX(-2deg)" },
          "100%": { transform: "rotateY(0deg) rotateX(0deg)" },
        },
        "orb-float": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(30px, -30px) scale(1.05)" },
          "50%": { transform: "translate(-20px, 20px) scale(0.95)" },
          "75%": { transform: "translate(20px, 10px) scale(1.02)" },
        },
        "border-flow": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 6s ease-in-out infinite",
        "float-slow": "float-slow 8s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 3s infinite",
        "scale-in": "scale-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-up": "slide-up 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-in-right": "slide-in-right 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "rotate-3d": "rotate-3d 10s ease-in-out infinite",
        "orb-float": "orb-float 20s ease-in-out infinite",
        "border-flow": "border-flow 4s ease infinite",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, hsl(211 100% 50%), hsl(280 100% 65%))',
        'gradient-secondary': 'linear-gradient(135deg, hsl(280 100% 65%), hsl(330 100% 60%))',
        'gradient-surface': 'linear-gradient(180deg, hsl(220 25% 99%), hsl(220 25% 96%))',
        'mesh-light': `
          radial-gradient(at 40% 20%, hsl(211 100% 50% / 0.08) 0px, transparent 50%),
          radial-gradient(at 80% 0%, hsl(280 100% 65% / 0.06) 0px, transparent 50%),
          radial-gradient(at 0% 50%, hsl(142 76% 36% / 0.05) 0px, transparent 50%),
          radial-gradient(at 80% 50%, hsl(38 92% 50% / 0.05) 0px, transparent 50%),
          radial-gradient(at 0% 100%, hsl(211 100% 50% / 0.06) 0px, transparent 50%)
        `,
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
