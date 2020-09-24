/**
 * 说明
 * 这是一个压缩图片的工具库
 * 使用场景: 在浏览器上传图片前对图片压缩处理
 * 解决了什么问题:
 * 1. 通过canvas压缩
 * 2. IOS13.4之前 h5手机拍照后的图片自动旋转，IOS13.4之后这个问题又被修复的兼容
 * 3. 压缩后图可能会比原图大的问题
 * 4. png图片转jpeg时，透明区域被填充成黑色 https://evestorm.github.io/posts/46911/
 */

import EXIF from 'exif-js'

const Compress = function (file, config) {
  this.defaultConfig = {
    quality: 0.8, // 图片质量 0 - 1
    useOriginal: false, // 是否采用原图宽度高度压缩 默认false 暂不支持自定义
    width: 800, // 压缩后图片最大宽度 不支持自定义
    height: 1200, // 压缩后图片最大高度 不支持自定义
    success: noop, // 成功回调
    fail: noop // 失败回调
  }
  this.config = { ...this.defaultConfig, ...config }
  this.file = file
  this.ctx = null
  this.resize = null
  this.core(file)
}

/**
 * 校验图片
 * @param { File } file
 */
Compress.prototype.validate = function (file) {
  const imgReg = /image\/jpeg|image\/jpg|image\/png/
  if (!document.createElement('canvas').getContext) {
    throw new Error('浏览器不支持canvas')
  }
  if (!file) {
    throw new Error('请传入图片!')
  }
  if (!imgReg.test(file.type)) {
    throw new Error('非图片类型!,支持 jpeg, jpg, png')
  }
}

/**
 * 图片压缩
 * @param { File } file 图片文件
 */
Compress.prototype.core = function (file) {
  try {
    this.validate(file)
    let result = {} // 返回结果对象
    result.originalSize = getfilesize(file.size) // 原图大小
    let orientation = ''
    EXIF.getData(file, function () {
      EXIF.getAllTags(this)
      orientation = EXIF.getTag(this, 'Orientation')
    })
    const _this = this
    let fileReader = new FileReader()
    fileReader.onload = function (e) {
      let image = new Image()
      image.src = e.target.result

      image.onerror = function () {
        _this.config.fail('加载图片文件失败')
      }

      image.onload = function () {
        const originalWidth = this.naturalWidth
        const originalHeight = this.naturalHeight
        result.originalReSize = { width: originalWidth, height: originalHeight } // 原图几何大小
        _this.getResize(originalWidth, originalHeight) // 获取压缩后的图片几何大小
        let { compressedWidth, compressedHeight } = _this.resize
        result.resize = { width: compressedWidth, height: compressedHeight } // 压缩图几何大小
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        this.ctx = ctx
        canvas.width = compressedWidth
        canvas.height = compressedHeight

        // 在canvas绘制前填充白色背景
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.drawImage(this, 0, 0, compressedWidth, compressedHeight)
        _this.getBase64(orientation, canvas).then(base64 => {
          result.size = getfilesize(base64.length) // 压缩后大小
          result.base64 = base64
          result.file = base64ConverFile(base64, file.name)
          result.originFile = file
          result.blob = dataURLtoBlob(base64)
          result.blobUrl = URL.createObjectURL(result.blob)
          _this.config.success(result)
        })
      }
    }
    fileReader.readAsDataURL(file)
  } catch (error) {
    this.config.fail(error)
  }
}

/**
 * 获取图片getBase64
 */
Compress.prototype.getBase64 = function (orientation, canvas) {
  let base64 = null
  const _this = this
  return new Promise((resolve, reject) => {
    try {
      detectImageAutomaticRotation().then(res => {
        const isAutomaticRotation = res
        // 如果是浏览器不会自动回正图片方向的iphone 则旋转方向
        if (navigator.userAgent.match(/iphone/i && !isAutomaticRotation)) {
          this.rotate(this, orientation)
          base64 = canvas.toDataURL('image/jpeg', _this.config.quality)
        } else {
          base64 = canvas.toDataURL('image/jpeg', _this.config.quality)
        }
        resolve(base64)
      })
    } catch (error) {
      reject(error)
    }
  })
}

Compress.prototype.rotate = function (img, orientation) {
  // 调整为正确方向
  const ctx = this.ctx
  const resize = this.resize
  /* eslint-disable indent */
  switch (orientation) {
    case 3:
      ctx.rotate((180 * Math.PI) / 180)
      ctx.drawImage(img, -resize.width, -resize.height, resize.width, resize.height)
      break
    case 6:
      ctx.rotate((90 * Math.PI) / 180)
      ctx.drawImage(img, 0, -resize.width, resize.height, resize.width)
      break
    case 8:
      ctx.rotate((270 * Math.PI) / 180)
      ctx.drawImage(img, -resize.height, 0, resize.height, resize.width)
      break

    case 2:
      ctx.translate(resize.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0, resize.width, resize.height)
      break
    case 4:
      ctx.translate(resize.width, 0)
      ctx.scale(-1, 1)
      ctx.rotate((180 * Math.PI) / 180)
      ctx.drawImage(img, -resize.width, -resize.height, resize.width, resize.height)
      break
    case 5:
      ctx.translate(resize.width, 0)
      ctx.scale(-1, 1)
      ctx.rotate((90 * Math.PI) / 180)
      ctx.drawImage(img, 0, -resize.width, resize.height, resize.width)
      break
    case 7:
      ctx.translate(resize.width, 0)
      ctx.scale(-1, 1)
      ctx.rotate((270 * Math.PI) / 180)
      ctx.drawImage(img, -resize.height, 0, resize.height, resize.width)
      break
    default:
      ctx.drawImage(img, 0, 0, resize.width, resize.height)
  }
}

/**
 * 获取压缩后图片宽高
 */
Compress.prototype.getResize = function (originalWidth, originalHeight) {
  const { width, height } = this.config
  let compressedWidth = originalWidth,
    compressedHeight = originalHeight
  if (originalWidth >= originalHeight && this.originalWidth > width) {
    compressedWidth = width
    compressedHeight = (compressedWidth * originalHeight) / originalWidth
  } else if (originalHeight >= originalWidth && originalHeight > height) {
    compressedHeight = height
    compressedWidth = (compressedHeight * originalWidth) / originalHeight
  }
  this.resize = { compressedWidth, compressedHeight }
}

/**
 * base64Url转file文件域
 * @param {String} base64Url 必须，图片base64字符串
 * @param {String} filename
 */
function base64ConverFile(base64Url, filename) {
  let arr = base64Url.split(','),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

/**
 * base64 -> blob
 * @param {String} base64Url
 */
function dataURLtoBlob(base64Url) {
  let binary = atob(base64Url.split(',')[1])
  let array = []
  for (let i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i))
  }
  return new Blob([new Uint8Array(array)], { type: 'image/jpeg' })
}

/**
 * 判断浏览器是否自动回正图片
 */
function detectImageAutomaticRotation() {
  const testAutoOrientationImageURL =
    'data:image/jpeg;base64,/9j/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAA' +
    'AAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA' +
    'QEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE' +
    'BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf/AABEIAAEAAgMBEQACEQEDEQH/x' +
    'ABKAAEAAAAAAAAAAAAAAAAAAAALEAEAAAAAAAAAAAAAAAAAAAAAAQEAAAAAAAAAAAAAAAA' +
    'AAAAAEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8H//2Q=='
  let isImageAutomaticRotation
  return new Promise(resolve => {
    if (isImageAutomaticRotation === undefined) {
      const img = new Image()
      img.onload = () => {
        // 如果图片变成 1x2，说明浏览器对图片进行了回正
        isImageAutomaticRotation = img.width === 1 && img.height === 2
        resolve(isImageAutomaticRotation)
      }
      img.src = testAutoOrientationImageURL
    } else {
      resolve(isImageAutomaticRotation)
    }
  })
}

/**
 * 文件大小格式化
 * @param { Number } size 文件字节数
 */
function getfilesize(size) {
  if (!size) return ''
  const num = 1024.0 // byte
  if (size < num) return size + 'B'
  if (size < Math.pow(num, 2)) return (size / num).toFixed(2) + 'K' // kb
  if (size < Math.pow(num, 3)) return (size / Math.pow(num, 2)).toFixed(2) + 'M' // M
  if (size < Math.pow(num, 4)) return (size / Math.pow(num, 3)).toFixed(2) + 'G' // G
  return (size / Math.pow(num, 4)).toFixed(2) + 'T' // T
}

function noop() {
  return () => {}
}

export default Compress
