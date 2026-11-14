export const designTokens = {
  color: {
    forest950: '#123b2a',
    forest800: '#1d6b45',
    forest700: '#23834f',
    leaf500: '#58b957',
    leaf300: '#b9e7a4',
    lime100: '#eef8df',
    canvas: '#f6f8f2',
    surface: '#ffffff',
    ink: '#183129',
    muted: '#64766d',
    border: '#dce8dd',
    sky100: '#e5f3fb',
    sky700: '#176b98',
    amber100: '#fff3d9',
    amber700: '#93600c',
    danger100: '#fde8e5',
    danger700: '#ad3c32',
  },
  radius: {
    sm: '10px',
    md: '14px',
    lg: '20px',
    xl: '28px',
    pill: '999px',
  },
  shadow: {
    card: '0 10px 30px rgba(18, 59, 42, 0.06)',
    floating: '0 18px 50px rgba(18, 59, 42, 0.12)',
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '20px',
    xl: '28px',
    section: '40px',
  },
  motion: {
    fast: '150ms',
    standard: '220ms',
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  focus: {
    color: '#176b98',
    width: '3px',
    offset: '2px',
  },
} as const;

export type DesignTokenGroup = keyof typeof designTokens;
