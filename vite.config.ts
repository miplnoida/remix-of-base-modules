import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router')) return 'react-vendor';
          if (id.match(/node_modules\/(react|react-dom|scheduler)\//)) return 'react-vendor';
          if (id.includes('@supabase')) return 'supabase-vendor';
          if (id.includes('@tanstack')) return 'tanstack-vendor';
          if (id.includes('@radix-ui')) return 'radix-vendor';
          if (id.includes('lucide-react')) return 'icons-vendor';
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) return 'charts-vendor';
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('pdfjs') || id.includes('dompurify')) return 'pdf-vendor';
          if (id.includes('exceljs') || id.includes('xlsx') || id.includes('file-saver')) return 'excel-vendor';
          if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) return 'date-vendor';
          if (id.includes('@monaco-editor') || id.includes('monaco-editor')) return 'monaco-vendor';
          if (id.includes('@hello-pangea/dnd') || id.includes('react-beautiful-dnd')) return 'dnd-vendor';
          if (id.includes('framer-motion') || id.includes('motion')) return 'motion-vendor';
          if (id.includes('lodash')) return 'lodash-vendor';
          if (id.includes('zod') || id.includes('react-hook-form') || id.includes('@hookform')) return 'form-vendor';
          return 'vendor';
        },
      },
    },
  },
}));
