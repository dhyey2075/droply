import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dhyeyparekh.droply',
  appName: 'Droply',
  webDir: 'public',

  server: {
    url: 'https://droply.dhyeyparekh.in',
    // Keep OAuth inside the app WebView instead of opening external browser.
    // Without this, Capacitor opens Google/Clerk URLs in the system browser,
    // so the session never reaches the app and you get "authorization_invalid".
    allowNavigation: [
      'accounts.google.com',
      '*.clerk.accounts.dev',
      '*.accounts.dev',
      'github.com',
      'www.github.com',
    ],
  },
};

export default config;
