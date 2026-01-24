import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import Script from "next/script";
export const metadata: Metadata = {
  title: "Droply - File Sharing Made Easy",
  description: "Droply is a secure and easy-to-use file sharing platform.",
  icons: {
    icon: "/droply.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet" />
          <Script src="https://cmp.gatekeeperconsent.com/min.js" data-cfasync="false"></Script>
          <Script src="https://the.gatekeeperconsent.com/cmp.min.js" data-cfasync="false"></Script>
          <Script async src="//www.ezojs.com/ezoic/sa.min.js"></Script>
          <Script id="ezstandalone-init">
              {`
                window.ezstandalone = window.ezstandalone || {};
                ezstandalone.cmd = ezstandalone.cmd || [];
              `}
          </Script>
        </head>
        <body className="antialiased">
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
