import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.formaly.edu',
  appName: 'Formaly',
  webDir: 'dist',
  server: {
    hostname: 'formaly.my.id',
    androidScheme: 'https'
  }
};

export default config;
