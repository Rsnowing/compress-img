## 介绍
## TODO & DONE
1. 压缩 ✅
2. 非图片校验✅
3. 返回file, base64, Blob, bloburl, 原图大小， 压缩后大小✅
4. 错误处理✅
5. ios exif图片翻转问题解决✅
6. demo✅
7. 成功回调，失败回调 ✅


## 使用
### 安装
```js
npm i for-compress 
```
### 页面使用
```
 <input type="file" placeholder="图片上传" id="upload" accept="image/*" />

  import Compress from 'for-compress
  document.getElementById('upload').addEventListener('change', event => {
    new Compress(event.target.files[0], {
      success: res => {
          console.log(res);
        },
        fail: err => {
          console.log(err);
        }
    })
  })
```