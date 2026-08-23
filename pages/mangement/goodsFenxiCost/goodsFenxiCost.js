
var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;

import * as echarts from '../../../ec-canvas/echarts';

var dateUtils = require('../../../../utils/dateUtil');
var itemWidth = "";
var windowWidth  = "";

import {
  getGoodsReduceWithDayData,
} from '../../../../lib/apiDistributer'


Page({

  onShow(){

    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });


    if(this.data.update){
      console.log('=== goodsFenxiCost onShow update=true ===');
      console.log('当前页面数据:', {
        startDate: this.data.startDate,
        stopDate: this.data.stopDate,
        dateType: this.data.dateType,
        hanzi: this.data.hanzi
      });
      
      // searchDate 页面是临时查询，update=true 表示从 searchDate 返回
      // 必须使用页面传递的数据，不使用 storage 缓存
      // 使用 setTimeout 确保 setData 的数据已同步到 this.data
      setTimeout(() => {
        var startDate = this.data.startDate;
        var stopDate = this.data.stopDate;
        var dateType = this.data.dateType;
        var hanzi = this.data.hanzi;
        
        console.log('延迟检查后的页面数据:', {
          startDate: startDate,
          stopDate: stopDate,
          dateType: dateType,
          hanzi: hanzi
        });
        
        // 如果页面数据存在，直接使用（从 searchDate 返回的数据）
        if (startDate && stopDate && dateType) {
          console.log('✅ 使用页面传递的日期数据（从 searchDate 返回，不缓存）');
          console.log('日期信息:', {
            startDate: startDate,
            stopDate: stopDate,
            dateType: dateType,
            hanzi: hanzi
          });
          
          // 直接使用页面数据，重置 update 并调用接口
          this.setData({
            update: false
          }, () => {
            console.log('日期数据已确认，准备调用接口');
            console.log('最终使用的日期:', {
              startDate: this.data.startDate,
              stopDate: this.data.stopDate,
              dateType: this.data.dateType,
              hanzi: this.data.hanzi
            });
            // 数据确认后调用接口
            this._initData();
          });
        } else {
          // 如果页面数据不完整，说明不是从 searchDate 返回的，使用默认值
          console.log('⚠️ 页面数据不完整，使用默认值（本月）');
          this.setData({
            dateType: 'month',
            startDate: dateUtils.getFirstDateInMonth(),
            stopDate: dateUtils.getArriveDate(0),
            hanzi: "本月",
            update: false
          }, () => {
            this._initData();
          });
        }
        console.log('=== goodsFenxiCost onShow 结束 ===');
      }, 100); // 延迟100ms确保 setData 的数据已同步
    }
   

  },

  /**
   * 页面的初始数据
   */
  data: {
    update: false,
    // 图表相关数据
    ecDaily: {
      lazyLoad: false // 图表不使用延迟加载
    },
    dailyChartDrawn: false,
    produceList: [],
    totalWasteReduceItems: 0, // 总的 wasteReduceList 项目数
    lossList: [],
    wasteList: [],
    // 展开状态管理
    expandedRows: {},
    // AI分析数据
    aiAnalysis: null,
    warningsExpanded: true,
    suggestionsExpanded: true,
    summaryExpanded: false,
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    this.setData({
      disGoodsId: options.disGoodsId,
      dateType: options.dateType,
      type: options.type,
      fenxiType: options.fenxiType,
       searchDepId: options.searchDepId,
       disGoodsId: options.disGoodsId,
       nxDisId: options.nxDisId,
     
    })

    var myDate = wx.getStorageSync('myDate');
      if(myDate){
        console.log("reeee", myDate)
          // 如果是自定义日期，传递具体的开始和结束日期
       var dateRange;
       if (myDate.name === 'custom' ) {
         dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
       } else {
         dateRange = dateUtils.getDateRange(myDate.name);
       }
       this.setData({
         startDate: dateRange.startDate,
         stopDate: dateRange.stopDate,
         dateType: myDate.dateType,
         hanzi: myDate.hanzi || dateRange.name,
       })
  
      }else{
        this.setData({
          dateType: 'month',
          startDate: dateUtils.getFirstDateInMonth(),
          stopDate: dateUtils.getArriveDate(0),
          hanzi:  "本月",
        })
      }
    var disGoods = wx.getStorageSync('disGoods');
    if(disGoods){
          this.setData({
        disGoods: disGoods
      })
      }
  
    this._initData();


  },

  

  _initData(){
    var data = {
      startDate : this.data.startDate,
      stopDate: this.data.stopDate,
      disGoodsId: this.data.disGoodsId,
      searchDepId: this.data.searchDepId,
    }
    load.showLoading("获取数据中")
    getGoodsReduceWithDayData(data).then(res => {
      if(res.result.code == 0){
        load.hideLoading();
        
        // 检查返回数据的所有字段，查找可能包含列表数据的字段
        const allFields = Object.keys(res.result.data);
        console.log("========== 检查返回数据的所有字段 ==========");
        console.log("所有字段:", allFields);
        
        // 查找可能包含列表数据的字段（包含 reduce, shelf, stock, entity 等关键词）
        const possibleListFields = allFields.filter(field => {
          const fieldLower = field.toLowerCase();
          return fieldLower.includes('reduce') || 
                 fieldLower.includes('shelf') || 
                 fieldLower.includes('stock') || 
                 fieldLower.includes('entity') ||
                 fieldLower.includes('list');
        });
        console.log("可能包含列表数据的字段:", possibleListFields);
        
        // 检查 itemList 结构
        if (res.result.data.itemList && res.result.data.itemList.length > 0) {
          console.log("itemList[0] 结构:", res.result.data.itemList[0]);
          console.log("itemList[0] 所有字段:", Object.keys(res.result.data.itemList[0]));
          
          if (res.result.data.itemList[0].arr && res.result.data.itemList[0].arr.length > 0) {
            const arrItem = res.result.data.itemList[0].arr[0];
            console.log("itemList[0].arr[0] 所有字段:", Object.keys(arrItem));
            
            // 查找所有数组字段
            const arrayFields = Object.keys(arrItem).filter(key => Array.isArray(arrItem[key]));
            console.log("数组字段:", arrayFields);
            
            // 查找所有对象字段，检查其内部是否有数组
            Object.keys(arrItem).forEach(key => {
              const value = arrItem[key];
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                const objArrayFields = Object.keys(value).filter(k => Array.isArray(value[k]));
                if (objArrayFields.length > 0) {
                  console.log(`对象字段 ${key} 中包含数组字段:`, objArrayFields);
                  objArrayFields.forEach(arrayField => {
                    if (value[arrayField] && value[arrayField].length > 0) {
                      console.log(`  ${key}.${arrayField}[0]:`, value[arrayField][0]);
                    }
                  });
                }
              }
            });
          }
        }
        
        // 检查返回数据的其他字段是否有列表数据
        possibleListFields.forEach(field => {
          const fieldValue = res.result.data[field];
          if (Array.isArray(fieldValue) && fieldValue.length > 0) {
            console.log(`${field} 是数组，长度: ${fieldValue.length}, 第一个元素:`, fieldValue[0]);
          } else if (fieldValue && typeof fieldValue === 'object') {
            console.log(`${field} 是对象，字段:`, Object.keys(fieldValue));
          }
        });
        
        this.setData({
          oneTotal : res.result.data.oneTotal || 0,
          salesTotal: res.result.data.salesTotal || 0,
          lossTotal: res.result.data.lossTotal || 0,
          wasteTotal: res.result.data.wasteTotal || 0,
          oneTotalWeight : res.result.data.oneTotalWeight || 0,
          salesTotalWeight: res.result.data.salesTotalWeight || 0,
          lossTotalWeight: res.result.data.lossTotalWeight || 0,
          wasteTotalWeight: res.result.data.wasteTotalWeight || 0,

          lossList: res.result.data.lossList || [],
          produceList: res.result.data.produceList || [],
          wasteList: res.result.data.wasteList || [],

          itemList: res.result.data.itemList || [],
          
          // AI分析数据
          aiAnalysis: res.result.data.aiAnalysis || null,
        }, () => {
          // 数据设置完成后，计算列表数据总数
          let totalWasteReduceItems = 0;
          if (this.data.itemList && this.data.itemList.length > 0) {
            this.data.itemList.forEach((everyday, dayIndex) => {
              if (everyday.arr && everyday.arr.length > 0) {
                everyday.arr.forEach((day, itemIndex) => {
                  // 尝试多种可能的数据结构路径
                  const dailyEntity = day.nxDepartmentGoodsDailyEntity || day.departmentGoodsDailyEntity || day;
                  const reduceList = dailyEntity.nxWasteReduceList || 
                                   dailyEntity.wasteReduceList || 
                                   day.wasteReduceList || 
                                   day.nxWasteReduceList ||
                                   day.nxDistributerGoodsShelfStockReduceEntities ||
                                   day.nxDepartmentGoodsShelfStockReduceEntities ||
                                   [];
                  totalWasteReduceItems += (reduceList && reduceList.length) || 0;
                });
              }
            });
          }
          
          // 更新总的列表项目数，用于判断是否显示"没有数据拉！"
          this.setData({
            totalWasteReduceItems: totalWasteReduceItems
          });
        })

        // 初始化图表，添加延迟确保DOM已更新
        // 等待数据设置完成
        this.$nextTick = this.$nextTick || function(cb) {
          setTimeout(cb, 0);
        };
        
        setTimeout(() => {
          console.log('准备初始化图表，当前数据:', {
            produceList: this.data.produceList,
            lossList: this.data.lossList,
            wasteList: this.data.wasteList
          });
          
          // 再次延迟，确保 wx:if 条件渲染完成
          setTimeout(() => {
          this.initDailyChart();
          
          // 强制触发图表渲染
          setTimeout(() => {
            console.log('强制触发图表渲染');
            this.forceChartRender();
            }, 1000);
          }, 300);
        }, 300);

       
      }else{
        load.hideLoading();
        wx.showToast({
          title: res.result.msg || '获取数据失败',
          icon: 'none'
        })
        // 清空所有数据
        this.setData({
          oneTotal: 0,
          salesTotal: 0,
          lossTotal: 0,
          wasteTotal: 0,
          oneTotalWeight: 0,
          salesTotalWeight: 0,
          lossTotalWeight: 0,
          wasteTotalWeight: 0,
          lossList: [],
          produceList: [],
          wasteList: [],
          itemList: [],
          aiAnalysis: null,
          totalWasteReduceItems: 0,
          stArr: [],
          depArr: "",
        })
      }
      
    })

  },

  

  toBack(){
    
    
    wx.navigateBack({
      delta: 1
    })

  },

  // 清除部门筛选
  clearDepartmentFilter() {
    wx.removeStorageSync('selectedDepartment');
    this.setData({
      selectedDepartment: null,
      searchDepId: -1
    });
    this._initData();
  },

  // AI分析卡片交互功能
  toggleWarnings() {
    this.setData({
      warningsExpanded: !this.data.warningsExpanded
    });
  },

  toggleSuggestions() {
    this.setData({
      suggestionsExpanded: !this.data.suggestionsExpanded
    });
  },

  toggleSummary() {
    this.setData({
      summaryExpanded: !this.data.summaryExpanded
    });
  },
  


  // toDatePage(){
  //   this.setData({
  //     update: true
  //   })
  //   wx.navigateTo({
  //     url: '../../sel/date/date?startDate=' + this.data.startDate
  //      + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
  //   })
  // },


  toDatePage() {
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '../../sel/searchDate/searchDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType + '&hanzi=' + this.data.hanzi, 
    })
  },

  
  toFilterType() {
    wx.navigateTo({
      url: '../../sel/filterDataType/filterDataType?searchType=mendian',
    })
  },

  delSearch(){
    wx.removeStorageSync('selDepList');
    this.setData({
      searchDepIds: -1,
      searchDepName : ""
    })
    this._initData();

  },
  


  // 点击制作行，显示库存批次
  showOne(e) {
    console.log('=== showOne 方法被调用 ===');
    const index = e.currentTarget.dataset.index;
    const itemIndex = e.currentTarget.dataset.itemIndex;
    const dayIndex = e.currentTarget.dataset.dayIndex;
    const key = `${itemIndex}_${dayIndex}_${index}`;
    
    console.log('showOne 被调用，key:', key);
    console.log('当前 expandedRows:', this.data.expandedRows);
    
    let expandedRows = { ...this.data.expandedRows };
    // 如果当前行已展开，则关闭；否则展开当前行，保持其他行状态
    if (expandedRows[key]) {
      console.log('当前行已展开，关闭它');
      // 先设置动画状态为收起
      this.setData({ 
        [`expandedRows.${key}`]: 'collapsing'
      });
      
      // 延迟删除，让动画完成
      setTimeout(() => {
        delete expandedRows[key]; 
        this.setData({ 
          expandedRows
        });
      }, 300);
      return;
    }
    
    console.log('当前行未展开，展开它');
    console.log('展开前的 expandedRows:', expandedRows);
    // 展开当前行，保持其他行状态
    expandedRows[key] = 'stock';
    console.log('展开后的 expandedRows:', expandedRows);
    this.setData({ expandedRows });
    
    // 延迟检查设置后的状态
    setTimeout(() => {
      console.log('设置后的 expandedRows:', this.data.expandedRows);
    }, 100);

  },



  toFenxi(e) {
    wx.setStorageSync('disGoods', this.data.disGoods);
    wx.navigateTo({
      url: '../../../../subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + id, 

    })
    
  },
  
  toCost(e) {
    wx.setStorageSync('disGoods', this.data.disGoods);   
    wx.navigateTo({
      url: '../../../../subPackage-goods/pages/goods/stockGoodsList/stockGoodsList?disGoodsId=' + this.data.disGoods.gbDistributerGoodsId,
    })

  },



  // 强制触发图表渲染
  forceChartRender() {
    console.log('=== 强制渲染图表 ===');
    
    // 尝试重新设置图表配置
    if (this.dailyChart) {
      console.log('找到图表实例，重新渲染');
      console.log('当前图表尺寸:', this.dailyChart.getWidth(), 'x', this.dailyChart.getHeight());
      
      const chartData = this.processChartData();
      console.log('重新处理的数据:', chartData);
      
      const option = this.getChartOption(chartData);
      console.log('重新生成的配置:', option);
      
      this.dailyChart.setOption(option, true);
      console.log('图表配置已重新应用');
      
      // 再次检查渲染结果
      setTimeout(() => {
        console.log('=== 重新渲染后检查 ===');
        console.log('图表尺寸:', this.dailyChart.getWidth(), 'x', this.dailyChart.getHeight());
        console.log('图表是否可见:', this.dailyChart.getWidth() > 0 && this.dailyChart.getHeight() > 0);
      }, 200);
    } else {
      console.log('没有找到图表实例，重新初始化');
      this.initDailyChart();
    }
  },

  // 获取图表配置
  getChartOption(chartData) {
    // 计算数据范围，确保小数值也能显示
    const allValues = [...chartData.produceData, ...chartData.lossData, ...chartData.wasteData];
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues.filter(v => v > 0)); // 排除0值，找到最小正值
    
    // 计算堆叠后的总高度
    const totalHeight = chartData.produceData.map((produce, index) => 
      produce + chartData.lossData[index] + chartData.wasteData[index]
    );
    const maxTotalHeight = Math.max(...totalHeight);
    
    console.log('=== Y轴范围计算 ===');
    console.log('单个数据最大值:', maxValue);
    console.log('堆叠后总高度:', totalHeight);
    console.log('堆叠后最大高度:', maxTotalHeight);
    console.log('建议Y轴最大值:', maxTotalHeight * 1.2);
    
    return {
      // title: {
      //   text: '日支出统计',
      //   left: 'center',
      //   textStyle: {
      //     fontSize: 14
      //   }
      // },
      // 禁用图表交互
      silent: true,
      // 禁用tooltip
      tooltip: {
        show: false
      },
      legend: {
        data: [ '销售', '损耗','废弃'],
        bottom: 10,
        // 禁用图例点击
        selectedMode: false
      },
      grid: {
        left: '8%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: chartData.dates,
        axisLabel: {
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: function(value) {
            // 格式化数值，保留最多2位小数
            if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'k';
            } else if (value >= 1) {
              return value.toFixed(1);
            } else if (value > 0) {
              return value.toFixed(2);
            } else {
              return '0';
            }
          }
        },
        minInterval: 0.1, // 设置最小刻度间隔为0.1
        scale: true, // 启用缩放，自动调整Y轴范围
        // 如果有小数值，调整Y轴范围
        min: minValue && minValue < maxValue * 0.1 ? 0 : undefined,
        max: maxTotalHeight > 0 ? maxTotalHeight * 1.2 : undefined,  // 使用堆叠后的总高度
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: '销售',
          type: 'bar',
          stack: 'total',
          data: chartData.produceData,
          // 禁用点击
          silent: true,
          itemStyle: {
            color: '#05c0a7'  // 绿色 - 销售
          }
        },
        {
          name: '损耗',
          type: 'bar',
          stack: 'total',
          data: chartData.lossData,
          // 禁用点击
          silent: true,
          itemStyle: {
            color: '#fac858'  // 黄色 - 损耗
          }
        },
        {
          name: '废弃',
          type: 'bar',
          stack: 'total',
          data: chartData.wasteData,
          // 禁用点击
          silent: true,
          itemStyle: {
            color: '#ff6b6b'  // 红色 - 废弃
          }
        }
      ]
    };
  },

  // 初始化日支出柱形图
  initDailyChart() {
    console.log('=== 开始初始化图表 ===');
    console.log('当前 produceList:', this.data.produceList);
    console.log('当前 lossList:', this.data.lossList);
    console.log('当前 wasteList:', this.data.wasteList);
  
    // 使用selectComponent方式初始化图表
    const that = this;
    
    // 延迟一点确保DOM渲染完成
    setTimeout(() => {
    that.dailyEchartsComponent = that.selectComponent('#dailyChart');
    if (!that.dailyEchartsComponent) {
        console.error('找不到图表组件 #dailyChart');
        // 尝试直接通过页面实例获取
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        console.log('当前页面:', currentPage);
      return;
    }
      console.log('找到图表组件:', that.dailyEchartsComponent);
    
    // 先获取容器尺寸
    const query = wx.createSelectorQuery().in(that);
      query.select('.chart').boundingClientRect((rect) => {
      console.log('=== 容器尺寸检查 ===');
      console.log('容器尺寸:', rect);
      console.log('globalData.rpxR:', globalData.rpxR);
      
      // 检查容器是否准备好
      if (!rect || !rect.width || !rect.height) {
        console.warn('容器尺寸无效，使用默认值');
        // 延迟重试
        setTimeout(() => {
          that.initDailyChart();
        }, 200);
        return;
      }
      
      // 检查图表组件是否准备好
      if (!that.dailyEchartsComponent || !that.dailyEchartsComponent.init) {
        console.warn('图表组件未准备好，延迟重试');
        setTimeout(() => {
          that.initDailyChart();
        }, 200);
        return;
      }
      
      try {
        that.dailyEchartsComponent.init((canvas, width, height) => {
          console.log('=== 图表组件初始化 ===');
          console.log('图表初始化参数:', { width, height });
          console.log('canvas:', canvas);
          
          // 检查 canvas 是否有效
          if (!canvas) {
            console.error('Canvas 无效，无法初始化图表');
            return null;
          }
          
          // 强制设置宽度和高度
          const finalWidth = width || (rect ? rect.width * globalData.rpxR : 350);
          const finalHeight = height || (rect ? rect.height * globalData.rpxR : 350);
        
        const Chart = echarts.init(canvas, null, {
          width: finalWidth,
          height: finalHeight,
          devicePixelRatio: globalData.rpxR
        });
        
        console.log("=== Chart 初始化完成 ===");
        console.log("Chart 实例:", Chart);
        
        // 处理数据
        const chartData = that.processChartData();
        console.log('=== 处理后的图表数据 ===');
        console.log('chartData:', chartData);
        console.log('dates 长度:', chartData.dates.length);
        console.log('produceData 长度:', chartData.produceData.length);
        console.log('前3个日期:', chartData.dates.slice(0, 3));
        console.log('前3个销售数据:', chartData.produceData.slice(0, 3));
        
        const option = that.getChartOption(chartData);
        console.log("=== 图表配置 ===");
        console.log("option:", option);
        console.log("series 数量:", option.series ? option.series.length : 0);
        
        Chart.setOption(option);
        console.log("=== 图表配置已应用 ===");
        
        // 检查图表是否正确渲染
        setTimeout(() => {
          console.log("=== 图表渲染检查 ===");
          console.log("图表容器是否可见:", Chart.getWidth(), 'x', Chart.getHeight());
          console.log("图表数据点数量:", Chart.getOption().series ? Chart.getOption().series[0].data.length : 0);
        }, 100);
        
        // 保存图表实例
        that.dailyChart = Chart;
        
        that.setData({
          dailyChartDrawn: true
        });
        
        return Chart;
      });
      } catch (error) {
        console.error('图表初始化失败:', error);
        // 延迟重试
        setTimeout(() => {
          that.initDailyChart();
        }, 500);
      }
    }).exec();
    }, 100);
  },

  // 处理图表数据
  processChartData() {
    const produceList = this.data.produceList || [];
    const lossList = this.data.lossList || [];
    const wasteList = this.data.wasteList || [];
    
    console.log('处理图表数据 - 原始数据:', {
      produceList: produceList.slice(0, 3), // 只显示前3条
      lossList: lossList.slice(0, 3),
      wasteList: wasteList.slice(0, 3)
    });
    
    // 详细检查数据结构
    console.log('=== 数据结构检查 ===');
    if (produceList.length > 0) {
      console.log('produceList[0] 结构:', produceList[0]);
      console.log('produceList[0] 所有字段:', Object.keys(produceList[0]));
    }
    if (lossList.length > 0) {
      console.log('lossList[0] 结构:', lossList[0]);
      console.log('lossList[0] 所有字段:', Object.keys(lossList[0]));
    }
    if (wasteList.length > 0) {
      console.log('wasteList[0] 结构:', wasteList[0]);
      console.log('wasteList[0] 所有字段:', Object.keys(wasteList[0]));
    }
    
    // 特别检查14日的数据
    const day14Data = {
      produce: produceList.find(item => item.date && item.date.includes('14')),
      loss: lossList.find(item => item.date && item.date.includes('14')),
      waste: wasteList.find(item => item.date && item.date.includes('14'))
    };
    console.log('14日数据检查:', day14Data);
    
    // 获取所有日期
    const allDates = new Set();
    [...produceList, ...lossList, ...wasteList].forEach(item => {
      if (item.date) {
        allDates.add(item.date);
      }
    });
    
    const dates = Array.from(allDates).sort();
    console.log('提取的日期列表:', dates);
    
    // 创建数据映射
    const produceMap = {};
    const lossMap = {};
    const wasteMap = {};
    
    produceList.forEach(item => {
      if (item.date) {
        produceMap[item.date] = parseFloat(item.value) || 0;
      }
    });
    
    lossList.forEach(item => {
      if (item.date) {
        lossMap[item.date] = parseFloat(item.value) || 0;
      }
    });
    
    wasteList.forEach(item => {
      if (item.date) {
        wasteMap[item.date] = parseFloat(item.value) || 0;
      }
    });
    
    // 生成图表数据
    const produceData = dates.map(date => produceMap[date] || 0);
    const lossData = dates.map(date => lossMap[date] || 0);
    const wasteData = dates.map(date => wasteMap[date] || 0);
    
    const result = {
      dates: dates.map(date => {
        // 格式化日期显示，只显示月-日
        const dateObj = new Date(date);
        return `${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
      }),
      produceData,
      lossData,
      wasteData
    };
    
    console.log('最终图表数据:', result);
    console.log('所有销售数据:', produceData);
    console.log('所有损耗数据:', lossData);
    console.log('所有废弃数据:', wasteData);
    console.log('日期列表:', result.dates);
    
    // 特别检查9月18日的数据（图片显示的数据）
    const sep18Index = dates.findIndex(d => d.includes('09-18') || d.includes('9-18'));
    console.log('9月18日数据检查:', {
      date: dates[sep18Index],
      produce: produceData[sep18Index],
      loss: lossData[sep18Index],
      waste: wasteData[sep18Index],
      produceRaw: produceList.find(item => item.date && (item.date.includes('09-18') || item.date.includes('9-18'))),
      lossRaw: lossList.find(item => item.date && (item.date.includes('09-18') || item.date.includes('9-18'))),
      wasteRaw: wasteList.find(item => item.date && (item.date.includes('09-18') || item.date.includes('9-18')))
    });
    
    // 特别检查9月3日和9月4日的数据
    const sep3Index = dates.findIndex(d => d.includes('09-03'));
    const sep4Index = dates.findIndex(d => d.includes('09-04'));
    console.log('9月3日数据:', {
      date: dates[sep3Index],
      produce: produceData[sep3Index],
      loss: lossData[sep3Index],
      waste: wasteData[sep3Index]
    });
    console.log('9月4日数据:', {
      date: dates[sep4Index],
      produce: produceData[sep4Index],
      loss: lossData[sep4Index],
      waste: wasteData[sep4Index]
    });
    
    return result;
  }


})