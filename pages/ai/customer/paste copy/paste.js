import load from '../../../../lib/load';
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


const globalData = getApp().globalData;
const plugin = requirePlugin("QCloudAIVoice");
const speechRecognizerManager = plugin.speechRecognizerManager();

// 添加 DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-ab54d76efc1e4d95a7ab2cdb3013a920'; // 需要替换为实际的 API key
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 添加优化语音文本的函数
async function optimizeTextWithDeepSeek(text, temperature) {
  try {
    console.log('开始调用 DeepSeek API，输入文本:', text);
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: DEEPSEEK_API_URL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        data: {
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `本场景为饭店/餐饮行业订货录单。所有输入内容都应优先理解为餐饮行业采购相关的商品（如生鲜、调料、餐具等），并结合行业常用词、同音词、近义词进行智能归类和纠正。

你是一个专业的订单文本优化助手。请将用户输入的文本转换为标准订单格式，要求：
1. 每行一个商品
2. 商品名称和数量用冒号分隔
3. 数量后面跟单位（斤、个、包、根、棵、条、盒、捆、袋等）
4. 去除无关内容
5. 保持商品名称的准确性
6. 支持"数字+商品名"格式，如"3香菜"应理解为"香菜:3斤"
7. 如果商品数量后没有单位，请自动补全"斤"作为单位
8. 如果商品名称后面没有明确的数量和单位，不要随意添加
9. 备注信息只和具体商品关联：如果备注内容在商品前面或后面（如"要新鲜的西红柿5斤"或"西红柿5斤要新鲜的"），请将其作为该商品的备注内容。
10. 如果备注内容是独立一句（没有和任何商品直接关联），请不要自动归为任何商品的备注。
11. 支持"备注+商品+数量"格式（如"小颗的油菜两斤"或"油菜小颗的两斤"），请将备注内容（如"小颗的"）作为该商品的备注。
12. 如果商品名称或规格中包含数字（如"1000圆餐盒"或"一千圆餐盒"），请优先将数字视为商品名称或规格的一部分，只有在数字紧跟在商品名称后、且后面有单位时，才将其视为数量。
13. 对于所有输入内容，都尽量理解为饭店采购相关的商品（如生鲜、调料、餐具等），不要简单过滤。
14. 如果遇到不常见的词汇或疑似地名、备注等，也请尝试用同音词、近义词或常见饭店采购商品进行智能纠正和归类。
15. 如果无法确定具体商品，也请尽量输出为最接近的生鲜、调料或餐具商品名。
16. 对于商品名称中的常见同音词或行业错别字要自动归一。例如：
    - "1000元餐盒"应理解为"1000圆餐盒"（"元"归一为"圆"，表示圆形）。
    - 其他类似行业常用错别字或同音词，也请自动归一为最常用的采购商品名称。
17. 如果商品名称中出现"各"字（如"红黄彩椒各"），请整体视为一个商品名，不要拆分为多个商品。

示例：
输入："红黄彩椒各2斤"
输出：
红黄彩椒各:2斤
输入："油菜小颗的两斤"
输出：
油菜:2斤（小颗的）
输入："一千圆餐盒 1 件"
输出：
一千圆餐盒:1件
输入："1000餐盒一件。西湖路。两根。要小的。"
输出：
1000餐盒:1件
西葫芦:2根（要小的）
`
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: temperature
        },
        success: (res) => {
          console.log('API 响应成功:', res);
          if (res.statusCode === 200 && res.data && res.data.choices && res.data.choices[0]) {
            const optimizedText = res.data.choices[0].message.content;
            console.log('优化后的文本:', optimizedText);
            resolve(optimizedText);
          } else {
            console.error('API 响应格式不正确:', res);
            reject(new Error('API 响应格式不正确'));
          }
        },
        fail: (err) => {
          console.error('API 请求失败:', err);
          reject(new Error('API 请求失败: ' + JSON.stringify(err)));
        }
      });
    });
  } catch (error) {
    console.error('DeepSeek API 调用错误:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      response: error.response
    });
    return text; // 如果 API 调用失败，返回原始文本
  }
}

// 商品名归一化函数
function normalizeGoodsName(name) {
  // 只替换商品名中的"元"为"圆"，可扩展更多规则
  return name.replace(/1000元/g, '1000圆').replace(/元餐盒/g, '圆餐盒');
  // 你也可以用更通用的规则，如 name.replace(/元/g, '圆')
}

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
    showDeepSeekLoading: false,
    hasAiRecognized: false,
    temperature: 0.7,
    aiRetryCount: 0,
    isRecording: false,
    // saveCount:"ddd",
    // orderArr:[
    //   {
    //     nxDoStandard : "aa",
    //     nxDoQuantity: 3,
    //     nxDoGoodsName: "二轻",
    //     nxDoStatus : -2
    //   }
    // ]
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
      // showDeepSeekLoading: true // 打开页面直接显示 loading
    })

    // // 3 秒后自动关闭 loading
    // setTimeout(() => {
    //   this.setData({ showDeepSeekLoading: false });
    // }, 10000);
 
    getBooks().then(res =>{
      if(res.result.code == 0){
       books = res.result.data;
      }
    })


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
        this.setData({
          sentence: res.result.voice_text_str,
        })
      }
    }

    speechRecognizerManager.OnSentenceEnd = (res) => {
      console.log('一句话结束', res)
    }

    speechRecognizerManager.OnRecognitionComplete = async (res) => {
      console.log('识别结束', res);
      this.setData({
        recognitionStatus: '识别完成',
        isRecording: false
      });

      try {
        // 获取识别到的文本
        const recognizedText = this.data.sentence;
        console.log('【语音识别原始文本】:', recognizedText);
        if (!recognizedText || recognizedText.trim() === '') {
          console.log('识别文本为空，跳过优化');
          return;
        }

        // DeepSeek 优化前日志
        console.log('【DeepSeek优化前】:', recognizedText);
        // 显示 DeepSeek loading 动画
        this.setData({ showDeepSeekLoading: true });
        // 调用 DeepSeek API 优化文本
        const optimizedText = await optimizeTextWithDeepSeek(recognizedText, this.data.temperature);
        // DeepSeek 优化后日志
        console.log('【DeepSeek优化后】:', optimizedText);
        // 隐藏 DeepSeek loading 动画
        this.setData({
          inputContent: optimizedText,
          sentence: optimizedText,
          originSentence: recognizedText, // 保存最初的录音文本
          showDeepSeekLoading: false
        });

      } catch (error) {
        // 隐藏 DeepSeek loading 动画（异常时也要隐藏）
        this.setData({ showDeepSeekLoading: false });
        console.error('处理语音识别结果时出错:', error);
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
      secretkey: 'YOUR_SECRET_KEY', // 请替换为实际的密钥
      secretid: 'YOUR_SECRET_ID', // 请替换为实际的ID
      appid: '1308821743',
      engine_model_type: '16k_zh',
      voice_format: 1
    };
  
    if (this.restSecondsTimer) clearInterval(this.restSecondsTimer);
    this.restSecondsTimer = setInterval(() => {
      if (that.data.restSeconds > 0) {
        that.setData({
          restSeconds: that.data.restSeconds - 1
        });
      } else {
        that.stopRecord();
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
        // that.formatContent();
      }
    });
    speechRecognizerManager.stop();
  },



  // 统一AI+本地解析处理
  async handleContentWithAI(content, temperature) {
    try {
      this.setData({ showDeepSeekLoading: true });
      const optimizedText = await optimizeTextWithDeepSeek(content, temperature || this.data.temperature);
      this.setData({
        inputContent: optimizedText,
        showDeepSeekLoading: false
      });
      const { orders, formatted } = this._formatOrderContent(optimizedText);
      this.setData({
        orderArr: orders,
        formattedContent: formatted
      });
    } catch (e) {
      this.setData({ showDeepSeekLoading: false });
      wx.showToast({ title: 'AI识别失败', icon: 'none' });
      console.error('handleContentWithAI error:', e);
    }
  },

  // 粘贴内容/按钮入口
  async formatContent() {
    const content = this.data.inputContent;
    if (!content || !content.trim()) {
      wx.showToast({ title: '内容为空', icon: 'none' });
      return;
    }
    // 只做本地格式化
    const { orders, formatted } = this._formatOrderContent(content);
    this.setData({
      orderArr: orders,
      formattedContent: formatted
    });
  },

  // 录音识别完成后调用
  async onRecordRecognizeFinish(originSentence) {
    if (!originSentence || !originSentence.trim()) {
      wx.showToast({ title: '录音内容为空', icon: 'none' });
      return;
    }
    await this.handleContentWithAI(originSentence);
  },



  

  clearSentence() {
    this.setData({
      inputContent: '',
      sentence: '',
      orderArr: [],
      orderArrFixed: [],
    });
  },

 
  onInput(e) {
    const text = e.detail.value;
    console.log('[onInput] textarea value:', text);
    this.setData({
      inputContent: text.trim() !== '' ? text : ''
    }, () => {
      console.log('[onInput] setData done, inputContent:', this.data.inputContent);
    });
  },
  

  async again() {
    const content = this.data.originSentence || this.data.inputContent;
    let temp = 1.5;
    let retry = this.data.aiRetryCount;

    if (!content || content.trim() === '') {
      wx.showToast({ title: '内容为空', icon: 'none' });
      return;
    }
    if (retry >= 1) {
      wx.showToast({ title: '已达最大尝试次数', icon: 'none' });
      return;
    }

    this.setData({ showDeepSeekLoading: true, temperature: temp, aiRetryCount: retry + 1 });
    try {
      const optimizedText = await optimizeTextWithDeepSeek(content, temp);
      this.setData({
        inputContent: optimizedText,
        sentence: optimizedText,
        showDeepSeekLoading: false,
        hasAiRecognized: true // 1次后显示"重新操作"按钮
      });
      this.formatContent();
    } catch (e) {
      this.setData({ showDeepSeekLoading: false });
      wx.showToast({ title: '识别失败', icon: 'none' });
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
  
        // 数量值
        if (/^[\d\.]+$/.test(potentialQty)) {
          qtyVal = potentialQty;
        } else {
          qtyVal = chineseNumberToArabic(potentialQty).toString();
        }
  
        // 单位列表
        const validUnits = ['斤','个','包','根','棵','条','盒','捆','袋','跟'];
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
      }
  
      return {
        nxDoGoodsName: name,
        nxDoQuantity:  qtyVal,
        nxDoStandard:  qtyUnit,
        nxDoRemark:    remarkText
      };
    }
  
    // ============ C. 序号格式解析 ============
    function parseLineWithSerial(line) {
      const match = line.match(/^(\d+)[、，\.．]\s*(.+?)[:：]\s*(.+)$/);
      if (!match) return null;
  
      let namePart = match[2].trim().replace(/\s+/g, '');
      let qtyPart  = match[3].trim().replace(/[\.。]+$/g, '').trim();
  
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
      // 先处理空格分隔优先
      if (/\s/.test(line)) {
        let parts = line.split(/\s+/), arr = [];
        
        // 新增：处理"商品名 数量 单位"三部分格式
        if (parts.length === 3) {
          let name = parts[0].trim();
          let quantity = parts[1].trim();
          let unit = parts[2].trim();
          
          // 验证数量是否为数字
          if (/^[\d一二两三四五六七八九十百千万半\.]+$/.test(quantity)) {
            let qtyVal = quantity;
            if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
              qtyVal = chineseNumberToArabic(quantity).toString();
            }
            
            arr.push({
              nxDoGoodsName: name,
              nxDoQuantity: qtyVal,
              nxDoStandard: unit,
              nxDoRemark: ''
            });
            
            if (arr.length) return arr;
          }
        }
        
        // 原有的单部分处理逻辑
        parts.forEach(item => {
          let mm = item.match(/^(.+?)(\d+)(.+)$/);
          if (mm) {
            arr.push({
              nxDoGoodsName: mm[1].trim(),
              nxDoQuantity:  mm[2].trim(),
              nxDoStandard:  mm[3].trim(),
              nxDoRemark:    ''
            });
          }
        });
        if (arr.length) return arr;
      }

      // 逗号分隔
      line = line.replace(/[\u3002]+/g, ',');
      let segs = splitByCommaOutsideBrackets(line), arr = [];
      segs.forEach(seg => {
        arr.push(parseSegmentEndOfLine(seg));
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
          nxDoIsAgent: -1,
          nxDoDepartmentId: this.data.depId,
          nxDoDepartmentFatherId: this.data.depFatherId,
          nxDoDisGoodsId: null,
          nxDoStandardWarn: 0,
          goodsNameWarn: 0,
          nxDoDistributerId: this.data.disId,
          nxDoPurchaseUserId: -1,
          rawText: line
        });
        return;
      }
  
      // 2) 冒号替换为空格
      if (/^(.*?)[:：](.+)$/.test(line)) {
        line = line.replace(/^(.+?)[:：](.+)$/, '$1 $2');
      }
  
      // 3) 逗号分隔
      let arr2 = parseLineWithComma(line);
      if (arr2 && arr2.length) {
        arr2.forEach(i => {
          orders.push({
            ...i,
            nxDoAddRemark: !!i.nxDoRemark,
            nxDoStatus: -2,
            nxDoIsAgent: -1,
            nxDoDepartmentId: this.data.depId,
            nxDoDepartmentFatherId: this.data.depFatherId,
            nxDoDisGoodsId: null,
            nxDoStandardWarn: 0,
            goodsNameWarn: 0,
            nxDoDistributerId: this.data.disId,
            nxDoPurchaseUserId: -1,
            rawText: line
          });
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
            nxDoIsAgent: -1,
            nxDoDepartmentId: this.data.depId,
            nxDoDepartmentFatherId: this.data.depFatherId,
            nxDoDisGoodsId: null,
            nxDoStandardWarn: 0,
            goodsNameWarn: 0,
            nxDoDistributerId: this.data.disId,
            nxDoPurchaseUserId: -1,
            rawText: line
          });
        }
      });
    });
  
    // ============ F. 初次写入 ============
    this.setData({ orderArr: orders });
  
    // ============ F2. 异常重解析 ============
    function reparseSingleOrder(raw) {
      raw = raw.replace(/\s+/g, '');
      let m = raw.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(斤|把|包|件|个|捆|棵|条|盒|袋|跟)?(.*)?$/);
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
    console.log('[formatOrderContent] formatted:', formatted);
    return { orders, formatted };
  }
,  
  // _formatOrderContent: function (content) {
  //   console.log('[formatOrderContent] 入参 content:', content);
  //   const orders = [];
  //   //   // 1. 按行拆分
  //   let lines = content.split(/\r?\n/);
  //   // 其他行(店名、地址、空行等)统统过滤掉
  //   console.log("linessss", lines);
  //   lines = lines.filter(line => {
  //     line = line.trim();
  //     if (!line) return false; // 跳过空行

  //     // 1) 保留"备注："行
  //     if (/^备注[:：]/.test(line)) {
  //       return true;
  //     }

  //     let orderRegex = /^\d+[、，\.．]\s*(.+?)[:：]\s*(.+)$/;
  //     if (orderRegex.test(line)) {
  //       return true;
  //     }


  //     let commaRegex = /^(.*?)\s*[\,，]\s*(.+)$/;
  //     if (commaRegex.test(line)) {
  //       return true;
  //     }

  //     // let hasNumber = /\d/.test(line);
  //     let hasNumber = /[\d零一二两三四五六七八九十百千万半]/.test(line);

  //     if (hasNumber) {
  //       return true;
  //     }
  //     // 其他行 => 不保留
  //     return false;
  //   });

  //   console.log("中文数字转阿拉伯数字中文数字转阿拉伯数字")

  //   // ============ A. 中文数字转阿拉伯数字 ============
  //   function chineseNumberToArabic(chineseNum) {
  //     const map = {
  //       '零': 0,
  //       '一': 1,
  //       '二': 2,
  //       '两': 2,
  //       '三': 3,
  //       '四': 4,
  //       '五': 5,
  //       '六': 6,
  //       '七': 7,
  //       '八': 8,
  //       '九': 9,
  //       '十': 10,
  //       '百': 100, // 如果你不希望"百"被识别为100，可删除这一行
  //       '千': 1000,
  //       '万': 10000,
  //       '半': 0.5
  //     };
  //     let result = 0,
  //       temp = 0;

  //     for (let i = 0; i < chineseNum.length; i++) {
  //       const char = chineseNum[i];
  //       if (char === '半') {
  //         result += 0.5;
  //       } else if (map[char] >= 10) {
  //         // 遇到"十"、"百"、"千"..."表示倍数
  //         if (temp === 0) temp = 1;
  //         result += temp * map[char];
  //         temp = 0;
  //       } else if (map[char] !== undefined) {
  //         // 累加数字
  //         temp = temp * 10 + map[char];
  //       }
  //     }
  //     result += temp;
  //     console.log("resss", result)
  //     return result;
  //   }

  //   // ============ B. 末尾解析：提取"名称 + 括号备注 + (数字+单位)" ============
  //   function parseSegmentEndOfLine(segment) {
  //     // 去除尾部逗号、句号等
  //     segment = segment.trim().replace(/[,，、。.]+$/g, '');

  //     // 先尝试提取括号内的备注
  //     const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
  //     let remarkText = '';
  //     const bracketMatch = segment.match(bracketRegex);
  //     if (bracketMatch) {
  //       remarkText = bracketMatch[1];
  //       segment = segment.replace(bracketRegex, '').trim();
  //     }

  //     // 检测是否含有阿拉伯数字
  //     const hasArabicAll = /[0-9]/.test(segment);

  //     // 初始化
  //     let name = segment;
  //     let quantityValue = '';
  //     let quantityUnit = '';
  //     let regex;

  //     // 这里的正则把商品名称、数量和单位（可能包含后续形容词）分开
  //     if (hasArabicAll) {
  //       // 如果是包含阿拉伯数字的商品名称和数量
  //       regex = new RegExp('^(.*?)([\\d\\.]+)(\\S*)$'); // 捕获商品名称、数字和单位
  //     } else {
  //       regex = new RegExp('^(.*?)([一二两三四五六七八九十百千万半]+)(\\S*)$'); // 中文数字
  //     }
  //     const match = segment.match(regex);
  //     if (match) {
  //       const potentialName = match[1].trim().replace(/\s+/g, '');
  //       const potentialQty = match[2].trim();
  //       let potentialUnit = match[3].trim(); // 可能包含单位和形容词
  //       name = potentialName;

  //       // 检查商品名称是否在 books 词库中
  //       let foundName = '';
  //       books.forEach(item => {
  //         if (potentialName.includes(item)) {
  //           foundName = item;  // 找到完整的商品名称
  //         }
  //       });

  //       if (foundName) {
  //         name = foundName;
  //       }

  //       // 数量转换：如果是纯数字则直接，否则转换中文数字
  //       if (/^[\d\.]+$/.test(potentialQty)) {
  //         quantityValue = potentialQty;
  //       } else {
  //         quantityValue = chineseNumberToArabic(potentialQty).toString();
  //       }

  //       // 预定义合法的规格单位列表
  //       const validUnits = ['斤', '个', '包', '根', '棵', '条', '盒', '捆', '袋'];
  //       let foundUnit = '';
  //       for (let i = 0; i < validUnits.length; i++) {
  //         const u = validUnits[i];
  //         if (potentialUnit.startsWith(u)) {
  //           foundUnit = u;
  //           break;
  //         }
  //       }

  //       if (foundUnit) {
  //         quantityUnit = foundUnit;
  //         // 如果该单位后面还有其他文字，就视为备注补充
  //         const extra = potentialUnit.substring(foundUnit.length).trim();
  //         if (extra) {
  //           remarkText = remarkText ? (remarkText + ' ' + extra) : extra;
  //         }
  //       } else {
  //         // 如果没匹配到合法单位，则全部作为单位（备注为空或后续可进一步处理）
  //         quantityUnit = potentialUnit;
  //       }
  //     }

  //     return {
  //       nxDoGoodsName: name,
  //       nxDoQuantity: quantityValue,
  //       nxDoStandard: quantityUnit,
  //       nxDoRemark: remarkText
  //     };
  //   }

  //   // ============ C. 序号格式解析 (如 "1、丝瓜：5斤") ============
  //   function parseLineWithSerial(line) {
  //     // 正则：^\d+[、，\.．]\s*(.+?)[:：]\s*(.+)$
  //     const match = line.match(/^(\d+)[、，\.．]\s*(.+?)[:：]\s*(.+)$/);
  //     if (!match) return null; // 不匹配 => 返回 null
  //     console.log("parseLineWithSerialparseLineWithSerial")
  //     // 捕获
  //     const itemNamePart = match[2].trim().replace(/\s+/g, '');
  //     let quantityPart = match[3].trim();

  //     // 去除末尾多余标点，如句号/多句号
  //     quantityPart = quantityPart.replace(/[\.。]+$/g, '').trim();

  //     // 从商品名称中提取括号备注
  //     const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
  //     let name = itemNamePart;
  //     let remarkText = '';
  //     const bracketMatch = name.match(bracketRegex);
  //     if (bracketMatch) {
  //       remarkText = bracketMatch[1];
  //       name = name.replace(bracketRegex, '').trim();
  //     }

  //     // 匹配数量+单位
  //     const qMatch = quantityPart.match(/^([\d一二三四五六七八九十百千万半\.]+)\s*(\S*)$/);
  //     let quantityValue = '',
  //       quantityUnit = '';
  //     if (qMatch) {
  //       quantityValue = qMatch[1];
  //       quantityUnit = qMatch[2];
  //     } else {
  //       quantityValue = quantityPart;
  //     }

  //     // 如果含中文数字
  //     if (/[零一二两三四五六七八九十百千万半]/.test(quantityValue)) {
  //       quantityValue = chineseNumberToArabic(quantityValue).toString();
  //     }

  //     // 如果单位是 "两"/"量"，转成斤
  //     if (quantityUnit === '两' || quantityUnit === '量') {
  //       let val = parseFloat(quantityValue) / 10;
  //       val = parseFloat(val.toFixed(1));
  //       quantityValue = String(val);
  //       quantityUnit = '斤';
  //     }

  //     // 构造并返回一个商品对象
  //     return {
  //       nxDoGoodsName: name,
  //       nxDoQuantity: quantityValue,
  //       nxDoStandard: quantityUnit,
  //       nxDoRemark: remarkText
  //     };
  //   }

  //   // ============ D. 逗号分隔(只在括号外拆分) ============
  //   function splitByCommaOutsideBrackets(str) {
  //     let results = [];
  //     let bracketDepth = 0;
  //     let current = '';
  //     for (let i = 0; i < str.length; i++) {
  //       let c = str[i];
  //       if (c === '（' || c === '(' || c === '【') {
  //         bracketDepth++;
  //         current += c;
  //       } else if (c === '）' || c === ')' || c === '】') {
  //         bracketDepth = Math.max(0, bracketDepth - 1);
  //         current += c;
  //       } else if ((c === ',' || c === '，') && bracketDepth === 0) {
  //         if (current.trim()) results.push(current.trim());
  //         current = '';
  //       } else if ((c === ',' || c === '、') && bracketDepth === 0) {
  //         if (current.trim()) results.push(current.trim());
  //         current = '';
  //       } else {
  //         current += c;
  //       }
  //     }
  //     if (current.trim()) results.push(current.trim());
  //     return results;
  //   }


  //   function parseLineWithComma(line) {
  //     console.log("parseLineWithComma 处理行:", line);
      
  //     // 如果包含空格，先按空格分割
  //     if (line.includes(' ')) {
  //       console.log("检测到空格分隔，进行分割");
  //       let items = line.split(/\s+/);
  //       console.log("分割后的商品:", items);
        
  //       let result = [];
  //       items.forEach(item => {
  //         // 处理每个商品
  //         let match = item.match(/^(.+?)(\d+)(.+)$/);
  //         if (match) {
  //           let name = match[1].trim().replace(/\s+/g, '');
  //           let quantity = match[2].trim();
  //           let unit = match[3].trim();
            
  //           console.log("商品解析:", {
  //             name: name,
  //             quantity: quantity,
  //             unit: unit
  //           });
            
  //           result.push({
  //             nxDoGoodsName: name,
  //             nxDoQuantity: quantity,
  //             nxDoStandard: unit,
  //             nxDoRemark: ""
  //           });
  //         }
  //       });
        
  //       if (result.length > 0) {
  //         console.log("解析结果:", result);
  //         return result;
  //       }
  //     }

  //     // 原有的逗号分隔处理逻辑
  //     console.log("尝试逗号分隔处理");
  //     line = line.replace(/[\u3002]+/g, ',');
  //     let segments = line.split(/[,\，]/);
  //     console.log("逗号分隔结果:", segments);
      
  //     if (segments.length === 2) {
  //       let namePart = segments[0].trim();
  //       let quantityPart = segments[1].trim();
  //       console.log("处理单个商品:", {namePart, quantityPart});
        
  //       let foundName = '';
  //       books.forEach(item => {
  //         if (namePart.includes(item)) {
  //           foundName = item;
  //         }
  //       });
        
  //       if (foundName) {
  //         return [buildOneItem(foundName, quantityPart)];
  //       }
  //       return [buildOneItem(namePart, quantityPart)];
  //     } else {
  //       let segments = splitByCommaOutsideBrackets(line);
  //       console.log("括号外逗号分隔结果:", segments);

  //       let items = [];
  //       segments.forEach(segment => {
  //         let obj = parseSegmentEndOfLine(segment);
  //         items.push(obj);
  //       });
  //       return items;
  //     }
  //   }


  //   function buildOneItem(namePart, quantityPart) {
  //     // （A）名称 = namePart
  //     let goodsName = namePart.trim();
  //     let quantityValue = "";
  //     let quantityUnit = "";

  //     let match = quantityPart.match(/^([\d\.]+)(\S*)$/);
  //     if (match) {
  //       quantityValue = match[1].trim(); // 例如 "4"
  //       quantityUnit = match[2].trim(); // 例如 "斤"
  //     } else {

  //       quantityValue = "0";
  //       quantityUnit = quantityPart;
  //     }

  //     // （C）构造返回对象——根据你项目需要
  //     let item = {
  //       nxDoGoodsName: goodsName,
  //       nxDoQuantity: quantityValue,
  //       nxDoStandard: quantityUnit,
  //       nxDoRemark: "",
  //       // 其他字段，比如：nxDoStatus: -2, nxDoDepartmentId: ...
  //     };

  //     return item;
  //   }

  //   // ============ E. 逐行处理 ============

  //   lines.forEach(line => {
  //     console.log("处理行:", line);
  //     line = line.trim();
  //     if (!line) return; // 跳过空行

  //     // 1) 行首是 "备注：xxx" => 拼到上一条商品
  //     if (/^备注[:：]/.test(line)) {
  //       if (orders.length > 0) {
  //         let r = line.replace(/^备注[:：]/, '').trim();
  //         let oldRemark = orders[orders.length - 1].nxDoRemark || '';
  //         orders[orders.length - 1].nxDoRemark = oldRemark ?
  //           (oldRemark + ' ' + r) :
  //           r;
  //       }
  //       return;
  //     }

  //     // 2) 先尝试"序号格式"
  //     let itemObj = parseLineWithSerial(line);
  //     if (itemObj) {
  //       console.log("序号格式匹配成功:", itemObj);
  //       orders.push({
  //         ...itemObj,
  //         nxDoStatus: -2,
  //         nxDoIsAgent: -1,
  //         nxDoDepartmentId: this.data.depId,
  //         nxDoDepartmentFatherId: this.data.depFatherId,
  //         nxDoDisGoodsId: null,
  //         nxDoStandardWarn: 0,
  //         goodsNameWarn: 0,
  //         nxDoDistributerId: this.data.disId,
  //         nxDoPurchaseUserId: -1,
  //         rawText: line
  //       });
  //       return;
  //     }

  //     // 3) 如果序号格式不匹配，再判断是否包含冒号，并做冒号替换
  //     if (/^(.*?)[:：](.+)$/.test(line)) {
  //       line = line.replace(/^(.+?)[:：](.+)$/, '$1 $2');
  //     }

  //     // 4) 如果没匹配到序号 => 尝试"逗号分隔"
  //     let itemsByComma = parseLineWithComma(line);
  //     if (itemsByComma && itemsByComma.length) {
  //       console.log("逗号分隔匹配成功:", itemsByComma);
  //       itemsByComma.forEach(i => {
  //         orders.push({
  //           ...i,
  //           nxDoStatus: -2,
  //           nxDoIsAgent: -1,
  //           nxDoDepartmentId: this.data.depId,
  //           nxDoDepartmentFatherId: this.data.depFatherId,
  //           nxDoDisGoodsId: null,
  //           nxDoStandardWarn: 0,
  //           goodsNameWarn: 0,
  //           nxDoDistributerId: this.data.disId,
  //           nxDoPurchaseUserId: -1,
  //           rawText: line
  //         });
  //       });
  //       return;
  //     }

  //     // 5) 新增：尝试空格分隔格式（如"生菜12斤 韭菜4斤"）
  //     // 先按空格分割成多个商品
  //     let items = line.split(/\s+/);
  //     console.log("空格分割后的商品:", items);
      
  //     // 处理每个商品
  //     items.forEach(item => {
  //       console.log("处理单个商品:", item);
  //       let spaceMatch = item.match(/^(.+?)(\d+)(.+)$/);
  //       if (spaceMatch) {
  //         let name = spaceMatch[1].trim();
  //         let quantity = spaceMatch[2].trim();
  //         let unit = spaceMatch[3].trim();
          
  //         console.log("商品解析结果:", {
  //           name: name,
  //           quantity: quantity,
  //           unit: unit
  //         });
          
  //         orders.push({
  //           nxDoGoodsName: name,
  //           nxDoQuantity: quantity,
  //           nxDoStandard: unit,
  //           nxDoPrintName: unit,
  //           nxDoRemark: "",
  //           nxDoStatus: -2,
  //           nxDoIsAgent:-1,
  //           nxDoDepartmentId: this.data.depId,
  //           nxDoDepartmentFatherId: this.data.depFatherId,
  //           nxDoDisGoodsId: null,
  //           nxDoStandardWarn: 0,
  //           goodsNameWarn: 0,
  //           nxDoDistributerId: this.data.disId,
  //           nxDoPurchaseUserId: -1,
  //           rawText: line
  //         });
  //       } else {
  //         console.log("商品格式不匹配:", item);
  //       }
  //     });
  //     return;

  //   });

  //   // ============ F. 保存结果到 this.data.orderArr ============
  //   this.setData({
  //     orderArr: orders
  //   });

  //   // ============ F2. 异常订单自动重解析 ============
  //   // 主正则
  //   function reparseSingleOrder(rawText) {
  //     // 先去除所有空格
  //     rawText = rawText.replace(/\s+/g, '');
  //     console.log('[重解析] 原始文本:', rawText);
  //     // 非贪婪匹配，确保商品名只到第一个数字前
  //     let match = rawText.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(斤|把|包|件|个|捆|棵|条|盒|袋|跟)?(.*)?$/);
  //     console.log('[重解析] 正则匹配结果:', match);
  //     if (match) {
  //       return {
  //         nxDoGoodsName: match[1].trim(),
  //         nxDoQuantity: match[2].trim(),
  //         nxDoStandard: match[3] ? match[3].trim() : '',
  //         nxDoRemark: match[4] ? match[4].trim() : ''
  //       };
  //     }
  //     return null;
  //   }
  //   orders.forEach((order, idx) => {
  //     const isNameValid = /[\u4e00-\u9fa5]/.test(order.nxDoGoodsName);
  //     const isQuantityValid = Number(order.nxDoQuantity) > 0;
  //     const isStandardValid = /[\u4e00-\u9fa5]/.test(order.nxDoStandard);
  //     if (!isNameValid || !isQuantityValid || !isStandardValid) {
  //       const reparsed = reparseSingleOrder(order.rawText);
  //       if (reparsed) {
  //         orders[idx] = {
  //           ...order,
  //           ...reparsed
  //         };
  //       }
  //     }
  //   });
  //   // 重新 setData，确保 orderArr 为最新
  //   this.setData({
  //     orderArr: orders
  //   });

  //   // ============ G. 返回一个预览字符串(可选) ============
  //   const formattedOrders = orders.map(o => {
  //     let str = `${o.nxDoGoodsName}${o.nxDoQuantity}${o.nxDoStandard}`;
  //     if (o.nxDoRemark) {
  //       str += `（${o.nxDoRemark}）`;
  //     }
  //     return str;
  //   });
  //   const formatted = formattedOrders.join('\n');
  //   console.log('[formatOrderContent] 解析结果 orders:', orders);
  //   console.log('[formatOrderContent] formatted:', formatted);
  //   return { orders, formatted };
  // },


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
    // else {

    //   if (type == "quantity") {
    //     var data = "orderArr[" + index + "].nxDoQuantity";
    //     this.setData({
    //       [data]: "",
    //     })
    //   }
    //   if (type == "standard") {
    //     var data = "orderArr[" + index + "].nxDoStandard";
    //     this.setData({
    //       [data]: "",
    //     })
    //   }
    // }

  },


  
  //保存预览订单
  depPasteSearchGoods() {
    var canSave = this._checkOrderContent();
    if (canSave) {
      load.showLoading("识别商品中");
      depPasteSearchGoods(this.data.orderArr).then(res => {
        if (res.result.code == 0) {
          console.log(res.result.data);
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
    //   this.getSearchString(e);
    // }
    // if (e.detail.value.length > 0) {
    //   var data = "orderArr[" + index + "].nxDoGoodsName";
    //   this.setData({
    //     [data]: e.detail.value,
    //   })
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
      order.nxDoGoodsName = this.data.customerName;
      order.nxDoDisGoodsId = this.data.goodsId;

      console.log(order);
      load.showLoading("保存订单中")
      choiceGoodsForApply(order).then(res => {
        if (res.result.code == 0) {
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
      nxDoIsAgent: -1,
      nxDoDepartmentId: this.data.depId,
      nxDoDepartmentFatherId: this.data.depFatherId,
      nxDoDisGoodsId: null,
      nxDoStandardWarn: 0,
      goodsNameWarn: 0,
      nxDoDistributerId: this.data.disId,
      nxDoPurchaseUserId: -1,
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
    this.setData({
      inputContent: '',
      sentence: '',
      orderArr: [],
      orderArrFixed: [],
      hasAiRecognized: false,
      temperature: 0.7,
      aiRetryCount: 0
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

  


})