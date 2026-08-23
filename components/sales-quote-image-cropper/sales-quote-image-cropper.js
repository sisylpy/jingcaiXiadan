// 强制立即执行，确保日志输出
// (function() {
//   console.log('[ocrUpload组件] ========== 组件文件开始加载 ==========');
//   console.log('[ocrUpload组件] 文件路径: components/ocrUpload/ocrUpload.js');
//   console.log('[ocrUpload组件] 当前时间:', new Date().toISOString());
// })();

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 图片列表
    imageList: {
      type: Array,
      value: []
    },
    // Excel 文件
    excelFile: {
      type: Object,
      value: null
    },
    // 最大图片数量
    maxImageCount: {
      type: Number,
      value: 1
    },
    // 页面 onShow 时传入新值，用于清空裁剪弹窗/缓存图，避免从下一页返回时顶部多余显示
    resetKey: {
      type: Number,
      value: 0
    },
    // 是否隐藏顶部“选择图片/Excel”上传区（用于外部页面仅复用选图+裁剪逻辑，通过 chooseImages 主动触发）
    hideUpload: {
      type: Boolean,
      value: false
    }
  },

  observers: {
    'resetKey': function (val) {
      if (val && val > 0) {
        this._resetCropperAndCache();
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 裁剪相关 - 完全按照 demo 的结构
    showCropper: false, // 是否显示裁剪弹窗
    showCropBox: false, // 是否显示裁剪框
    cropImageSrc: '', // 待裁剪的图片路径
    tempImagePath: '', // 临时图片路径（用于裁剪）
    
    // 图片固定位置和尺寸
    imgX: 0, imgY: 0, imgW: 0, imgH: 0,
    rotation: 0, // 图片旋转角度（0, 90, 180, 270）
    originalImgW: 0, // 原始图片宽度（未旋转）
    originalImgH: 0, // 原始图片高度（未旋转）
    
    // 裁剪框位置和尺寸（正方形）
    cropX: 0, cropY: 0, cropW: 0, cropH: 0,
    cropWPercent: 0, // 显示尺寸
    
    // 触摸相关
    startX: 0, startY: 0,
    startW: 0, startH: 0,
    startCropX: 0, startCropY: 0,
    resizeDir: '', // 调整方向：'move' 移动, 'rb' 缩放

    // 识别模式：fast=单列, complex=复杂
    ocrMode: 'fast',

    // 裁剪弹窗内图片的变换状态（支持缩放、拖动，借鉴 ocrImagePreview）
    imageTransform: {
      scale: 1,
      x: 0,
      y: 0,
      width: 0,
      height: 0
    },
    wrapWidth: 0,
    wrapHeight: 0,
    areaStartX: 0,
    areaStartY: 0
  },

  /**
   * 组件生命周期
   */
  detached: function() {
    // 组件销毁时清除定时器
    this._clearRotationTimer();
  },

  /**
   * 组件的方法列表
   */
  methods: {
  /**
   * 清空裁剪弹窗和缓存图（页面 onShow 时通过 resetKey 触发，避免返回时顶部多余显示）
   */
  _resetCropperAndCache: function() {
    this.setData({
      showCropper: false,
      showCropBox: false,
      cropImageSrc: '',
      tempImagePath: '',
      rotation: 0,
      imageTransform: { scale: 1, x: 0, y: 0, width: 0, height: 0 }
    });
  },
  /**
   * 阻止弹窗背景的触摸移动事件（防止背景滚动）
   */
  preventDefaultTouchMove: function() {
    // 空函数，用于阻止事件冒泡和默认行为
    return false;
  },
  /**
   * 更新图片状态（提取公共逻辑）
   * @param {String} persistPath - 持久化后的文件路径
   */
  _updateImageState: function(persistPath) {
    console.log('[ocrUpload组件] 更新图片状态，持久化路径:', persistPath);
    
    // 只取第一张图片，替换原有图片
    const newImage = {
      path: persistPath, // ✅ 使用持久化路径
      id: Date.now(),
      status: 'pending' // pending: 待识别, recognizing: 识别中, success: 识别成功, error: 识别失败
    };

    // 隐藏 loading（在成功时）
      wx.hideLoading();

    // 通知父组件图片变化
    this.triggerEvent('imageChange', {
      imageList: [newImage]
    });

    // ✅ 选择图片时，清除 Excel 文件（二选一）
    if (this.properties.excelFile) {
      this.triggerEvent('excelChange', {
        excelFile: null
      });
    }
  },

  // 选择图片（只允许选择1张）
  // ✅ 使用 wx.chooseMedia（更现代的 API，路径兼容性更好）
  chooseImages: function () {
    // ✅ 如果已有 Excel，先清除 Excel（二选一）
    if (this.properties.excelFile) {
      this.triggerEvent('excelChange', {
        excelFile: null
      });
    }
    
    const that = this;
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'], // 使用压缩图
      sourceType: ['album', 'camera'],
      success: (res) => {
          // console.log('[ocrUpload组件] ========== chooseMedia success ==========');
          // console.log('[ocrUpload组件] tempFiles:', res.tempFiles);
          // console.log('[ocrUpload组件] tempFiles 长度:', res.tempFiles ? res.tempFiles.length : 0);
        
        if (!res.tempFiles || res.tempFiles.length === 0) {
          wx.showToast({
            title: '未选择图片',
            icon: 'none'
          });
          return;
        }

        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        // 显示裁剪界面
        that.showCropperModal(tempFilePath);
      },
      fail: (err) => {
        console.error('[ocrUpload组件] chooseMedia 失败:', err);
        wx.hideLoading();
        // 用户取消选择时不显示错误提示
        if (err.errMsg && !err.errMsg.includes('cancel')) {
        wx.showToast({
          title: '选择图片失败',
            icon: 'none',
            duration: 2000
        });
        }
      }
    });
  },

  // 删除图片
  deleteImage: function (e) {
    const index = e.currentTarget.dataset.index;
      const imageList = [...this.properties.imageList];
    imageList.splice(index, 1);
    
      // 通知父组件图片变化
      this.triggerEvent('imageChange', {
        imageList: imageList
    });
  },

  // 预览图片
  previewImage: function (e) {
    const index = e.currentTarget.dataset.index;
      const urls = this.properties.imageList.map(item => item.path);
    wx.previewImage({
      current: urls[index],
      urls: urls
    });
  },

  // 选择 Excel 文件
  chooseExcelFile: function () {
    // ✅ 如果已有图片，先清除图片（二选一）
    if (this.properties.imageList && this.properties.imageList.length > 0) {
      this.triggerEvent('imageChange', {
        imageList: []
      });
    }
    
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xls', 'xlsx'],
      success: (res) => {
        if (res.tempFiles.length === 0) {
          return;
        }
        
        const file = res.tempFiles[0];
        const fileSizeKB = Math.round(file.size / 1024);
        
        // 验证文件类型
        const fileName = file.name || '';
        const fileExt = fileName.split('.').pop()?.toLowerCase();
        if (fileExt !== 'xls' && fileExt !== 'xlsx') {
          wx.showToast({
            title: '请选择 Excel 文件（.xls 或 .xlsx）',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        
          const excelFile = {
            name: fileName,
            path: file.path,
            size: fileSizeKB
          };
          
          // 通知父组件 Excel 文件变化
          this.triggerEvent('excelChange', {
            excelFile: excelFile
        });
      },
      fail: (err) => {
          console.error('[ocrUpload组件] 选择 Excel 文件失败:', err);
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({
            title: '选择文件失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },

  // 删除 Excel 文件
  deleteExcelFile: function () {
      // 通知父组件 Excel 文件变化
      this.triggerEvent('excelChange', {
      excelFile: null
    });
  },

  

  // 开始图片识别
  startOCRRecognition: function () {
    // ⚠️ 防止重复点击：如果按钮被快速点击多次，只处理第一次
    if (this._isRecognizing) {
      console.warn('[ocrUpload组件] ⚠️ 识别已在进行中，忽略重复点击');
      return;
    }

    if (this.properties.imageList.length === 0) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 设置识别中标志
    this._isRecognizing = true;

    // 通知父组件开始识别
    this.triggerEvent('startOCR', {
      imageList: this.properties.imageList
    });

    // 2秒后重置标志（防止按钮被禁用太久）
    setTimeout(() => {
      this._isRecognizing = false;
    }, 2000);
  },

  // 选择识别模式
  selectOCRMode: function(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === 'fast' || mode === 'complex') {
      this.setData({ ocrMode: mode });
    }
  },

  // 根据当前选择执行识别（裁剪弹窗内先裁剪再识别，非弹窗则直接识别）
  startRecognizeByMode: function() {
    if (this._isRecognizing) {
      return;
    }
    if (this.data.showCropper) {
      // 裁剪弹窗内：先裁剪，裁剪完成后再触发识别
      this._pendingThenOCR = this.data.ocrMode;
      this._isRecognizing = true;
      this.confirmCrop();
    } else {
      if (this.data.ocrMode === 'fast') {
        this.startOCRRecognitionFast();
      } else {
        this.startOCRRecognition();
      }
    }
  },

  // 开始快速识别
  startOCRRecognitionFast: function () {
    // ⚠️ 防止重复点击：如果按钮被快速点击多次，只处理第一次
    if (this._isRecognizing) {
      console.warn('[ocrUpload组件] ⚠️ 识别已在进行中，忽略重复点击');
      return;
    }

    if (this.properties.imageList.length === 0) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 设置识别中标志
    this._isRecognizing = true;

    // 通知父组件开始快速识别
    this.triggerEvent('startOCRFast', {
      imageList: this.properties.imageList
    });

    // 2秒后重置标志（防止按钮被禁用太久）
    setTimeout(() => {
      this._isRecognizing = false;
    }, 2000);
  },

  // 开始 Excel 识别
  startExcelRecognition: function () {
    if (!this.properties.excelFile) {
      wx.showToast({
        title: '请先选择 Excel 文件',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 通知父组件开始识别
    this.triggerEvent('startExcel', {
      excelFile: this.properties.excelFile
    });
  },

  // ==================== 图片裁剪相关方法 ====================
  
  /**
   * 显示裁剪弹窗 - 完全按照 demo 实现
   */
  showCropperModal: function(tempFilePath) {
    const that = this;
    
    // 获取图片信息
    wx.getImageInfo({
      src: tempFilePath,
      success: (res) => {
        const win = wx.getWindowInfo();
        
        // 计算实际可用高度：窗口高度 - 弹窗顶部偏移(200rpx转换为px) - 头部高度 - 底部高度
        // 200rpx 转换为 px（假设 rpx 比例为 750rpx = 屏幕宽度px）
        const rpxToPx = win.windowWidth / 750;
        const modalTopPx = 200 * rpxToPx;
        const headerHeight = 60; // 头部高度约60px（包含padding）
        const footerHeight = 120; // 底部高度约120px（包含padding和按钮）
        const availableHeight = win.windowHeight - modalTopPx - headerHeight - footerHeight;
        
        // 参考 demo：计算图片显示尺寸（确保图片能完整显示）
        const scale = Math.min(
          win.windowWidth / res.width,
          availableHeight / res.height
        );
        const w = res.width * scale;
        const h = res.height * scale;
        const wrapWidth = win.windowWidth;
        const wrapHeight = availableHeight;
        // 与 ocrImagePreview 一致：可见区域在画布中从 (100vw,100vh) 开始，即 (wrapWidth, windowHeight) px
        const areaStartX = wrapWidth;
        const areaStartY = win.windowHeight;
        const imgX = areaStartX + (wrapWidth - w) / 2;
        const imgY = areaStartY + (wrapHeight - h) / 2;
        
        const initialCropSize = Math.min(w, h) * 0.8;
        const cropX = (wrapWidth - initialCropSize) / 2;
        const cropY = (wrapHeight - initialCropSize) / 2;

        const imageTransform = {
          scale: 1,
          x: imgX,
          y: imgY,
          width: w,
          height: h
        };

        that.setData({
          showCropper: true,
          showCropBox: false,
          cropImageSrc: tempFilePath,
          tempImagePath: tempFilePath,
          imgX: imgX,
          imgY: imgY,
          imgW: w,
          imgH: h,
          wrapWidth: wrapWidth,
          wrapHeight: wrapHeight,
          areaStartX: areaStartX,
          areaStartY: areaStartY,
          originalImgW: res.width,
          originalImgH: res.height,
          rotation: 0,
          cropX: cropX,
          cropY: cropY,
          cropW: initialCropSize,
          cropH: initialCropSize,
          cropWPercent: Math.round(initialCropSize),
          imageTransform: imageTransform
        });
      },
      fail: (err) => {
        console.error('[ocrUpload组件] 获取图片信息失败:', err);
        wx.showToast({
          title: '图片加载失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 取消裁剪
   */
  cancelCrop: function() {
    this.setData({
      showCropper: false,
      showCropBox: false,
      cropImageSrc: '',
      tempImagePath: '',
      rotation: 0,
      imageTransform: { scale: 1, x: 0, y: 0, width: 0, height: 0 }
    });
  },

  /**
   * 裁剪弹窗内图片拖动（与 ocrImagePreview 一致：只更新内存，不 setData，避免反馈循环导致图片自己来回动）
   */
  onCropperImageMove: function(e) {
    const { x, y, source } = e.detail || {};
    if (source !== 'touch' && source !== 'touch-out-of-bounds') return;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    const imageTransform = this.data.imageTransform;
    if (!imageTransform) return;
    imageTransform.x = x;
    imageTransform.y = y;
  },

  /**
   * 裁剪弹窗内图片缩放中（与 ocrImagePreview 一致：不 setData，避免反馈循环）
   */
  onCropperImageScale: function(e) {
    const d = e.detail || {};
    if (!this._cropperScaleState) this._cropperScaleState = {};
    this._cropperScaleState = { ...d };
  },

  /**
   * 裁剪弹窗内图片缩放结束（与 ocrImagePreview 一致：只在这里 setData 一次）
   */
  onCropperImageScaleEnd: function(e) {
    const detail = e.detail || {};
    const { scale, x, y } = detail;
    const t = this.data.imageTransform || {};
    const clampedScale = Math.max(0.5, Math.min(3, scale));
    this.setData({
      imageTransform: {
        scale: clampedScale,
        x: x,
        y: y,
        width: t.width || this.data.imgW,
        height: t.height || this.data.imgH
      }
    });
    this._cropperScaleState = null;
  },

  /**
   * 切换裁剪框显示/隐藏
   */
  toggleCropBox: function() {
    const showCropBox = !this.data.showCropBox;
    this.setData({
      showCropBox: showCropBox
    });
  },

  /**
   * 清除旋转定时器
   */
  _clearRotationTimer: function() {
    if (this._rotationTimer) {
      clearInterval(this._rotationTimer);
      this._rotationTimer = null;
    }
    if (this._rotationDelayTimer) {
      clearTimeout(this._rotationDelayTimer);
      this._rotationDelayTimer = null;
    }
  },

  /**
   * 旋转图片（逆时针1度）
   */
  rotateImageLeft: function() {
    let newRotation = this.data.rotation - 1;
    // 确保角度在 0-360 范围内
    if (newRotation < 0) {
      newRotation = 360 + newRotation;
    }
    this.setData({
      rotation: newRotation
    });
  },

  /**
   * 旋转图片（顺时针1度）
   */
  rotateImageRight: function() {
    const newRotation = (this.data.rotation + 1) % 360;
    this.setData({
      rotation: newRotation
    });
  },

  /**
   * 长按开始 - 逆时针旋转
   */
  onRotateLeftStart: function() {
    // 先执行一次旋转
    this.rotateImageLeft();
    
    // 清除之前的定时器和延迟定时器（如果存在）
    this._clearRotationTimer();
    if (this._rotationDelayTimer) {
      clearTimeout(this._rotationDelayTimer);
      this._rotationDelayTimer = null;
    }
    
    // 延迟300ms后启动持续旋转（如果用户还在长按）
    this._rotationDelayTimer = setTimeout(() => {
      this._rotationDelayTimer = null;
      // 启动定时器，每100ms旋转一次
      this._rotationTimer = setInterval(() => {
        this.rotateImageLeft();
      }, 100);
    }, 300);
  },

  /**
   * 长按开始 - 顺时针旋转
   */
  onRotateRightStart: function() {
    // 先执行一次旋转
    this.rotateImageRight();
    
    // 清除之前的定时器和延迟定时器（如果存在）
    this._clearRotationTimer();
    if (this._rotationDelayTimer) {
      clearTimeout(this._rotationDelayTimer);
      this._rotationDelayTimer = null;
    }
    
    // 延迟300ms后启动持续旋转（如果用户还在长按）
    this._rotationDelayTimer = setTimeout(() => {
      this._rotationDelayTimer = null;
      // 启动定时器，每100ms旋转一次
      this._rotationTimer = setInterval(() => {
        this.rotateImageRight();
      }, 100);
    }, 300);
  },

  /**
   * 长按结束 - 停止旋转
   */
  onRotateEnd: function() {
    this._clearRotationTimer();
  },

  /**
   * 移动裁剪框开始 - 拖动裁剪框中心移动位置
   */
  onMoveStart: function(e) {
    // 如果点击的是右下角手柄，不触发移动
    if (e.target && e.target.dataset && e.target.dataset.dir === 'rb') {
      return;
    }
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startCropX: this.data.cropX,
      startCropY: this.data.cropY,
      resizeDir: 'move'
    });
  },

  /**
   * 获取当前图片在 image-wrap 中的显示区域（大画布坐标系转可见区坐标系）
   */
  _getDisplayedImageRect: function() {
    const t = this.data.imageTransform || {};
    const scale = t.scale || 1;
    const startX = this.data.areaStartX != null ? this.data.areaStartX : this.data.wrapWidth || 375;
    const startY = this.data.areaStartY != null ? this.data.areaStartY : 400;
    const ax = t.x !== undefined ? t.x : this.data.imgX;
    const ay = t.y !== undefined ? t.y : this.data.imgY;
    const imgX = ax - startX;
    const imgY = ay - startY;
    const imgW = (t.width || this.data.imgW) * scale;
    const imgH = (t.height || this.data.imgH) * scale;
    return { imgX, imgY, imgW, imgH };
  },

  /**
   * 移动裁剪框 - 拖动裁剪框中心移动位置
   */
  onMove: function(e) {
    if (this.data.resizeDir && this.data.resizeDir !== 'move') return;
    const dx = e.touches[0].clientX - this.data.startX;
    const dy = e.touches[0].clientY - this.data.startY;
    let cropX = this.data.startCropX + dx;
    let cropY = this.data.startCropY + dy;
    const rect = this._getDisplayedImageRect();
    const wrapH = this.data.wrapHeight || 560;
    const maxCropY = Math.max(rect.imgY + rect.imgH - this.data.cropH, wrapH - this.data.cropH);
    cropX = Math.max(rect.imgX, Math.min(rect.imgX + rect.imgW - this.data.cropW, cropX));
    cropY = Math.max(rect.imgY, Math.min(maxCropY, cropY));
    this.setData({ cropX, cropY });
  },

  /**
   * 调整裁剪框大小开始 - 完全按照 demo
   */
  onResizeStart: function(e) {
    const dir = e.currentTarget.dataset.dir || 'rb';
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startW: this.data.cropW,
      startH: this.data.cropH,
      startCropX: this.data.cropX,
      startCropY: this.data.cropY,
      resizeDir: dir
    });
  },

  /**
   * 调整裁剪框大小 - 拖动右下角调整大小
   * 限制 cropW/cropH 不低于 min，避免 maxW/maxH 为 0 或负时裁剪框缩成一点
   */
  onResizeMove: function(e) {
    if (this.data.resizeDir !== 'rb') return;
    const dx = e.touches[0].clientX - this.data.startX;
    const dy = e.touches[0].clientY - this.data.startY;
    const min = 60;
    let { cropX, cropY, cropW, cropH } = this.data;
    const rawCropW = Math.max(min, this.data.startW + dx);
    const rawCropH = Math.max(min, this.data.startH + dy);
    cropW = rawCropW;
    cropH = rawCropH;
    const rect = this._getDisplayedImageRect();
    const wrapH = this.data.wrapHeight || 560;
    const maxW = Math.max(min, rect.imgX + rect.imgW - cropX);
    // 图片底部 与 可见区底部 取较大者，避免 areaStartY/vh 真机不一致导致 rect 偏小
    const imageBottom = rect.imgY + rect.imgH;
    const visibleBottom = wrapH;
    const maxH = Math.max(min, Math.max(imageBottom - cropY, visibleBottom - cropY));
    cropW = Math.min(cropW, maxW);
    cropH = Math.min(cropH, maxH);

    this.setData({ 
      cropX, cropY, cropW, cropH,
      cropWPercent: Math.round(cropW)
    });
  },


  /**
   * 确认裁剪
   */
  confirmCrop: function() {
    const that = this;
    wx.showLoading({
      title: '处理中...',
      mask: true
    });

    // 使用 image-wrap 坐标系（裁剪框和图片都在此坐标系中）
    const rect = this._getDisplayedImageRect();
    const imgX = rect.imgX, imgY = rect.imgY, imgW = rect.imgW, imgH = rect.imgH;
    const {
      tempImagePath,
      cropX, cropY, cropW, cropH,
      rotation,
      showCropBox
    } = this.data;
    
    console.log('[ocrUpload组件] ========== 开始处理 ==========');
    console.log('[ocrUpload组件] tempImagePath:', tempImagePath);
    console.log('[ocrUpload组件] 图片位置和尺寸:', { imgX, imgY, imgW, imgH });
    console.log('[ocrUpload组件] 裁剪框是否显示:', showCropBox);
    console.log('[ocrUpload组件] 裁剪框位置和尺寸:', { cropX, cropY, cropW, cropH });
    
    // 如果裁剪框没有显示，使用整个图片
    let finalCropX = cropX;
    let finalCropY = cropY;
    let finalCropW = cropW;
    let finalCropH = cropH;
    
    if (!showCropBox) {
      // 使用整个图片区域
      finalCropX = imgX;
      finalCropY = imgY;
      finalCropW = imgW;
      finalCropH = imgH;
      console.log('[ocrUpload组件] 裁剪框未显示，使用整个图片:', { finalCropX, finalCropY, finalCropW, finalCropH });
    } else {
      // 检查裁剪框尺寸是否有效
      if (!cropW || !cropH || cropW <= 0 || cropH <= 0) {
        console.error('[ocrUpload组件] ❌ 裁剪框尺寸无效:', { cropW, cropH });
        wx.hideLoading();
        wx.showToast({
          title: '裁剪框尺寸无效',
          icon: 'none'
        });
        return;
      }
      // 裁剪框与图片交集，避免超出图片范围（resize 允许扩展到可见区，但实际裁剪需限制在图片内）
      const cropLeft = Math.max(imgX, finalCropX);
      const cropTop = Math.max(imgY, finalCropY);
      const cropRight = Math.min(imgX + imgW, finalCropX + finalCropW);
      const cropBottom = Math.min(imgY + imgH, finalCropY + finalCropH);
      finalCropX = cropLeft;
      finalCropY = cropTop;
      finalCropW = Math.max(0, cropRight - cropLeft);
      finalCropH = Math.max(0, cropBottom - cropTop);
      if (finalCropW <= 0 || finalCropH <= 0) {
        console.error('[ocrUpload组件] ❌ 裁剪框与图片无交集');
        wx.hideLoading();
        wx.showToast({ title: '裁剪区域无效', icon: 'none' });
        return;
      }
    }
    
    // 获取图片原始尺寸
    wx.getImageInfo({
      src: tempImagePath,
      success: (imgInfo) => {
        console.log('[ocrUpload组件] 图片原始尺寸:', { width: imgInfo.width, height: imgInfo.height });
        
        const query = wx.createSelectorQuery().in(this);
        query.select('#cropCanvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            console.log('[ocrUpload组件] Canvas查询结果:', res);
            
            if (!res || !res[0] || !res[0].node) {
              console.error('[ocrUpload组件] ❌ 获取Canvas节点失败');
              wx.hideLoading();
              wx.showToast({
                title: '初始化失败，请重试',
                icon: 'none'
              });
              return;
            }
            
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            
            // 设置canvas尺寸，获取设备像素比
            // 参考 demo：直接使用 wx.getDeviceInfo().pixelRatio
            let dpr = 1;
            try {
              const deviceInfo = wx.getDeviceInfo();
              dpr = deviceInfo.pixelRatio;
              // 如果 pixelRatio 不存在，尝试从系统信息获取
              if (!dpr || isNaN(dpr)) {
                const systemInfo = wx.getSystemInfoSync();
                dpr = systemInfo.pixelRatio || 1;
              }
            } catch (e) {
              console.warn('[ocrUpload组件] 获取设备像素比失败，使用默认值1:', e);
              dpr = 1;
            }
            
            // 确保 dpr 有效
            if (!dpr || isNaN(dpr) || dpr <= 0) {
              console.warn('[ocrUpload组件] 设备像素比无效，使用默认值1');
              dpr = 1;
            }
            
            console.log('[ocrUpload组件] 设备像素比:', dpr);
            console.log('[ocrUpload组件] 设置Canvas尺寸前:', { width: canvas.width, height: canvas.height });
            console.log('[ocrUpload组件] 最终裁剪尺寸:', { finalCropW, finalCropH });
            
            let canvasWidth = Math.round(finalCropW * dpr);
            let canvasHeight = Math.round(finalCropH * dpr);
            
            // ✅ 限制Canvas最大尺寸，避免文件过大（最大1500x1500，进一步减小文件大小）
            const MAX_CANVAS_SIZE = 1500;
            let canvasScale = 1; // Canvas缩放比例
            if (canvasWidth > MAX_CANVAS_SIZE || canvasHeight > MAX_CANVAS_SIZE) {
              canvasScale = Math.min(MAX_CANVAS_SIZE / canvasWidth, MAX_CANVAS_SIZE / canvasHeight);
              canvasWidth = Math.round(canvasWidth * canvasScale);
              canvasHeight = Math.round(canvasHeight * canvasScale);
              console.log('[ocrUpload组件] ⚠️ Canvas尺寸超过限制，已缩放:', { 
                original: { width: Math.round(finalCropW * dpr), height: Math.round(finalCropH * dpr) },
                scaled: { width: canvasWidth, height: canvasHeight },
                scale: canvasScale
              });
            }
            
            // 计算实际的dpr（考虑Canvas缩放）
            const actualDpr = dpr * canvasScale;
            
            console.log('[ocrUpload组件] 计算后的Canvas尺寸:', { canvasWidth, canvasHeight, actualDpr });
            
            // 确保尺寸有效
            if (isNaN(canvasWidth) || isNaN(canvasHeight) || canvasWidth <= 0 || canvasHeight <= 0) {
              console.error('[ocrUpload组件] ❌ Canvas尺寸无效:', { canvasWidth, canvasHeight, finalCropW, finalCropH, dpr });
              wx.hideLoading();
              wx.showToast({
                title: 'Canvas尺寸计算失败',
                icon: 'none'
              });
              return;
            }
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            console.log('[ocrUpload组件] 设置Canvas尺寸后:', { width: canvas.width, height: canvas.height });
            
            // ✅ 修复问题2：必须先 reset transform，避免 scale 叠加
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(actualDpr, actualDpr);
            
            // 计算裁剪区域（考虑旋转）
            // 对于任意角度旋转，使用通用的坐标转换方式
            const scaleX = imgInfo.width / imgW;
            const scaleY = imgInfo.height / imgH;
            
            // 裁剪框在显示图片中的相对位置
            const relativeX = finalCropX - imgX;
            const relativeY = finalCropY - imgY;
            
            // 转换为原始图片坐标
            let sx = relativeX * scaleX;
            let sy = relativeY * scaleY;
            let sw = finalCropW * scaleX;
            let sh = finalCropH * scaleY;
            
            // 如果旋转角度不是0，需要在Canvas上应用旋转
            // 坐标计算保持原图坐标，旋转在绘制时处理
            
            console.log('[ocrUpload组件] 旋转角度:', rotation);
            console.log('[ocrUpload组件] 裁剪区域计算:', { sx, sy, sw, sh });
            console.log('[ocrUpload组件] 目标画布尺寸:', { finalCropW, finalCropH });
            
            // ✅ 修复问题3：先绑定 onload，再赋值 src（避免真机上偶发不触发）
            const image = canvas.createImage();
            
            image.onload = () => {
              console.log('[ocrUpload组件] ✅ 图片加载成功，开始绘制');
              console.log('[ocrUpload组件] 绘制前Canvas尺寸:', { width: canvas.width, height: canvas.height });
              
              // 清空画布
              ctx.clearRect(0, 0, finalCropW, finalCropH);
              
              // 如果有旋转，需要先旋转再裁剪
              if (rotation !== 0) {
                const rad = rotation * Math.PI / 180;
                
                // 保存当前状态
                ctx.save();
                
                // 移动到画布中心
                ctx.translate(finalCropW / 2, finalCropH / 2);
                // 旋转（注意：这里是反向旋转，因为我们要从旋转后的图片中裁剪）
                ctx.rotate(-rad);
                
                // 计算需要绘制的区域（旋转后的裁剪框在原图中的位置）
                // 裁剪框中心在原图中的位置
                const cropCenterX = sx + sw / 2;
                const cropCenterY = sy + sh / 2;
                
                // 图片中心
                const imgCenterX = imgInfo.width / 2;
                const imgCenterY = imgInfo.height / 2;
                
                // 裁剪框中心相对于图片中心的偏移
                const offsetX = cropCenterX - imgCenterX;
                const offsetY = cropCenterY - imgCenterY;
                
                // 反向旋转偏移量（从旋转后的坐标系转换回原图坐标系）
                const rotatedOffsetX = offsetX * Math.cos(rad) + offsetY * Math.sin(rad);
                const rotatedOffsetY = -offsetX * Math.sin(rad) + offsetY * Math.cos(rad);
                
                // 计算旋转后需要的绘制尺寸（考虑旋转后的尺寸变化）
                const cos = Math.abs(Math.cos(rad));
                const sin = Math.abs(Math.sin(rad));
                const drawW = sw * cos + sh * sin;
                const drawH = sw * sin + sh * cos;
                
                // 绘制图片区域（以裁剪框中心为基准）
                ctx.drawImage(
                  image,
                  imgCenterX + rotatedOffsetX - drawW / 2,
                  imgCenterY + rotatedOffsetY - drawH / 2,
                  drawW,
                  drawH,
                  -finalCropW / 2,
                  -finalCropH / 2,
                  finalCropW,
                  finalCropH
                );
                
                // 恢复状态
                ctx.restore();
              } else {
                // 未旋转，直接绘制裁剪区域
                ctx.drawImage(image, sx, sy, sw, sh, 0, 0, finalCropW, finalCropH);
              }
              
              console.log('[ocrUpload组件] ✅ 图片绘制完成，开始导出');
              
              // 导出图片（保持固定quality，不降低图片质量）
              const exportQuality = 1.0; // 固定高质量，保持不变
              console.log('[ocrUpload组件] 导出质量设置:', { 
                quality: exportQuality, 
                canvasScale, 
                canvasSize: `${canvasWidth}x${canvasHeight}`,
                pixels: canvasWidth * canvasHeight
              });
              
              wx.canvasToTempFilePath({
                canvas: canvas,
                fileType: 'jpg',
                quality: exportQuality,
                success: (res) => {
                  console.log('[ocrUpload组件] ✅ Canvas导出成功:', res.tempFilePath);
                  const tempPath = res.tempFilePath;
                  // 直接使用临时文件路径，不调用 saveFile，避免多次解析后占满本地 200MB 缓存导致「已超过文件大小」
                  // 临时文件在当前会话内可用于上传；若需长期保存可由业务侧再存
                  const usePath = tempPath;
                  wx.hideLoading();
                  that.setData({
                    showCropper: false,
                    cropImageSrc: '',
                    tempImagePath: ''
                  });
                  that._updateImageState(usePath);
                  if (that._pendingThenOCR) {
                    const imageList = [{ path: usePath, id: Date.now(), status: 'pending' }];
                    that.triggerEvent(that._pendingThenOCR === 'fast' ? 'startOCRFast' : 'startOCR', { imageList });
                    that._pendingThenOCR = null;
                    setTimeout(() => { that._isRecognizing = false; }, 2000);
                  }
                },
                fail: (err) => {
                  console.error('[ocrUpload组件] ❌ 导出裁剪图片失败:', err);
                  wx.hideLoading();
                  wx.showToast({
                    title: '裁剪失败，请重试',
                    icon: 'none'
                  });
                  that._pendingThenOCR = null;
                  that._isRecognizing = false;
                }
              });
            };
            
            // ✅ 最后赋值 src，确保 onload 已绑定
            console.log('[ocrUpload组件] 设置图片源:', tempImagePath);
            image.src = tempImagePath;
          });
        }
      });
    }
  
  },
})
