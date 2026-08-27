/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				ink: '#171717',
				body: '#4d4d4d',
				mute: '#888888',
				hairline: '#ebebeb',
				'hairline-strong': '#a1a1a1',
				canvas: '#ffffff',
				'canvas-soft': '#fafafa',
				'canvas-soft-2': '#f5f5f5',
				link: '#0070f3',
				'link-deep': '#0761d1',
				'link-bg-soft': '#d3e5ff',
				success: '#0070f3',
				error: '#ee0000',
				'error-soft': '#f7d4d6',
				warning: '#f5a623',
				'warning-soft': '#ffefcf',
				violet: '#7928ca',
				cyan: '#50e3c2',
				'gradient-start': '#007cf0',
				'gradient-end': '#00dfd8',
			},
			fontFamily: {
				sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
			},
			fontSize: {
				'display-xl': ['48px', { lineHeight: '48px', letterSpacing: '-2.4px', fontWeight: '600' }],
				'display-lg': ['32px', { lineHeight: '40px', letterSpacing: '-1.28px', fontWeight: '600' }],
				'display-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.96px', fontWeight: '600' }],
				'display-sm': ['20px', { lineHeight: '28px', letterSpacing: '-0.6px', fontWeight: '600' }],
				'body-lg': ['18px', { lineHeight: '28px' }],
				'body-md': ['16px', { lineHeight: '24px' }],
				'body-sm': ['14px', { lineHeight: '20px', letterSpacing: '-0.28px' }],
			},
		},
	},
	plugins: [],
}
