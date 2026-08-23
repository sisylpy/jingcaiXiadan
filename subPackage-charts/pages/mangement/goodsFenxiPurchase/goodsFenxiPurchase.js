var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../../utils/dateUtil');
import * as echarts from '../../../ec-canvas/echarts';

import apiUrl from '../../../../config.js'

import {
  getDepGoodsOrderDetailList
} from '../../../../lib/apiRestraunt.js'


Page({

  data: {
    selectedPurIndex: -1,
  },

  onShow() {
    if (this.data.update) {
      var myDate = wx.getStorageSync('myDate');
      if (myDate) {
        var dateRange = dateUtils.getDateRange(myDate.name);
        if (dateRange.startDate && dateRange.stopDate) {
          this.setData({
            startDate: dateRange.startDate,
            stopDate: dateRange.stopDate,
            dateType: myDate.dateType,
            hanzi: myDate.hanzi,
            update: false
          })
        }
      }
      this._getOrderList();
    }
  },

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      disGoodsId: options.disGoodsId,
      depFatherId: options.depFatherId,
    })

    var myDate = wx.getStorageSync('myDate');
    if(myDate){
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
        update: false
      })
    }else{
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi:  "本月",
      })
    }

    // 读取父商品缓存
    var disGoods = wx.getStorageSync('disGoods');
    if(disGoods){
      this.setData({
        goodsName: disGoods.nxDgGoodsName || disGoods.nxDfgFatherGoodsName || '商品详情'
      })
    }

    this._getOrderList();
  },

  // 获取订单明细列表
  _getOrderList() {
    this.setData({
      isLoading: true
    });

    var data = { 
      disGoodsId: this.data.disGoodsId,
      depFatherId: this.data.depFatherId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
    };

    load.showLoading("获取数据中");
    getDepGoodsOrderDetailList(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          console.log("========== 饭店订单明细数据结构 ==========");
          console.log("arr:", res.result.data.arr);
          console.log("itemList:", res.result.data.itemList);
          console.log("=========================================");
          
          this.setData({
            arr: res.result.data.arr || [],
            itemList: res.result.data.itemList || [],
            isLoading: false
          })
          
          if(res.result.data.itemList && res.result.data.itemList.length > 0){
            setTimeout(() => {
              this.initDailyChart();
            }, 100);
          } else {
            this.setData({ isLoading: false });
          }
        } else {
          this.setData({ isLoading: false });
          wx.showToast({
            title: res.result.msg || '获取数据失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        load.hideLoading();
        this.setData({ isLoading: false });
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      });
  },

  // 初始化每日金额图表
  initDailyChart() {
    if (!this.data.itemList || this.data.itemList.length === 0) {
      return;
    }
    
    const that = this;
    this.echartsComponnet = this.selectComponent('#dailyChart');
    
    if (!this.echartsComponnet) {
      return;
    }

    this.echartsComponnet.init((canvas, width, height) => {
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });
      Chart.setOption(this.getChartOption());
      return Chart;
    });
  },

  // 图表配置
  getChartOption() {
    const itemList = this.data.itemList;
    
    if (!itemList || itemList.length === 0) {
      return {
        title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#999', fontSize: 16 } }
      };
    }

    const dateList = [];
    const valueList = [];
    
    itemList.forEach(item => {
      if (item.date) {
        const day = item.date.split('-')[2];
        dateList.push(day);
        valueList.push(parseFloat(item.purSubtotal) || 0);
      }
    });

    return {
      color: ['#4A90E2'],
      grid: {
        left: 20, right: 20, bottom: 20, top: 40,
        containLabel: true, show: false
      },
      xAxis: {
        type: 'category',
        data: dateList,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#999' } },
        axisLabel: { color: '#666' },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        position: 'right',
        splitLine: { show: false },
        axisLabel: {
          formatter: function(value) { return '¥' + value.toFixed(0); }
        }
      },
      series: [{
        type: 'bar',
        name: '采购金额',
        data: valueList,
        barMaxWidth: 40,
        itemStyle: { color: '#4A90E2' },
        label: {
          show: true,
          position: 'top',
          formatter: function(params) {
            return params.value > 0 ? '¥' + params.value.toFixed(0) : '';
          },
          color: '#666', fontSize: 10
        }
      }]
    };
  },

  // 展开/收起订单详情
  showDetail(e) {
    const purIndex = e.currentTarget.dataset.purIndex;
    const newArr = [...this.data.arr];
    newArr[purIndex].expanded = !newArr[purIndex].expanded;
    this.setData({ arr: newArr });
  },

  // 日期选择
  toDatePage() {
    this.setData({ update: true })
    wx.navigateTo({
      url: '../../sel/searchDate/searchDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType + '&hanzi=' + this.data.hanzi,
    })
  },

  // 返回
  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  onUnload() {
    wx.removeStorageSync('disGoods');
  }

})