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
      serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
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
        // Institutional accent colors
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
        legal: {
          DEFAULT: "hsl(280 100% 45%)",
          light: "hsl(280 100% 65%)",
        },
        evidence: {
          DEFAULT: "hsl(172 66% 35%)",
          light: "hsl(172 66% 50%)",
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
        'liquid': 'var(--shadow-liquid)',
        'glow-sm': '0 0 20px -5px hsl(211 100% 50% / 0.3)',
        'glow-lg': '0 0 70px -10px hsl(211 100% 50% / 0.5)',
        'inner-glow': 'inset 0 1px 0 0 hsl(0 0% 100% / 0.1)',
        'severity-critique': 'inset 4px 0 12px -4px hsl(0 84% 60% / 0.3)',
        'severity-grave': 'inset 4px 0 12px -4px hsl(25 95% 53% / 0.3)',
        'severity-modere': 'inset 4px 0 12px -4px hsl(45 93% 47% / 0.3)',
        'severity-mineur': 'inset 4px 0 12px -4px hsl(142 76% 36% / 0.3)',
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
          "50%": { transform: "translateY(-12px)" },
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
            opacity: "0.7",
            boxShadow: "0 0 0 18px hsl(211 100% 50% / 0)",
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
        "aurora-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "border-flow": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "liquid-wave": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-5px) rotate(1deg)" },
          "50%": { transform: "translateY(0) rotate(0deg)" },
          "75%": { transform: "translateY(5px) rotate(-1deg)" },
        },
        "glass-shimmer": {
          "0%": { opacity: "0.3", transform: "translateX(-100%) skewX(-15deg)" },
          "50%": { opacity: "0.6" },
          "100%": { opacity: "0.3", transform: "translateX(200%) skewX(-15deg)" },
        },
        "depth-pulse": {
          "0%, 100%": { transform: "translateZ(0) scale(1)" },
          "50%": { transform: "translateZ(10px) scale(1.02)" },
        },
        "orb-float": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(40px, -40px) scale(1.05)" },
          "50%": { transform: "translate(-30px, 30px) scale(0.95)" },
          "75%": { transform: "translate(30px, 15px) scale(1.02)" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "success-pulse": {
          "0%": { boxShadow: "0 0 0 0 hsl(142 76% 36% / 0.7)" },
          "70%": { boxShadow: "0 0 0 20px hsl(142 76% 36% / 0)" },
          "100%": { boxShadow: "0 0 0 0 hsl(142 76% 36% / 0)" },
        },
        "error-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-5px)" },
          "40%, 80%": { transform: "translateX(5px)" },
        },
        "swipe-out-right": {
          "0%": { transform: "translateX(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateX(150%) rotate(15deg)", opacity: "0" },
        },
        "swipe-out-left": {
          "0%": { transform: "translateX(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateX(-150%) rotate(-15deg)", opacity: "0" },
        },
        "card-enter": {
          "0%": { transform: "scale(0.8) translateY(50px)", opacity: "0" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        "ripple": {
          "0%": { transform: "scale(0)", opacity: "0.6" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 6s ease-in-out infinite",
        "float-slow": "float-slow 8s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 4s infinite",
        "scale-in": "scale-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-up": "slide-up 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-in-right": "slide-in-right 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "aurora-shift": "aurora-shift 8s ease infinite",
        "border-flow": "border-flow 6s ease infinite",
        "liquid-wave": "liquid-wave 4s ease-in-out infinite",
        "glass-shimmer": "glass-shimmer 6s ease infinite",
        "depth-pulse": "depth-pulse 4s ease-in-out infinite",
        "orb-float": "orb-float 25s ease-in-out infinite",
        "count-up": "count-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "success-pulse": "success-pulse 0.6s ease-out",
        "error-shake": "error-shake 0.5s ease-out",
        "swipe-out-right": "swipe-out-right 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "swipe-out-left": "swipe-out-left 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "card-enter": "card-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "ripple": "ripple 0.6s ease-out forwards",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-secondary': 'var(--gradient-secondary)',
        'gradient-aurora': 'var(--gradient-aurora)',
        'gradient-surface': 'var(--gradient-surface)',
        'gradient-ice': 'var(--gradient-ice)',
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
