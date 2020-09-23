/* eslint-disable indent */
/**
 * 压缩图片
 */
import EXIF from 'exif-js'
// const EXIF = require('exif-js')

function Compress() {}

/**
 * 校验图片
 * @param { 图片文件 } file
 */
Compress.prototype.validate = function (file) {
  const imgReg = /image\/jpeg|image\/jpg|image\/png/
  if (!file) {
    throw new Error('请传入图片!')
  }
  if (!imgReg.test(file.type)) {
    throw new Error('非图片类型!,支持 jpeg, jpg, png')
  }
}

/**
 * 图片压缩
 * @param { 图片文件 } file
 */
Compress.prototype.core = function (file) {
  const _this = this
  return new Promise(function (resolve, reject) {
    try {
      _this.validate(file)
      let result = {}
      result.originalSize = getfilesize(file.size) // 原图大小
      let orientation = ''
      EXIF.getData(file, function () {
        EXIF.getAllTags(this)
        orientation = EXIF.getTag(this, 'Orientation')
      })
      let fileReader = new FileReader()
      fileReader.onload = function (e) {
        let image = new Image()
        image.src = e.target.result
        image.onload = function () {
          let expectWidth = this.naturalWidth
          let expectHeight = this.naturalHeight
          result.originalGeometry = { width: expectWidth, height: expectHeight } // 原图几何大小
          if (this.naturalWidth > this.naturalHeight && this.naturalWidth > 800) {
            expectWidth = 800
            expectHeight = (expectWidth * this.naturalHeight) / this.naturalWidth
          } else if (this.naturalHeight > this.naturalWidth && this.naturalHeight > 1200) {
            expectHeight = 1200
            expectWidth = (expectHeight * this.naturalWidth) / this.naturalHeight
          }
          result.compressedGeometry = { width: expectWidth, height: expectHeight } // 压缩图几何大小
          let canvas = document.createElement('canvas')
          let ctx = canvas.getContext('2d')
          canvas.width = expectWidth
          canvas.height = expectHeight
          ctx.drawImage(this, 0, 0, expectWidth, expectHeight)
          _this.getBase64(orientation, canvas).then(base64 => {
            result.compressedSize = getfilesize(base64.length) // 压缩后大小
            result.base64 = base64
            result.file = base64ConverFile(base64, file.name)
            result.originFile = file
            resolve(result)
          })
        }
      }
      fileReader.readAsDataURL(file)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 获取图片getBase64
 */
Compress.prototype.getBase64 = function (orientation, canvas) {
  let base64 = null
  return new Promise((resolve, reject) => {
    try {
      detectImageAutomaticRotation().then(res => {
        const isAutomaticRotation = res
        // 如果是浏览器不会自动回正图片方向的iphone 则旋转方向
        if (navigator.userAgent.match(/iphone/i && !isAutomaticRotation)) {
          //如果方向角不为1，都需要进行旋转
          if (orientation !== '' && orientation !== 1) {
            switch (orientation) {
              case 6: // 需要顺时针（向左）90度旋转
                this.rotateImg(this, 'left', canvas)
                break
              case 8: // 需要逆时针（向右）90度旋转
                this.rotateImg(this, 'right', canvas)
                break
              case 3: // 需要180度旋转
                this.rotateImg(this, 'right', canvas) //转两次
                this.rotateImg(this, 'right', canvas)
                break
            }
          }
          base64 = canvas.toDataURL('image/jpeg', 0.8)
        } else {
          base64 = canvas.toDataURL('image/jpeg', 0.8)
        }
        resolve(base64)
      })
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 对图片旋转处理
 */
Compress.prototype.rotateImg = function (img, direction, canvas) {
  // 最小与最大旋转方向，图片旋转4次后回到原方向
  let min_step = 0
  let max_step = 3
  if (img == null) return
  // img的高度和宽度不能在img元素隐藏后获取，否则会出错
  let height = img.height
  let width = img.width
  let step = 2
  if (step == null) {
    step = min_step
  }
  if (direction == 'right') {
    step++
    // 旋转到原位置，即超过最大值
    step > max_step && (step = min_step)
  } else {
    step--
    step < min_step && (step = max_step)
  }
  // 旋转角度以弧度值为参数
  let degree = (step * 90 * Math.PI) / 180
  let ctx = canvas.getContext('2d')
  canvas.width = width
  canvas.height = height
  switch (step) {
    case 0:
      ctx.drawImage(img, 0, 0)
      break
    case 1:
      ctx.rotate(degree)
      ctx.drawImage(img, 0, -height)
      break
    case 2:
      ctx.rotate(degree)
      ctx.drawImage(img, -width, -height)
      break
    case 3:
      ctx.rotate(degree)
      ctx.drawImage(img, -width, 0)
      break
  }
}

/**
 * base64Url转file文件域
 * @param {String} base64Url 必须，图片base64字符串
 * @param {String} name 可选，图片名称，默认随机生成
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
 * @param { 文件字节数 } size
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

export default Compress
