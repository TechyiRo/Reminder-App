import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumina.reminders',
  appName: 'Lumina Reminders',
  webDir: 'dist',
  server: {
    url: 'https://remindtask.vercel.app/',
    cleartext: true
  }
};

export default config;
