import babel from 'rollup-plugin-babel'
const { terser } = require('rollup-plugin-terser')
import commonjs from 'rollup-plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'

const prod = process.env.ENV === 'production'

export default {
  input: './src/compress.js', // 打包入口
  output: {
    file: 'dist/compress.min.js', // 出口路径
    name: 'Compress', // 指定打包后全局变量的名字
    format: process.env.FMT || 'umd', // 统一模块规范
    sourcemap: true // 打包过程会将es6 -> es5。 开启源码调试 可以找到源代码的报错位置
  },
  plugins: [
    babel({
      exclude: 'node-modules/**' // 排除
    }),
    resolve({
      jsnext: true,
      main: true,
      browser: true
    }),
    commonjs(),
    prod && terser()
  ]
}
