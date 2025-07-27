// app.js
App({
  onLaunch(options) {

    const windowInfo = wx.getWindowInfo();

    var device = wx.getDeviceInfo();
    console.log(device, "deviec")
    const isIOS = device.system.indexOf('iOS') > -1;
    const navBarContentHeight = isIOS ? 44 : 48;
    const statusBarHeight = windowInfo.statusBarHeight; // 状态栏高度
    // const navBarHeight = statusBarHeight + navBarContentHeight; // 总的导航栏高度
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    console.log(menuButtonInfo);
    const navBarHeight = menuButtonInfo.bottom + menuButtonInfo.top - statusBarHeight;
    var deviceId = "";
    if (device.platform == 'ios') {
      deviceId = "F37B31B6-B177-A674-D73A-88C25DB7F9A9";
    } else if (device.platform == 'android') {
      deviceId = "DC:1D:30:8F:9A:60";
    }
    // 存储到 globalData
    this.globalData = {
      windowWidth: windowInfo.windowWidth,
      windowHeight: windowInfo.windowHeight,
      screenHeight: windowInfo.screenHeight,
      screenWidth: windowInfo.screenWidth,
      statusBarHeight: windowInfo.statusBarHeight,
      rpxR: 750 / windowInfo.windowWidth,
      statusBarHeight: statusBarHeight,
      navBarContentHeight: navBarContentHeight,
      navBarHeight: navBarHeight,
      userInfo: null,
      menuButtonInfo: menuButtonInfo,
      sysDeviceId: deviceId,
    };

  
    // 新增：小程序新版本检测与提示
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate(function (res) {
        // 请求完新版本信息的回调
        // res.hasUpdate
      });
      updateManager.onUpdateReady(function () {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: function (res) {
            if (res.confirm) {
              // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
              updateManager.applyUpdate();
            }
          }
        });
      });
      updateManager.onUpdateFailed(function () {
        // 新的版本下载失败
        wx.showModal({
          title: '更新提示',
          content: '新版本下载失败，请检查网络设置',
          showCancel: false
        });
      });
    }

  },

  getPlatform: function () { //获取客户端平台
    return this.globalData["platform"]
  },

  BLEInformation: {
    platform: "",
    deviceId: null,
    writeCharaterId: "",
    writeServiceId: "",
    notifyCharaterId: "",
    notifyServiceId: "",
    readCharaterId: "",
    readServiceId: "",
  },

  globalData: {
    statusBarHeight: 20,
    navBarContentHeight: 44,
    navBarHeight: 64,
    userInfo: null,
    tabBar: [],
    menuButtonInfo: null
  }
});
