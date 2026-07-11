import load from '../../../../lib/load';
import { parseOrderFromText } from '../../../../lib/orderParser';
import {
  depPasteSearchGoods,
  choiceGoodsForApply,
  updateOrder,
  deleteOrder,
  addRecord,
  downDisGoods,
  getBooks,
  depGetTodayRecordSeconds
} from '../../../../lib/apiRestraunt';

import {
  disSaveStandard,
  queryDepDisGoodsByQuickSearch,
  disDeleteStandard,
 
} from '../../../../lib/apiRestraunt';
const config = require('../../../../config.js');

const globalData = getApp().globalData;
const plugin = requirePlugin("QCloudAIVoice");
const speechRecognizerManager = plugin.speechRecognizerManager();
//

// 腾讯云配置
const TENCENT_CLOUD_SECRET_ID = config.tencentCloud?.secretId || '';
const TENCENT_CLOUD_SECRET_KEY = config.tencentCloud?.secretKey || '';
const TENCENT_CLOUD_APP_ID = config.tencentCloud?.appId || '1308821743';
const TENCENT_CLOUD_ENGINE_MODEL_TYPE = config.tencentCloud?.engineModelType || '16k_zh';
const TENCENT_CLOUD_VOICE_FORMAT = config.tencentCloud?.voiceFormat || 1;

var books = "";

Page({

  onShow() {
    if (this.data.addOrder) {
      console.log("adaororororo");
      var orderItem = this.data.orderItem;
      var orderArrIndex = this.data.orderArrIndex;
      var orderArr = this.data.orderArr;
      orderArr.splice(orderArrIndex, 0, orderItem);
      this.setData({
        orderArr: orderArr
      })

    }

    if (this.data.findGoods) {
      this._choiceGoods();
    }

  },

  onHide() {
    // 页面隐藏时停止录音
    if (this.data.isRecording) {
      this.stopRecord();
    }
  },

  onUnload() {
    // 页面卸载时停止录音
    if (this.data.isRecording) {
      this.stopRecord();
    }
    // 清除所有定时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    if (this.restSecondsTimer) {
      clearInterval(this.restSecondsTimer);
    }
    // 清除静音定时器
    if (this.data.silenceTimer) {
      clearTimeout(this.data.silenceTimer);
    }
  },


  data: {
    orderArr: [],
    show: false,
    showOperation: false,
    findGoods: false,
    addOrder: false,
    todayCount: null,
    goodsName: null,
    count: 0,
    duration: 0,
    timer: null,
    customerName: "",
    sentence: "",
    inputContent: "",
    originSentence: '',
    bottomHeight: 180,
    hasAiRecognized: false,
    isRecording: false,
    showExplanationModal: false,
    explanationContent: "",
    hasUsedExtraTime: false, // 是否已经使用过额外录音时间
    silenceTimer: null, // 静音超时定时器
    lastVoiceTime: 0, // 最后一次检测到语音的时间
  },


  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      depFatherId: options.depFatherId,
      depId: options.depId,
      disId: options.disId,
      depName: options.depName,
    })

    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        userInfo: value,
        disId: value.nxDuDistributerId,
        userId: value.nxDepartmentUserId,
      })
    } else {
      this.setData({
        userId:  -1,
      })
    }
 
    // getBooks().then(res =>{
    //   if(res.result.code == 0){ 
    //    books = res.result.data;
    //   }
    // })


    depGetTodayRecordSeconds(this.data.depFatherId).then(res =>{
      if(res.result.code == 0){
        this.setData({
          restSeconds: res.result.data
        })
      }
    })
   

    // 检查隐私设置并处理隐私弹窗逻辑
    wx.getPrivacySetting({
      success: res => {
        console.log("getPrivacySetting", res);
        if (res.needAuthorization) {
          // 需要弹出隐私协议
          wx.showModal({
            title: '隐私协议',
            content: '为了提供更好的服务，我们需要收集您的某些信息。请仔细阅读并同意我们的隐私协议。',
            showCancel: false,
            success: function (result) {
              if (result.confirm) {
                // 用户同意隐私协议，尝试调用需要授权的API
                wx.authorize({
                  scope: 'scope.record', // 替换为你需要授权的API范围
                  success: function () {
                    // 授权成功，可以调用相关API了
                    console.log('授权成功');
                    // 调用相关API的代码...
                  },
                  fail: function () {
                    // 授权失败，处理错误
                    console.log('授权失败');
                  }
                });
              }
            }
          });
        } else {
          // 用户已经授权，可以直接调用相关API
          console.log('已经授权');
          // 调用相关API的代码...
        }
      }
    });

    // 初始化语音识别回调
    speechRecognizerManager.OnRecognitionStart = (res) => {
      console.log('开始识别', res)
      this.setData({
        recognitionStatus: '识别中...'
      })
    }

    speechRecognizerManager.OnSentenceBegin = (res) => {
      console.log('一句话开始', res)
    }

    speechRecognizerManager.OnRecognitionResultChange = (res) => {
      console.log('识别变化时', res)
      if (res.result) {
        // 检测到语音，重置静音计时器
        this.setData({
          sentence: res.result.voice_text_str,
          lastVoiceTime: Date.now()
        });
        
        // 清除之前的静音定时器
        if (this.data.silenceTimer) {
          clearTimeout(this.data.silenceTimer);
        }
        
        // 设置新的静音检测定时器（6秒）
        const silenceTimer = setTimeout(() => {
          console.log('检测到6秒静音，自动停止录音');
          this.stopRecord();
          wx.showToast({
            title: '检测到静音，已停止录音',
            icon: 'none',
            duration: 2000
          });
        }, 6000);
        
        this.setData({
          silenceTimer: silenceTimer
        });
      }
    }

    speechRecognizerManager.OnSentenceEnd = (res) => {
      console.log('一句话结束', res)
    }

    speechRecognizerManager.OnRecognitionComplete = async (res) => {
      console.log('========== 语音识别完成 ==========');
      console.log('识别结束', res);
      // 停止后清理静音定时器
      if (this.data.silenceTimer) clearTimeout(this.data.silenceTimer);
      
      this.setData({
        recognitionStatus: '识别完成',
        isRecording: false
      });

      try {
        // 获取识别到的文本
        const recognizedText = this.data.sentence;
        console.log('【语音识别原始文本】:', recognizedText);
        if (!recognizedText || recognizedText.trim() === '') {
          console.log('识别文本为空，跳过');
          return;
        }

        // 直接显示原始识别结果，不调用 DeepSeek（用户自行修改后点"识别"）
        this.setData({
          inputContent: recognizedText,
          sentence: recognizedText,
          originSentence: recognizedText,
          hasAiRecognized: false // 还没解析，保持 false
        });
      } catch (error) {
        console.error('========== 处理语音识别结果时出错 ==========');
        console.error('错误信息:', error);
        console.error('错误堆栈:', error.stack);
        wx.showToast({
          title: '文本优化失败，使用原始文本',
          icon: 'none',
          duration: 2000
        });
      }
    }

    speechRecognizerManager.OnError = (res) => {
      console.log('识别失败', res)
      this.setData({
        recognitionStatus: '识别失败',
        isRecording: false
      })
    }

    speechRecognizerManager.OnRecorderStop = (res) => {
      console.log('录音结束', res);
      this.setData({
        inputContent: this.data.sentence,
      })
    }

    // //。
  },

  startRecord() {
    // 检查录音时间是否已用完
    if (this.data.restSeconds <= 0) {
      wx.showModal({
        title: '录音时长提醒',
        content: '今日录音时间已用完，请选择用其它方式下单。如果您的下单时间不够用，请联系配送商为您增加录音时长。',
        showCancel: false,
        confirmText: '知道了',
        success: function (res) {
          if (res.confirm) {
            console.log('用户确认了录音时间用完');
          }
        }
      });
      return;
    }

    wx.vibrateShort && wx.vibrateShort();
    const that = this;
    console.log('[startRecord] called');
    this.setData({
      duration: 0,
      isRecording: true,
    }, () => {
      console.log('[startRecord] setData done, duration:', that.data.duration, 'isRecording:', that.data.isRecording);
    });
  
    const params = {
      secretkey: TENCENT_CLOUD_SECRET_KEY,
        secretid: TENCENT_CLOUD_SECRET_ID,
        appid: TENCENT_CLOUD_APP_ID,
        engine_model_type: TENCENT_CLOUD_ENGINE_MODEL_TYPE,
        voice_format: TENCENT_CLOUD_VOICE_FORMAT
    };
  
    if (this.restSecondsTimer) clearInterval(this.restSecondsTimer);
    this.restSecondsTimer = setInterval(() => {
      if (that.data.restSeconds > 0) {
        that.setData({
          restSeconds: that.data.restSeconds - 1
        });
      } else {
        // 检查是否已经使用过额外时间
        if (!that.data.hasUsedExtraTime) {
          // 第一次用完，给60秒额外时间
          that.setData({
            hasUsedExtraTime: true,
            restSeconds: 60
          });
          
          wx.showModal({
            title: '录音时长提醒',
            content: '今天录音时长已用完，今天为您额外添加 60 秒录音时间，如果您的订单较多，请联系供货商为您增加录音时间',
            showCancel: false,
            confirmText: '知道了',
            success: function (res) {
              if (res.confirm) {
                console.log('用户确认了额外录音时间');
              }
            }
          });
        } else {
          // 额外时间也用完了，停止录音
          that.stopRecord();
          
          wx.showModal({
            title: '录音时长提醒',
            content: '今日录音时长已用完，请您用其它方式下单',
            showCancel: false,
            confirmText: '知道了',
            success: function (res) {
              if (res.confirm) {
                console.log('用户确认了录音时长用完');
              }
            }
          });
        }
      }
    }, 1000);
  
    if (that.data.timer) clearInterval(that.data.timer);
    that.data.timer = setInterval(() => {
      that.setData({
        duration: that.data.duration + 1
      }, () => {
        console.log('[timer] duration:', that.data.duration);
      });
    }, 1000);
  
    console.log('[startRecord] timer started:', !!that.data.timer);
    speechRecognizerManager.start(params);
  },
  
  stopRecord() {
    const that = this;
    that.lastRecordDuration = that.data.duration;
    console.log('[stopRecord] called, duration:', that.data.duration, 'isRecording:', that.data.isRecording);
    clearInterval(that.data.timer);
    if (this.restSecondsTimer) clearInterval(this.restSecondsTimer);
    // 清除静音定时器
    if (this.data.silenceTimer) {
      clearTimeout(this.data.silenceTimer);
      this.setData({
        silenceTimer: null
      });
    }
    // 增强：确保isRecording状态被正确关闭
    if (that.data.isRecording) {
      console.log('[stopRecord] set isRecording false');
      that.setData({
        isRecording: false
      });
    }
    that.setData({
      recording: false,
      timer: null,
      // isRecording: false, // 保留原有，防止遗漏
    }, () => {
      console.log('[stopRecord] setData done, duration:', that.data.duration, 'isRecording:', that.data.isRecording);
    });

    var data = {
      nxNdplNxDisId: that.data.disId,
      nxNdplPaySubtotal: that.data.duration,
      nxNdplNxDepartmentFatherId: that.data.depFatherId,
      nxNdplNxDepartmentId: that.data.depId,
    };
    load.showLoading("保存录音");
    console.log('[stopRecord] addRecord data:', data);
    addRecord(data).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        that.setData({
          duration: 0,
        }, () => {
          console.log('[stopRecord] duration reset to 0');
        });
      }
    });

    speechRecognizerManager.stop();

  },



  // --- 文本与订单解析核心逻辑 ---

  formatContent: function () {
    var content = this.data.inputContent;
    console.log('[formatContent] 开始处理内容:', content);
    
    if (!content || content.trim() === '') {
      console.log('[formatContent] 内容为空，跳过处理');
      this.setData({ highlightedContent: '' });
      return;
    }

    // 解析前先移除可能存在的修改标记（上次插入的）
    content = this._stripInvalidMarkers(content);

    // 使用工具函数解析订单（复用老板端 lib/orderParser 的解析方法，统一输出 nxDo* 字段）
    const result = parseOrderFromText(content, {
      depId: this.data.depId,
      depFatherId: this.data.depFatherId,
      disId: this.data.disId,
      userId: this.data.userId
    });
    
    if (result.orders && result.orders.length > 0) {
      // 若存在不合格片段：在原文插入【】标记，回显到输入框
      if (result.invalidSegments && result.invalidSegments.length > 0) {
        const contentForHighlight = result.contentForHighlight || content;
        const modifiedContent = this._insertInvalidMarkersInContent(contentForHighlight, result.invalidSegments);
        this.setData({
          orderArr: [],
          sentence: modifiedContent,
          inputContent: modifiedContent
        });
        wx.showToast({ title: '存在格式不合格项，【】标记处请修改', icon: 'none', duration: 2500 });
        return result;
      }
      // 无问题，正常生成订单
      this.setData({ 
        orderArr: result.orders,
        saveCount: null,
        highlightedContent: '',
        hasAiRecognized: true // 解析成功，底部按钮切换为"重新粘贴"
      });
      this._updateHasUnsavedOrders(result.orders);
      this._saveToStorage(result.orders);
      this.setData({ formattedContent: result.formatted || '' });
      return result;
    } else {
      console.log('[formatContent] 未解析到有效订单');
      this.setData({ highlightedContent: '' });
      return { orders: [], formatted: '' };
    }
  },

  /** 解析前移除插入的标记（【 和 】） */
  _stripInvalidMarkers: function (content) {
    if (!content) return '';
    return String(content).replace(/【/g, '').replace(/】/g, '');
  },

  /**
   * 在原文中按不合格片段插入纯文本标记，开始用【结束用】
   * @param {string} content - 与解析时一致的内容（contentForHighlight）
   * @param {Array} invalidSegments - [{ segmentText }]
   * @returns {string} 插入【】标记后的原文
   */
  _insertInvalidMarkersInContent: function (content, invalidSegments) {
    if (!content || !invalidSegments || invalidSegments.length === 0) return content;
    let result = '';
    let remaining = content;
    while (true) {
      let best = { pos: -1, seg: null };
      for (const seg of invalidSegments) {
        if (!seg.segmentText) continue;
        const idx = remaining.indexOf(seg.segmentText);
        if (idx >= 0 && (best.pos < 0 || idx < best.pos)) {
          best = { pos: idx, seg };
        }
      }
      if (best.pos < 0) break;
      result += remaining.slice(0, best.pos);
      result += '【' + best.seg.segmentText + '】';
      remaining = remaining.slice(best.pos + best.seg.segmentText.length);
    }
    result += remaining;
    return result;
  },



  // --- 缓存与数据管理 ---

  _updateHasUnsavedOrders(orders) {
    const arr = orders || this.data.orderArr || [];
    this.setData({ hasUnsavedOrders: arr.some(o => o.nxDoStatus === -2) });
  },

  _saveToStorage(orders) {
    const orderArr = orders || this.data.orderArr;
    if (!orderArr || orderArr.length === 0) return;

    // 确保 pasteDepList 初始化
    let pasteDepList = this.data.pasteDepList || [];
    let pasteDepIndex = this.data.pasteDepIndex;

    // 如果还没有对应的部门索引，寻找或新建
    if (pasteDepIndex === -1 || pasteDepIndex === undefined) {
      const existingIndex = pasteDepList.findIndex(item => item.depId === this.data.depId);
      if (existingIndex >= 0) {
        pasteDepIndex = existingIndex;
      } else {
        pasteDepList.push({
          depId: this.data.depId,
          arr: [],
          saveCount: null,
          strArr: [],
          nxArr: [],
          searchStr: ""
        });
        pasteDepIndex = pasteDepList.length - 1;
      }
      this.setData({ pasteDepIndex, pasteDepList });
    }

    try {
      // 安全更新数据
      if (pasteDepList[pasteDepIndex]) {
        pasteDepList[pasteDepIndex].arr = orderArr;
        pasteDepList[pasteDepIndex].depId = this.data.depId;
        wx.setStorageSync('pasteDepList', pasteDepList);
      }
    } catch (e) {
      console.warn('缓存写入失败', e);
    }
  },

  _updateStorage(order) {
    // 1. 更新内存
    if (this.data.orderArrIndex !== undefined && this.data.orderArrIndex >= 0) {
      const key = `orderArr[${this.data.orderArrIndex}]`;
      this.setData({ [key]: order });
    }

    // 2. 更新缓存 (安全检查)
    const list = this.data.pasteDepList;
    const idx = this.data.pasteDepIndex;
    const orderIdx = this.data.orderArrIndex;

    if (list && idx >= 0 && list[idx] && list[idx].arr) {
      list[idx].arr[orderIdx] = order;
      wx.setStorageSync('pasteDepList', list);
      this._updateHasUnsavedOrders();
    }
  },


  

  // 合并被拆开的商品行（如"500"、"黑方餐盒"、"100个"）
  mergeLines: function (lines) {
    const merged = [];
    let i = 0;
    while (i < lines.length) {
      // 如果当前行是纯数字，且后面有两行，合并三行
      if (/^[\d一二三四五六七八九十百千万]+$/.test(lines[i]) && i + 2 < lines.length) {
        merged.push(lines[i] + lines[i + 1] + lines[i + 2]);
        i += 3;
      } else if (/^[\d一二三四五六七八九十百千万]+$/.test(lines[i]) && i + 1 < lines.length) {
        merged.push(lines[i] + lines[i + 1]);
        i += 2;
      } else {
        merged.push(lines[i]);
        i++;
      }
    }
    return merged;
  },


  _formatOrderContent: function (content) {
    console.log('[formatOrderContent] 入参 content:', content);
    // 改为 let，后面要对 orders 重新赋值
    let orders = [];
    // 1. 按行拆分
    let lines = content.split(/\r?\n/);
  
    // 过滤无效行
    console.log("linessss", lines);
    lines = lines.filter(line => {
      line = line.trim();
      if (!line) return false; // 跳过空行
      if (/^备注[:：]/.test(line)) return true;
  
      let orderRegex = /^\d+[、，\.．]\s*(.+?)[:：]\s*(.+)$/;
      if (orderRegex.test(line)) return true;
  
      let commaRegex = /^(.*?)\s*[\,，]\s*(.+)$/;
      if (commaRegex.test(line)) return true;
  
      let hasNumber = /[\d零一二两三四五六七八九十百千万半]/.test(line);
      return hasNumber;
    });
  
    // ============ A. 中文数字转阿拉伯数字 ============
    function chineseNumberToArabic(chineseNum) {
      const map = {
        '零': 0, '一': 1, '二': 2, '两': 2, '三': 3,
        '四': 4, '五': 5, '六': 6, '七': 7, '八': 8,
        '九': 9, '十': 10, '百': 100, '千': 1000,
        '万': 10000, '半': 0.5
      };
      let result = 0, temp = 0;
      for (let i = 0; i < chineseNum.length; i++) {
        const char = chineseNum[i];
        if (char === '半') {
          result += 0.5;
        } else if (map[char] >= 10) {
          if (temp === 0) temp = 1;
          result += temp * map[char];
          temp = 0;
        } else if (map[char] !== undefined) {
          temp = temp * 10 + map[char];
        }
      }
      result += temp;
      return result;
    }
  
    // ============ B. 从尾部解析「名称 + 括号备注 + 数量+单位」 ============
    function parseSegmentEndOfLine(segment) {
      segment = segment.trim().replace(/[,，、。.]+$/g, '');
  
      // 先移除说明文字，避免被当作备注
      segment = segment.replace(/（说明.+?）/g, '');
      
      const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
      let remarkText = '';
      const bracketMatch = segment.match(bracketRegex);
      if (bracketMatch) {
        remarkText = bracketMatch[1];
        segment = segment.replace(bracketRegex, '').trim();
      }
  
      const hasArabic = /[0-9]/.test(segment);
      let name = segment, qtyVal = '', qtyUnit = '', regex;
  
      if (hasArabic) {
        regex = /^(.*?)([\d\.]+)(\S*)$/;
      } else {
        regex = /^(.*?)([一二两三四五六七八九十百千万半]+)(\S*)$/;
      }
      const m = segment.match(regex);
      if (m) {
        let potentialName = m[1].trim().replace(/\s+/g, '');
        let potentialQty  = m[2].trim();
        let potentialUnit = m[3].trim();
        name = potentialName;
  
        console.log('[parseSegmentEndOfLine] 解析结果:', {
          segment,
          potentialName,
          potentialQty,
          potentialUnit
        });
  
        // 数量值
        if (/^[\d\.]+$/.test(potentialQty)) {
          qtyVal = potentialQty;
        } else {
          qtyVal = chineseNumberToArabic(potentialQty).toString();
        }
  
        // 单位列表
        const validUnits = ['斤','个','包','根','棵','条','盒','捆','袋','跟','块','瓶','罐','桶','箱','袋','包','盒','瓶','罐','桶','箱'];
        let foundUnit = '';
        for (let u of validUnits) {
          if (potentialUnit.startsWith(u)) {
            foundUnit = u; break;
          }
        }
        if (foundUnit) {
          qtyUnit = foundUnit;
          const extra = potentialUnit.slice(foundUnit.length).trim();
          if (extra) remarkText = remarkText ? (remarkText + ' ' + extra) : extra;
        } else {
          qtyUnit = potentialUnit;
        }
        
        console.log('[parseSegmentEndOfLine] 最终结果:', {
          name,
          qtyVal,
          qtyUnit,
          remarkText
        });
      }
  
      return {
        nxDoGoodsName: name,
        nxDoQuantity:  qtyVal,
        nxDoStandard:  qtyUnit,
        nxDoRemark:    remarkText,
      };
    }
  
    // ============ C. 序号格式解析 ============
    function parseLineWithSerial(line) {
      const match = line.match(/^(\d+)[、，\.．]\s*(.+?)[:：]\s*(.+)$/);
      if (!match) return null;
  
      let namePart = match[2].trim().replace(/\s+/g, '');
      let qtyPart  = match[3].trim().replace(/[\.。]+$/g, '').trim();
  
      // 先移除说明文字，避免被当作备注
      namePart = namePart.replace(/（说明.+?）/g, '');
      qtyPart = qtyPart.replace(/（说明.+?）/g, '');
  
      let remarkText = '';
      const br = namePart.match(/(?:（|\(|【)(.+?)(?:）|\)|】)/);
      if (br) { remarkText = br[1]; namePart = namePart.replace(/(?:（|\(|【).+?(?:）|\)|】)/, '').trim(); }
  
      const qMatch = qtyPart.match(/^([\d一二三四五六七八九十百千万半\.]+)\s*(\S*)$/);
      let val = '', unit = '';
      if (qMatch) { val = qMatch[1]; unit = qMatch[2]; }
      if (/[零一二两三四五六七八九十百千万半]/.test(val)) {
        val = chineseNumberToArabic(val).toString();
      }
      if (unit === '两' || unit === '量') {
        let v = parseFloat(val) / 10; v = +v.toFixed(1);
        val = v.toString(); unit = '斤';
      }
  
      return {
        nxDoGoodsName: namePart,
        nxDoQuantity:  val,
        nxDoStandard:  unit,
        nxDoRemark:    remarkText
      };
    }
  
    // ============ D. 拆逗号分隔 ============
    function splitByCommaOutsideBrackets(str) {
      let res = [], depth = 0, cur = '';
      for (let c of str) {
        if ('（(【'.includes(c)) { depth++; cur += c; }
        else if ('）)】'.includes(c)) { depth = Math.max(0, depth - 1); cur += c; }
        else if ((c === ','||c==='，'||c==='、') && depth === 0) {
          if (cur.trim()) res.push(cur.trim());
          cur = '';
        } else cur += c;
      }
      if (cur.trim()) res.push(cur.trim());
      return res;
    }
  
    function parseLineWithComma(line) {
      console.log('[parseLineWithComma] 开始解析行:', line);
      
      // 先按逗号分割，处理逗号分隔的商品
      if (/[，,]/.test(line)) {
        let commaParts = line.split(/[，,]/);
        let arr = [];
        
        console.log('[parseLineWithComma] 按逗号分割后的部分:', commaParts);
        
        for (let i = 0; i < commaParts.length; i++) {
          let item = commaParts[i].trim();
          if (!item) continue;
          
          console.log('[parseLineWithComma] 处理逗号分割部分:', item);
          
          // 检查是否包含多个商品（用空格分隔）
          if (/\s/.test(item) && item.length > 10) {
            console.log('[parseLineWithComma] 检测到可能包含多个商品，尝试进一步分割:', item);
            let subParts = item.split(/\s+/);
            let subArr = [];
            
            for (let j = 0; j < subParts.length; j++) {
              let subItem = subParts[j].trim();
              if (!subItem) continue;
              
              console.log('[parseLineWithComma] 处理子部分:', subItem);
              
              // 对子部分进行解析
              let subMm = subItem.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
              if (subMm) {
                let subGoodsName = subMm[1].trim();
                let subQuantity = subMm[2].trim();
                let subUnit = subMm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
                
                console.log('[parseLineWithComma] 子部分匹配成功:', { subGoodsName, subQuantity, subUnit });
                
                if (/[\u4e00-\u9fa5]/.test(subGoodsName) && subGoodsName.length > 0 && subGoodsName.length <= 10) {
                  let subQtyVal = subQuantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(subQuantity)) {
                    subQtyVal = chineseNumberToArabic(subQuantity).toString();
                  }
                  
                  console.log('[parseLineWithComma] 添加子商品:', { subGoodsName, subQtyVal, subUnit });
                  subArr.push({
                    nxDoGoodsName: subGoodsName,
                    nxDoQuantity: subQtyVal,
                    nxDoStandard: subUnit,
                    nxDoRemark: ''
                  });
                }
              } else {
                // 尝试使用 parseSegmentEndOfLine 解析子部分
                let subParsed = parseSegmentEndOfLine(subItem);
                if (subParsed && subParsed.nxDoQuantity) {
                  console.log('[parseLineWithComma] 子部分 parseSegmentEndOfLine 解析结果:', subParsed);
                  subArr.push(subParsed);
                }
              }
            }
            
            if (subArr.length > 0) {
              console.log('[parseLineWithComma] 子部分解析成功，添加多个商品:', subArr);
              arr.push(...subArr);
              continue;
            }
          }
          
          // 1. 尝试匹配 "商品名+数字+单位" 格式
          let mm = item.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
          console.log('[parseLineWithComma] 正则匹配结果:', mm);
          if (mm) {
            let goodsName = mm[1].trim();
            let quantity = mm[2].trim();
            let unit = mm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
            
            console.log('[parseLineWithComma] 匹配到格式1:', { goodsName, quantity, unit });
            
            // 验证商品名包含中文字符，并且商品名不能太长（避免匹配到多个商品）
            console.log('[parseLineWithComma] 验证商品名:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
            if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0 && goodsName.length <= 10) {
              let qtyVal = quantity;
              if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                qtyVal = chineseNumberToArabic(quantity).toString();
              }
              
              console.log('[parseLineWithComma] 添加商品:', { goodsName, qtyVal, unit });
              arr.push({
                nxDoGoodsName: goodsName,
                nxDoQuantity: qtyVal,
                nxDoStandard: unit,
                nxDoRemark: ''
              });
              continue;
            } else {
              console.log('[parseLineWithComma] 商品名验证失败:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
            }
          }
          
          // 2. 尝试使用 parseSegmentEndOfLine 解析
          let parsed = parseSegmentEndOfLine(item);
          if (parsed && parsed.nxDoQuantity) {
            console.log('[parseLineWithComma] parseSegmentEndOfLine 解析结果:', parsed);
            arr.push(parsed);
            continue;
          }
          
          // 3. 如果都失败了，尝试匹配纯数字格式
          mm = item.match(/^(.+?)(\d+)(.+)$/);
          if (mm) {
            let goodsName = mm[1].trim();
            if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
              console.log('[parseLineWithComma] 匹配到纯数字格式:', mm);
              arr.push({
                nxDoGoodsName: goodsName,
                nxDoQuantity: mm[2].trim(),
                nxDoStandard: mm[3].trim(),
                nxDoRemark: ''
              });
              continue;
            }
          }
          
          // 4. 新增：尝试组合相邻部分
          if (i < commaParts.length - 1) {
            let nextItem = commaParts[i + 1].trim();
            if (nextItem) {
              let combined = item + nextItem;
              console.log('[parseLineWithComma] 尝试组合:', combined);
              
              // 尝试匹配组合后的格式
              mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
              if (mm) {
                let goodsName = mm[1].trim();
                let quantity = mm[2].trim();
                let unit = mm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
                
                console.log('[parseLineWithComma] 组合匹配成功:', { goodsName, quantity, unit });
                
                if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                  let qtyVal = quantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                    qtyVal = chineseNumberToArabic(quantity).toString();
                  }
                  
                  console.log('[parseLineWithComma] 添加组合商品:', { goodsName, qtyVal, unit });
                  arr.push({
                    nxDoGoodsName: goodsName,
                    nxDoQuantity: qtyVal,
                    nxDoStandard: unit,
                    nxDoRemark: ''
                  });
                  i++; // 跳过下一个部分，因为已经组合处理了
                  continue;
                }
              }
            }
          }
          
          // 5. 新增：处理被分割的商品名（如"油 菜"）
          if (i < commaParts.length - 2) {
            let nextItem = commaParts[i + 1].trim();
            let nextNextItem = commaParts[i + 2].trim();
            
            // 检查当前项和下一项是否都是中文字符，且下一项的下一个项包含数字
            if (/^[\u4e00-\u9fa5]+$/.test(item) && 
                /^[\u4e00-\u9fa5]+$/.test(nextItem) && 
                /[\d一二两三四五六七八九十百千万半]/.test(nextNextItem)) {
              
              let combinedName = item + nextItem;
              let combined = combinedName + nextNextItem;
              console.log('[parseLineWithComma] 尝试组合商品名:', combined);
              
              // 尝试匹配组合后的格式
              mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
              if (mm) {
                let goodsName = mm[1].trim();
                let quantity = mm[2].trim();
                let unit = mm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
                
                console.log('[parseLineWithComma] 商品名组合匹配成功:', { goodsName, quantity, unit });
                
                if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                  let qtyVal = quantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                    qtyVal = chineseNumberToArabic(quantity).toString();
                  }
                  
                  console.log('[parseLineWithComma] 添加组合商品名商品:', { goodsName, qtyVal, unit });
                  arr.push({
                    nxDoGoodsName: goodsName,
                    nxDoQuantity: qtyVal,
                    nxDoStandard: unit,
                    nxDoRemark: ''
                  });
                  i += 2; // 跳过两个部分，因为已经组合处理了
                  continue;
                }
              }
            }
          }
        }
        
        console.log('[parseLineWithComma] 逗号分割最终解析结果:', arr);
        if (arr.length) {
          return arr;
        }
      }

      // 如果没有逗号，尝试按空格分割
      if (/\s/.test(line)) {
        let spaceParts = line.split(/\s+/);
        let arr = [];
        
        console.log('[parseLineWithComma] 按空格分割后的部分:', spaceParts);
        
        for (let i = 0; i < spaceParts.length; i++) {
          let item = spaceParts[i].trim();
          if (!item) continue;
          
          console.log('[parseLineWithComma] 处理空格分割部分:', item);
          
          // 1. 尝试匹配 "商品名+数字+单位" 格式
          let mm = item.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
          console.log('[parseLineWithComma] 正则匹配结果:', mm);
          if (mm) {
            let goodsName = mm[1].trim();
            let quantity = mm[2].trim();
            let unit = mm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
            
            console.log('[parseLineWithComma] 匹配到格式1:', { goodsName, quantity, unit });
            
            // 验证商品名包含中文字符，并且商品名不能太长（避免匹配到多个商品）
            console.log('[parseLineWithComma] 验证商品名:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
            if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0 && goodsName.length <= 10) {
              let qtyVal = quantity;
              if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                qtyVal = chineseNumberToArabic(quantity).toString();
              }
              
              console.log('[parseLineWithComma] 添加商品:', { goodsName, qtyVal, unit });
              arr.push({
                nxDoGoodsName: goodsName,
                nxDoQuantity: qtyVal,
                nxDoStandard: unit,
                nxDoRemark: ''
              });
              continue;
            } else {
              console.log('[parseLineWithComma] 商品名验证失败:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
            }
          }
          
          // 2. 尝试使用 parseSegmentEndOfLine 解析
          let parsed = parseSegmentEndOfLine(item);
          if (parsed && parsed.nxDoQuantity) {
            console.log('[parseLineWithComma] parseSegmentEndOfLine 解析结果:', parsed);
            arr.push(parsed);
            continue;
          }
          
          // 3. 如果都失败了，尝试匹配纯数字格式
          mm = item.match(/^(.+?)(\d+)(.+)$/);
          if (mm) {
            let goodsName = mm[1].trim();
            if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
              console.log('[parseLineWithComma] 匹配到纯数字格式:', mm);
              arr.push({
                nxDoGoodsName: goodsName,
                nxDoQuantity: mm[2].trim(),
                nxDoStandard: mm[3].trim(),
                nxDoRemark: ''
              });
              continue;
            }
          }
          
          // 4. 新增：尝试组合相邻部分
          if (i < spaceParts.length - 1) {
            let nextItem = spaceParts[i + 1].trim();
            if (nextItem) {
              let combined = item + nextItem;
              console.log('[parseLineWithComma] 尝试组合:', combined);
              
              // 尝试匹配组合后的格式
              mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
              if (mm) {
                let goodsName = mm[1].trim();
                let quantity = mm[2].trim();
                let unit = mm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
                
                console.log('[parseLineWithComma] 组合匹配成功:', { goodsName, quantity, unit });
                
                if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                  let qtyVal = quantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                    qtyVal = chineseNumberToArabic(quantity).toString();
                  }
                  
                  console.log('[parseLineWithComma] 添加组合商品:', { goodsName, qtyVal, unit });
                  arr.push({
                    nxDoGoodsName: goodsName,
                    nxDoQuantity: qtyVal,
                    nxDoStandard: unit,
                    nxDoRemark: ''
                  });
                  i++; // 跳过下一个部分，因为已经组合处理了
                  continue;
                }
              }
            }
          }
          
          // 5. 新增：处理被分割的商品名（如"油 菜"）
          if (i < spaceParts.length - 2) {
            let nextItem = spaceParts[i + 1].trim();
            let nextNextItem = spaceParts[i + 2].trim();
            
            // 检查当前项和下一项是否都是中文字符，且下一项的下一个项包含数字
            if (/^[\u4e00-\u9fa5]+$/.test(item) && 
                /^[\u4e00-\u9fa5]+$/.test(nextItem) && 
                /[\d一二两三四五六七八九十百千万半]/.test(nextNextItem)) {
              
              let combinedName = item + nextItem;
              let combined = combinedName + nextNextItem;
              console.log('[parseLineWithComma] 尝试组合商品名:', combined);
              
              // 尝试匹配组合后的格式
              mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
              if (mm) {
                let goodsName = mm[1].trim();
                let quantity = mm[2].trim();
                let unit = mm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
                
                console.log('[parseLineWithComma] 商品名组合匹配成功:', { goodsName, quantity, unit });
                
                if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                  let qtyVal = quantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                    qtyVal = chineseNumberToArabic(quantity).toString();
                  }
                  
                  console.log('[parseLineWithComma] 添加组合商品名商品:', { goodsName, qtyVal, unit });
                  arr.push({
                    nxDoGoodsName: goodsName,
                    nxDoQuantity: qtyVal,
                    nxDoStandard: unit,
                    nxDoRemark: ''
                  });
                  i += 2; // 跳过两个部分，因为已经组合处理了
                  continue;
                }
              }
            }
          }
        }
        
        console.log('[parseLineWithComma] 空格分割最终解析结果:', arr);
        if (arr.length) {
          return arr;
        }
      }

      // 逗号分隔
      line = line.replace(/[\u3002]+/g, ',');
      let segs = splitByCommaOutsideBrackets(line), arr = [];
      segs.forEach(seg => {
        let result = parseSegmentEndOfLine(seg);
        if (result) arr.push(result);
      });
      return arr;
    }
  
    // ============ E. 逐行处理 ============
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      if (/^备注[:：]/.test(line)) {
        if (orders.length) {
          let last = orders[orders.length - 1];
          last.nxDoRemark = (last.nxDoRemark || '') + ' ' + line.replace(/^备注[:：]/, '').trim();
        }
        return;
      }
  
      // 1) 序号格式
      let obj1 = parseLineWithSerial(line);
      if (obj1) {
        orders.push({
          ...obj1,
          nxDoAddRemark: !!obj1.nxDoRemark,
          nxDoStatus: -2,
          nxDoDepartmentId: this.data.depId,
          nxDoDepartmentFatherId: this.data.depFatherId,
          nxDoDisGoodsId: null,
          nxDoStandardWarn: 0,
          goodsNameWarn: 0,
          nxDoDistributerId: this.data.disId,
          nxDoPurchaseUserId: -1,
          rawText: line,
          nxDoOrderUserId: this.data.userId,
          nxDoIsAgent: 1,
        });
        return;
      }
  
      // 2) 冒号替换为空格
      if (/^(.*?)[:：](.+)$/.test(line)) {
        console.log('[formatOrderContent] 检测到冒号，替换为空格');
        line = line.replace(/^(.+?)[:：](.+)$/, '$1 $2');
        console.log('[formatOrderContent] 冒号替换后:', line);
      }
  
      // 3) 逗号分隔
      
      let arr2 = parseLineWithComma(line);
      console.log('[formatOrderContent] parseLineWithComma 返回结果:', arr2);
      if (arr2 && arr2.length) {
        console.log('[formatOrderContent] 逗号分隔匹配成功:', arr2);
        arr2.forEach(i => {
          if (i && i.nxDoGoodsName) {
            orders.push({
              ...i,
              nxDoAddRemark: !!i.nxDoRemark,
              nxDoStatus: -2,
              nxDoDepartmentId: this.data.depId,
              nxDoDepartmentFatherId: this.data.depFatherId,
              nxDoDisGoodsId: null,
              nxDoStandardWarn: 0,
              goodsNameWarn: 0,
              nxDoDistributerId: this.data.disId,
              nxDoPurchaseUserId: -1,
              rawText: line,
              nxDoOrderUserId: this.data.userId,
              nxDoIsAgent: 1,
            });
          }
        });
        return;
      }
  
      // 4) 空格分隔（兜底）
      let parts = line.split(/\s+/);
      parts.forEach(item => {
        let mm = item.match(/^(.+?)(\d+)(.+)$/);
        if (mm) {
          orders.push({
            nxDoGoodsName: mm[1].trim(),
            nxDoQuantity:  mm[2].trim(),
            nxDoStandard:  mm[3].trim(),
            nxDoRemark:    '',
            nxDoAddRemark: false,
            nxDoStatus: -2,
            nxDoDepartmentId: this.data.depId,
            nxDoDepartmentFatherId: this.data.depFatherId,
            nxDoDisGoodsId: null,
            nxDoStandardWarn: 0,
            goodsNameWarn: 0,
            nxDoDistributerId: this.data.disId,
            nxDoPurchaseUserId: -1,
            rawText: line,
            nxDoOrderUserId: this.data.userId,
            nxDoIsAgent: 1,
          });
        }
      });
    });
  
    // ============ F. 初次写入 ============
    this.setData({ orderArr: orders });
  
    // ============ F2. 异常重解析 ============
    function reparseSingleOrder(raw) {
      raw = raw.replace(/\s+/g, '');
      console.log('[重解析] 原始文本:', raw);
      let m = raw.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(斤|把|包|件|个|捆|棵|条|盒|袋|跟|根|块|瓶|罐|桶|箱)?(.*)?$/);
      console.log('[重解析] 正则匹配结果:', m);
      if (!m) return null;
      return {
        nxDoGoodsName: m[1].trim(),
        nxDoQuantity:  m[2].trim(),
        nxDoStandard:  m[3] ? m[3].trim() : '',
        nxDoRemark:    m[4] ? m[4].trim() : ''
      };
    }
    orders.forEach((order, idx) => {
      const validName     = /[\u4e00-\u9fa5]/.test(order.nxDoGoodsName);
      const validQty      = Number(order.nxDoQuantity) > 0;
      const validStandard = /[\u4e00-\u9fa5]/.test(order.nxDoStandard);
      if (!validName || !validQty || !validStandard) {
        let rep = reparseSingleOrder(order.rawText);
        if (rep) {
          orders[idx] = {
            ...order,
            ...rep,
            nxDoAddRemark: !!rep.nxDoRemark
          };
        }
      }
    });
  
    // ============ F3. 最终新增 nxDoAddRemark 字段（保险） ============
    orders = orders.map(o => ({
      ...o,
      nxDoAddRemark: !!o.nxDoRemark
    }));
  
    // ============ G. 最终写入 ============
    this.setData({ orderArr: orders });
  
    // ============ H. 可选：返回预览字符串 ============
    const formatted = orders.map(o => {
      let str = `${o.nxDoGoodsName}${o.nxDoQuantity}${o.nxDoStandard}`;
      if (o.nxDoRemark) str += `（${o.nxDoRemark}）`;
      return str;
    }).join('\n');
    return { orders, formatted };
  }
,  
 

  //修改预览订单内容
  editOrder(e) {
    
    var type = e.currentTarget.dataset.type;
    var index = e.currentTarget.dataset.index;
   
    if (e.detail.value.length > 0) {

      this.setData({
        orderArrIndex: index,

      })
      if (type == "name") {
        var data = "orderArr[" + index + "].nxDoGoodsName";
        this.setData({
         
          [data]: e.detail.value,
        })
      }
      if (type == "quantity") {
        console.log("quannaididi", e.detail.value);
        var data = "orderArr[" + index + "].nxDoQuantity";
        this.setData({
          [data]: e.detail.value,
        })
      }
      if (type == "standard") {
        var data = "orderArr[" + index + "].nxDoStandard";
        this.setData({
          [data]: e.detail.value,
        })
      }

    }
    if (type == "remark") {
      var data = "orderArr[" + index + "].nxDoRemark";
      if (e.detail.value.length > 0) {
        this.setData({
          [data]: e.detail.value,
        })
      }
       else {
        var dataAdd = "orderArr[" + index + "].nxDoAddRemark";
        this.setData({
          [data]: "",
          [dataAdd]: false
        })
      }

    }
   

  },


  
  //保存预览订单
  depPasteSearchGoods() {
    var canSave = this._checkOrderContent();
    if (canSave) {
      load.showLoading("识别商品中");
      depPasteSearchGoods(this.data.orderArr).then(res => {
        if (res.result.code == 0) {
          console.log(res.result.data);
          wx.setStorageSync('needRefreshOrderData', true);

          var tempArr = res.result.data;
          this.setData({
            strArr: [],
            saveCount: null,
          })
          var listArr = [];
          if (tempArr.length > 0) {
            var haveId = 0;
            for (var i = 0; i < tempArr.length; i++) {
              var id = tempArr[i].nxDoStatus;
              if (id !== -2) {
                haveId = Number(haveId) + Number(1);
              }
              var item = tempArr[i];
              item.nxDoStandardWarn = 0;
              listArr.push(item);
            }
            this.setData({
              todayCount: this.data.orderArr.length,
              saveCount: haveId,
              orderArr: listArr,
            })
          }
        
        
        }
        load.hideLoading();
        wx.showToast({
          title: res.msg,
          icon: 'none'
        })
      })
    }
  },


  _checkOrderContent() {
    var arr = this.data.orderArr;
    var canSave = true;
    var that = this;
    for (var i = 0; i < arr.length; i++) {
      var order = arr[i];
      var name = order.nxDoGoodsName;
      var standard = order.nxDoStandard;
      var quantity = order.nxDoQuantity;
      var standarWarn = order.nxDoStandardWarn;
      
      if (standard.length > 1 && standarWarn == 0) {
        canSave = false;
        wx.showModal({
          title: '检查 "单位"是否正确',
          content: standard,
          showCancel: true,
          cancelText: "确定正确",
          cancelColor: 'black',
          confirmText: "修改单位",
          confirmColor: '#147062',
          complete: function (res) {
            if (res.cancel) {
              var data = "orderArr[" + i + "].nxDoStandardWarn";
              that.setData({
                [data]: 1
              })
            }
            if (res.confirm) {
              that.setData({
                editApply: true,
                applyItem: order,
                showOrder: true,
                applyStandardName: order.nxDoStandard,
                itemDis: order.nxDistributerGoodsEntity,
                applyNumber: order.nxDoQuantity,
                applyRemark: order.nxDoRemark,
              })
            }
          }
        })
        break;
      } else {
        if (name.length > 0 && standard.length > 0 && quantity.length > 0 && Number(quantity) > 0) {
          if (standarWarn > 0) {
            canSave = true;
          }
        } else {
          wx.showModal({
            title: '订单是否缺少内容?',
            content: name + " " + quantity + " " + standard,
            showCancel: false,
            confirmText: "知道了",
          })
          canSave = false;
          break;
        }
      }
    }
    return canSave;
  },


  // 

  getCustomerName(e){
    var index = e.currentTarget.dataset.index;
    console.log(index);
    if(this.data.customerName == null){
      this.setData({
        customerName:  this.data.orderArr[index].nxDoGoodsName,
      })
     }
  },

  editOrderName(e) {
    var index = e.currentTarget.dataset.index;
  
    this.setData({
      orderArrIndex: index,
      goodsName: e.detail.value,
    })
    if (this.data.saveCount !== null) {
   
      this.getSearchString(e);
    }
  },


  _checkOrderItemContent(order, i) {
    var that = this;
    var canSave = true;
    var name = order.nxDoGoodsName;
    var standard = order.nxDoStandard;
    var quantity = order.nxDoQuantity;
    var standarWarn = order.nxDoStandardWarn;
    console.log(standard.length);
    console.log("consstandandnlelelengngnngngngn")
    if (standard.length > 2 && standarWarn == 0) {

      wx.showModal({
        title: '单位是否正确?',
        content: name + " " + quantity + " " + standard,
        showCancel: true, //是否显示取消按钮-----》false去掉取消按钮
        cancelText: "确定正确", //默认是"取消"
        cancelColor: 'black', //取消文字的颜色
        confirmText: "修改单位", //默认是"确定"
        confirmColor: '#147062', //确定文字的颜色
        success: function (res) {
          if (res.cancel) {
            //点击取消
            console.log("您点击了取消i", i)
            var data = "orderArr[" + i + "].nxDoStandardWarn";
            that.setData({
              [data]: 1
            })
            that._choiceGoods();
          } else if (res.confirm) {
            //点击确定
            console.log("您点击了确定")
          }
        }

        // complete: (res) => {
        //   if (res.confirm) {
        //     var data = "orderArr[" + i + "].nxDoStandardWarn";
        //     this.setData({
        //       [data]: 1
        //     })
        //   }
        // }
      })
      canSave = false;
      return canSave;


    } else {
      if (name.length > 0 && standard.length > 0 && Number(quantity) > 0) {
        if (standarWarn > 0) {

          canSave = true;
        }
      } else {
        // i = arr.length - 1;
        // console.log("rong", i);
        wx.showModal({
          title: '订单是否缺少内容?',
          content: name + " " + quantity + " " + standard,
          showCancel: false,
          confirmText: "知道了", //默认是"确定"

        })
        canSave = false;
      }
    }
    console.log("rerereerrcanSave===================", canSave)
    return canSave;
  },


  saveOrder(e) {
    this.setData({
      orderArrIndex: e.currentTarget.dataset.index,
      goodsId: e.currentTarget.dataset.id,
      customerName: e.currentTarget.dataset.name
    })

    this._choiceGoods();

  },

  closeStr(){
    this.setData({
      strArr: [],
      orderArrIndex: -1,
    })
  },

  

  _choiceGoods() {
    var index = this.data.orderArrIndex;
    var order = this.data.orderArr[index];
    var canSave = this._checkOrderItemContent(order, index);
    if (canSave) {
      order.nxDoDisGoodsId = this.data.goodsId;

      console.log(order);
      load.showLoading("保存订单中")
      choiceGoodsForApply(order).then(res => {
        if (res.result.code == 0) {
          // 设置刷新标记，确保返回时刷新订单数据
          wx.setStorageSync('needRefreshOrderData', true);
          
          load.hideLoading();
          console.log(res.result.data);
          var data = "orderArr[" + index + "]";
          this.setData({
            [data]: res.result.data,
            saveOrder: false,
            findGoods: false,
            strArr: [],
          })
        }
      })
    }
  },



  addDisAlias(e) {
    console.log(e);
    var standard = this.data.orderArr[e.currentTarget.dataset.index].nxDoStandard;
    var name = this.data.orderArr[e.currentTarget.dataset.index].nxDoGoodsName;
    this.setData({
      orderArrIndex: e.currentTarget.dataset.index,
      customerName: name,

    })
   
    wx.navigateTo({
      url: '../disAddGoodsLinshi/disAddGoodsLinshi?goodsName=' + name + '&from=paste' + '&standard=' + standard ,
    })
  },


  showPasteOperation(e) {
    this.setData({
      orderPasteIndex: e.currentTarget.dataset.index,
      showOperationPaste: true,
      orderItem: this.data.orderArr[e.currentTarget.dataset.index],
    })
  },


  addRemark() {
    var index = this.data.orderPasteIndex;
   
    var data = "orderArr[" + index + "].nxDoAddRemark";
    this.setData({
      [data]: true,
      showOperationPaste: false
    })

  },

  addNewPasteOrderBefore() {

    var index = this.data.orderPasteIndex;
    var arr = this.data.orderArr;
    var data = {
      nxDoStatus: -2,
      nxDoDepartmentId: this.data.depId,
      nxDoDepartmentFatherId: this.data.depFatherId,
      nxDoDisGoodsId: null,
      nxDoStandardWarn: 0,
      goodsNameWarn: 0,
      nxDoDistributerId: this.data.disId,
      nxDoPurchaseUserId: -1,
      nxDoIsAgent: 1,
    }
    // 方法1
    const newArr1 = [...arr];
    newArr1.splice(index, 0, data);
    console.log(newArr1.length);
    this.setData({
      orderArr: newArr1,
      showOperationPaste: false,
    })
  },


  //删除预览订单
  delOrder() {
    var index = this.data.orderPasteIndex;
    var arr = this.data.orderArr;
    arr.splice(index, 1);
    console.log(arr.length);
    this.setData({
      orderArr: arr,
      showOperationPaste: false,
    })

  },



  showOperation(e) {
    this.setData({
      orderArrIndex: e.currentTarget.dataset.index,
      showOperation: true,
      applyItem: this.data.orderArr[e.currentTarget.dataset.index],
    })
  },

  hideMask() {
    this.setData({
      showOperation: false,
      showOperationPaste: false
    })
  },


  //根据修商品名称，搜索商品
  getSearchString(e) {
    if (e.detail.value.length > 0) {
      var data = {
        disId: this.data.disId,
        searchStr: e.detail.value,
        depId: this.data.depId,
      }
      this.setData({
        searchStr: e.detail.value,
      })
      load.showLoading("搜索商品中")
      queryDepDisGoodsByQuickSearch(data).then(res => {
        console.log(res.result.data);
        load.hideLoading();
        if (res.result.data.dis.length > 0) {
          this.setData({
            strArr: res.result.data.dis,
            count: res.result.data.dis.length,
          })

        } 
       
      })
    } else {
      this.setData({
        searchArr: [],
        isSearching: false,
        searchStr: "",
      })
    }

  },


  /**
   * 下载收藏商品
   * @param {*} e 
   */
  downLoadGoods: function (e) {
    this.setData({
      item: e.currentTarget.dataset.item,
    })
    var dg = {
      nxDgDistributerId: this.data.disId,
      nxDgNxGoodsId: this.data.item.nxGoodsId,
      nxDgGoodsName: this.data.item.nxGoodsName,
      nxDgNxFatherId: this.data.fatherId,
      nxDgNxFatherImg: this.data.fatherImg,
      nxDgNxFatherName: this.data.fatherName,
      nxDgGoodsDetail: this.data.item.nxGoodsDetail,
      nxDgGoodsPlace: this.data.item.nxGoodsPlace,
      nxDgGoodsBrand: this.data.item.nxGoodsBrand,
      nxDgGoodsStandardname: this.data.item.nxGoodsStandardname,
      nxDgGoodsStandardWeight: this.data.item.nxGoodsStandardWeight,
      nxDgGoodsPinyin: this.data.item.nxGoodsPinyin,
      nxDgGoodsPy: this.data.item.nxGoodsPy,
      nxDgPullOff: 0,
      nxDgGoodsStatus: 0,
      nxDgPurchaseAuto: this.data.purchaseAuto,
      nxDgNxGoodsFatherColor: this.data.color,
      nxStandardEntities: this.data.item.nxGoodsStandardEntities,
      nxAliasEntities: this.data.item.nxAliasEntities,
      nxDgPurchaseAuto: 1,
    };

    load.showLoading("保存商品")
    downDisGoods(dg)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            showType: 0,
          })
          this._againSearchString();

        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },

  downLoadGoodsNx: function (e) {
    var that = this;
    this.setData({
      item: e.currentTarget.dataset.item,
      orderArrIndex: e.currentTarget.dataset.index,
    })
    var dg = {
      nxDgDistributerId: this.data.disId,
      nxDgNxGoodsId: this.data.item.nxGoodsId,
      nxDgGoodsName: this.data.item.nxGoodsName,
      nxDgNxFatherId: this.data.fatherId,
      nxDgNxFatherImg: this.data.fatherImg,
      nxDgNxFatherName: this.data.fatherName,
      nxDgGoodsDetail: this.data.item.nxGoodsDetail,
      nxDgGoodsPlace: this.data.item.nxGoodsPlace,
      nxDgGoodsBrand: this.data.item.nxGoodsBrand,
      nxDgGoodsStandardname: this.data.item.nxGoodsStandardname,
      nxDgGoodsStandardWeight: this.data.item.nxGoodsStandardWeight,
      nxDgGoodsPinyin: this.data.item.nxGoodsPinyin,
      nxDgGoodsPy: this.data.item.nxGoodsPy,
      nxDgPullOff: 0,
      nxDgGoodsStatus: 0,
      nxDgPurchaseAuto: this.data.purchaseAuto,
      nxDgNxGoodsFatherColor: this.data.color,
      nxStandardEntities: this.data.item.nxGoodsStandardEntities,
      nxAliasEntities: this.data.item.nxAliasEntities,
      nxDgPurchaseAuto: 1,
    };

    load.showLoading("保存商品")
    downDisGoods(dg)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          that.setData({
            goodsId: res.result.data.nxDistributerGoodsId,
            name: res.result.data.nxDgGoodsName,
          })
          that._choiceGoods()

        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },

  _againSearchString(e) {

    var data = {
      disId: this.data.disId,
      searchStr: this.data.searchStr,
      depId: this.data.depId,
    }

    queryDisGoodsByQuickSearchWithDepId(data).then(res => {
      console.log(res)
      if (res.result.code == 0) {
        if (res.result.data.nxArr == -1) {
          this.setData({
            strArr: res.result.data.disArr,
            nxArr: [],
          })

        } else {
          if (res.result.data.nxArr !== -1) {
            this.setData({
              nxArr: res.result.data.nxArr,
              strArr: [],
            })
          } else {
            this.setData({
              strArr: [],
              nxArr: []
            })
          }

        }
      }
    })

  },



  confirm: function (e) {

    this._updateDisOrder(e);

    this.setData({
      showOrder: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      showMyIndependent: false,
    })
  },



  /**
   * 换订货单位
   * @param {}} e 
   */
  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName
    })
  },


  cancle() {
    console.log("cancle....")
    this.setData({
      item: "",
      applyStandardName: "",
      showOrder: false,
      applyItem: "",
      applyNumber: "",
      depStandardArr: [],

    })

    if (this.data.isSearching) {
      this.setData({
        isSearching: false,
        searchStr: ""
      })
    }
  },


  confirmStandard(e) {
    console.log(e);

    var data = {
      nxDsDisGoodsId: this.data.itemDis.nxDistributerGoodsId,
      nxDsStandardName: e.detail.newStandardName,
    }
    disSaveStandard(data).
    then(res => {
      if (res.result.code == 0) {
        console.log(res)
        var standardArr = this.data.itemDis.nxDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "itemDis.nxDistributerStandardEntities"
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.nxDsStandardName,
        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },




  /**
   * 修改配送商品申请
   */
  editApply() {
    var applyItem = this.data.applyItem;
    this.setData({
      showOrder: true,
      editApply: true,
      applyStandardName: applyItem.nxDoStandard,
      itemDis: this.data.applyItem.nxDistributerGoodsEntity,
      item: this.data.applyItem.nxDepartmentDisGoodsEntity,
      applyNumber: applyItem.nxDoQuantity,
      applyRemark: applyItem.nxDoRemark,
    })

    this.setData({
      showOperation: false
    })
  },


  /**
   * 修改配送申请
   * @param {} e 
   */
  _updateDisOrder(e) {

    var dg = {
      id: this.data.applyItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
    };
    updateOrder(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
        var goodsName = this.data.orderArr[this.data.orderArrIndex].nxDoGoodsName;
        var data = "orderArr[" + this.data.orderArrIndex + "]";
        var dataName = "orderArr[" + this.data.orderArrIndex + "].nxDoGoodsName";
        this.setData({
          [data]: res.result.data,
          [dataName]: goodsName,
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }

    })
  },



  addNewOrderBefore(e) {
    this.hideMask();

    wx.navigateTo({

      url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId +
        '&depId=' + this.data.depId + '&depName=' + this.data.depName +
        '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depInfo.nxDepartmentSettleType +
        '&beforeId=' + this.data.applyItem.nxDepartmentOrdersId
    })


  },


  delStandard(e) {
    console.log(e);
    this.setData({
      standardName: e.detail.standardName,
      show: false,
      delStandardShow: true,
      applyItem: "",
      disStandardId: e.detail.id,
    })

  },


  deleteStandard() {
    disDeleteStandard(this.data.disStandardId).then(res => {
      if (res.result.code == 0) {
        this.setData({
          standardName: "",
          delStandardShow: false,
          disStandardId: "",
        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },



  delApply() {

    var that = this;
    deleteOrder(this.data.applyItem.nxDepartmentOrdersId).then(res => {
      if (res.result.code == 0) {
        // var arr = this.data.orderArr.splice(this.data.orderArrIndex,1);
        var arr = that.data.orderArr;
        arr = arr.filter((_, index) => index !== that.data.orderArrIndex);
        that.setData({
          editApply: false,
          showOrder: false,
          applyItem: "",
          orderArr: arr,
        })

        that.updateStroageDelete();

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },




  toBack() {

  
    wx.navigateBack({
      delta: 1
    })

  },




  backBegin() {
    console.log('[backBegin] 触发，清空所有内容——hasAiRecognized:', this.data.hasAiRecognized);
    this.setData({
      inputContent: '',
      sentence: '',
      orderArr: [],
      orderArrFixed: [],
      hasAiRecognized: false,
      hasUsedExtraTime: false // 重置额外时间使用状态
    });
  },

  /**
   * 重新粘贴：解析完成后回到原始输入状态
   * 保留 originSentence（原始语音/粘贴内容），恢复到 inputContent 供用户修改
   */
  againPaste() {
    console.log('[againPaste] 触发——orderArr:', this.data.orderArr.length, 'hasAiRecognized:', this.data.hasAiRecognized, 'originSentence:', this.data.originSentence);
    const originalText = this.data.originSentence || this.data.inputContent || this.data.sentence || '';
    console.log('[againPaste] 还原文本:', originalText);
    this.setData({
      orderArr: [],
      orderArrFixed: [],
      sentence: originalText,
      inputContent: originalText,
      hasAiRecognized: false,
      saveCount: null,
      pasteDepList: null,
      pasteDepId: null,
      pasteDep: null,
      pasteDepIndex: -1,
      highlightedContent: ''
    });
  },

  toggleRecord() {
    console.log('[toggleRecord] called, isRecording:', this.data.isRecording);
    if (this.data.isRecording) {
      console.log('[toggleRecord] will call stopRecord');
      this.stopRecord();
    } else {
      console.log('[toggleRecord] will call startRecord');
      this.startRecord();
    }
  },

  // 关闭说明弹窗
  closeExplanationModal() {
    this.setData({
      showExplanationModal: false,
      explanationContent: ""
    });
  },

  // 确认说明弹窗
  confirmExplanationModal() {
    this.setData({
      showExplanationModal: false,
      explanationContent: ""
    });
  },

  


})