import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { createRequire } from 'module'

const req = createRequire(import.meta.url)
function pkgDir(pkgPath) {
  try {
    return path.dirname(req.resolve(`${pkgPath}/package.json`))
  } catch (e) {
    return path.resolve(__dirname, `node_modules/${pkgPath}`)
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      // 配置路径别名，简化导入语句
      '@': path.resolve(__dirname, './src'),
      '@services': path.resolve(__dirname, './src/core/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/lib'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@core': path.resolve(__dirname, './src/core'),
      '@shared': path.resolve(__dirname, '../../shared'),
      '@games': path.resolve(__dirname, '../../games'),
      // 由于游戏代码位于平台目录之外，且没有独立的 node_modules，
      // 我们强制所有游戏引用平台本地的 react 和其他核心库，以实现"无配置即玩"
      'react': pkgDir('react'),
      'react-dom': pkgDir('react-dom'),
      'react/jsx-runtime': req.resolve('react/jsx-runtime'),
      'lucide-react': pkgDir('lucide-react'),
    },
  },
})
