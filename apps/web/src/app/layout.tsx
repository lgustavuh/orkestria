import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata = {
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
  title: 'Orkestria',
  description: 'Orkestria — Plataforma de gestão de projetos de marketing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem('orkestria-theme')==='dark'||(!localStorage.getItem('orkestria-theme')&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`
        }} />
      </head>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
