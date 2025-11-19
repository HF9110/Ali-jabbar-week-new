import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // إضافة host: true لضمان ربط (binding) Vite بجميع العناوين المتاحة، وهو أمر ضروري في البيئات الافتراضية مثل StackBlitz
  server: {
    host: true, // 👈 التعديل المقترح
    port: 3000,
  },
});
