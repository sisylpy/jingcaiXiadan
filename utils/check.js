const app = getApp()


/**
 * params { Function } authCallback 已授权
 * params { Function } unAuthCb 未授权
 */
export const checkStatus = (authCallback, unAuthCb = () => {}) => {
  // 判断是否有授权，有授权的话从回调调用方法初始化数据
  // 无授权的话直接调用方法初始化数据
  wx.getSetting({
    success: res => {
      if (res.authSetting['scope.userInfo']) {
          if (app.globalData.userInfo) { // onLaunch 先执行
          authCallback()
        } else { // onLoad 先执行
          app.checkStatusCallback = res => {
            authCallback()
          }
        }
      } else {
        unAuthCb()
      }
    }
  })
}