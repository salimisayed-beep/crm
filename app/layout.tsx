import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bombino · Query Sales Dashboard",
  description:
    "Internal CRM dashboard for Bombino Express query and sales management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
        {/*
          Run synchronously before React hydrates so --sidebar-w is already
          correct on first paint — prevents the main-content margin flash when
          the sidebar is collapsed and the user navigates to a new page.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.innerWidth>=768&&localStorage.getItem('nsb_collapsed')==='true'){document.documentElement.style.setProperty('--sidebar-w','68px')}else if(window.innerWidth<768){document.documentElement.style.setProperty('--sidebar-w','0px')}}catch(e){}})();(function(){try{var t=localStorage.getItem('bombino_theme')||'dark';document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
