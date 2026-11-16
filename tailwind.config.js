const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: v('ink'),
        ink2: v('ink2'),
        ink3: v('ink3'),
        bone: v('bone'),
        dim: v('dim'),
        faint: v('faint'),
        madder: v('madder'),
        verd: v('verd'),
        brass: v('brass'),
        lapis: v('lapis'),
      },
      fontFamily: {
        display: ['"Bodoni Moda Variable"', 'Didot', 'Georgia', 'serif'],
        sans: ['"Schibsted Grotesk Variable"', 'system-ui', 'sans-serif'],
        mono: ['"Martian Mono Variable"', 'ui-monospace', 'monospace'],
      },
      borderColor: { DEFAULT: 'rgb(var(--bone) / 0.16)' },
      screens: { xs: '420px' },
    },
  },
  plugins: [],
};
