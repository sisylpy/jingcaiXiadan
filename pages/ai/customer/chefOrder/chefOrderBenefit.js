import {
  orderGroupPreview,
  getClaimableCoupons,
  claimDistributerCoupon
} from '../../../../lib/apiRestraunt'

// 优惠券、配送费与订单预览相关逻辑集中在这里，页面只负责组合各业务模块。
export const chefOrderBenefitMethods = {
  _isCashSettle() {
    // 优惠券是否可领、是否展示，改由后台 claimableList 接口判断，
    // 前端不再根据门店结算类型（现金/配送）做前置拦截。恒返回 true。
    console.log('[chefOrder][_isCashSettle] 已放开结算类型限制，恒返回 true（实际判定交由后台）');
    return true;
  },

  _collectAllOrders() {
    var orders = [];
    var applyArr = this.data.applyArr || [];
    var depArr = this.data.depArr || [];

    if (applyArr.length > 0 && applyArr[0].nxDepartmentOrdersId) {
      return applyArr.slice();
    }

    applyArr.forEach(function (father) {
      (father.nxDistributerGoodsEntities || []).forEach(function (goods) {
        (goods.nxDepartmentOrdersEntities || []).forEach(function (order) {
          orders.push(order);
        });
      });
    });

    if (orders.length > 0) {
      return orders;
    }

    depArr.forEach(function (dep) {
      (dep.depOrders || []).forEach(function (father) {
        if (father.nxDepartmentOrdersId) {
          orders.push(father);
          return;
        }
        (father.nxDistributerGoodsEntities || []).forEach(function (goods) {
          (goods.nxDepartmentOrdersEntities || []).forEach(function (order) {
            orders.push(order);
          });
        });
      });
    });

    return orders;
  },

  _collectUnbilledOrderIds() {
    return this._collectAllOrders()
      .filter(function (order) {
        return order && order.nxDepartmentOrdersId != null && (order.nxDoBillId == null || order.nxDoBillId === -1);
      })
      .map(function (order) {
        return order.nxDepartmentOrdersId;
      });
  },

  _collectPreviewOrderIds() {
    var bill = this.data.bill;
    if (bill && bill !== -1) {
      var billOrders = bill.nxDepartmentOrdersEntities || [];
      var billIds = billOrders
        .filter(function (order) {
          return order && order.nxDepartmentOrdersId != null;
        })
        .map(function (order) {
          return order.nxDepartmentOrdersId;
        });
      if (billIds.length) {
        return billIds;
      }
    }
    return this._collectUnbilledOrderIds();
  },

  _resolvePreviewDepartmentId() {
    if (this.data.depId) {
      return this.data.depId;
    }
    var depInfo = this.data.depInfo;
    if (depInfo && depInfo.nxDepartmentId) {
      return depInfo.nxDepartmentId;
    }
    return this.data.depFatherId;
  },

  _resolveGroupDepartmentId() {
    if (this.data.depFatherId) {
      return this.data.depFatherId;
    }
    var depInfo = this.data.depInfo;
    if (!depInfo) {
      return null;
    }
    if (Number(depInfo.nxDepartmentIsGroupDep) === 1) {
      return depInfo.nxDepartmentId;
    }
    if (depInfo.nxDepartmentFatherId && depInfo.nxDepartmentFatherId !== 0) {
      return depInfo.nxDepartmentFatherId;
    }
    return depInfo.nxDepartmentId;
  },

  _canClaimCouponAtStore() {
    var groupId = this._resolveGroupDepartmentId();
    if (!groupId) {
      return false;
    }
    return this._resolvePreviewDepartmentId() === groupId;
  },

  _formatDeliveryModeLabel(mode) {
    if (mode === 'SELF_PICKUP') return '到店自提';
    if (mode === 'DELIVERY') return '配送上门';
    return mode || '配送';
  },

  _buildDeliveryFeeFormula(data) {
    if (!data) return '';
    var mode = data.feeMode || '';
    var deliveryFee = this._moneyText(data.deliveryFee);
    if (mode === 'SELF_PICKUP') return '自提订单，免配送费';
    if (mode === 'NO_RULE') return '';
    if (mode === 'FREE') return '当前运费策略：免运费';
    if (mode === 'FIXED_AMOUNT') {
      var fixed = this._moneyText(data.startFeeAmount || data.deliveryFee);
      return '固定运费 ¥' + fixed;
    }
    if (mode === 'DISTANCE_ONLY') {
      var dist = data.distanceKm || '0';
      var baseKm = data.baseDistanceKm != null && data.baseDistanceKm !== '' ? data.baseDistanceKm : '0';
      var startFee = this._moneyText(data.startFeeAmount || '0');
      var chargeKm = data.chargeableKm != null && data.chargeableKm !== '' ? data.chargeableKm : '0';
      var perKm = this._moneyText(data.pricePerKm || '0');
      var chargeNum = Number(chargeKm);
      if (isNaN(chargeNum) || chargeNum <= 0) {
        return '配送距离 ' + dist + ' km，' + baseKm + ' km 内起步价 ¥' + startFee;
      }
      var extraFee = this._moneyText(chargeNum * Number(perKm));
      return '配送距离 ' + dist + ' km；起步 ' + baseKm + ' km 内 ¥' + startFee
        + '，超出 ' + chargeKm + ' km × ¥' + perKm + '/km = ¥' + extraFee
        + '，合计 ¥' + deliveryFee;
    }
    if (mode === 'WEIGHT_ONLY') {
      var gross = data.grossWeightJin || '0';
      var baseWeight = data.baseWeightJin != null && data.baseWeightJin !== '' ? data.baseWeightJin : (data.baseDistanceKm || '0');
      var start = this._moneyText(data.startFeeAmount || '0');
      var perJin = this._moneyText(data.pricePerJin || data.pricePerJinPerKm || '0');
      var grossNum = Number(gross);
      var baseNum = Number(baseWeight);
      if (isNaN(grossNum) || grossNum <= baseNum) {
        return '商品总重 ' + gross + ' 斤，' + baseWeight + ' 斤内起步价 ¥' + start;
      }
      var extra = this._moneyText((grossNum - baseNum) * Number(perJin));
      return '商品总重 ' + gross + ' 斤；起步 ' + baseWeight + ' 斤内 ¥' + start
        + '，超出 ' + this._moneyText(grossNum - baseNum) + ' 斤 × ¥' + perJin + '/斤 = ¥' + extra
        + '，合计 ¥' + deliveryFee;
    }
    if (mode === 'WEIGHT_DISTANCE') {
      var dist2 = data.distanceKm || '0';
      var gross2 = data.grossWeightJin || '0';
      var baseKm2 = data.baseDistanceKm || '0';
      var chargeKm2 = data.chargeableKm || '0';
      var perJinKm = this._moneyText(data.pricePerJinPerKm || '0');
      var start2 = this._moneyText(data.startFeeAmount || '0');
      var weightFee = this._moneyText(Number(chargeKm2) * Number(gross2) * Number(perJinKm));
      return '距离 ' + dist2 + ' km，商品 ' + gross2 + ' 斤；计费 ' + chargeKm2 + ' km × ' + gross2 + ' 斤 × ¥' + perJinKm + '/斤/km = ¥' + weightFee
        + '，与起步价 ¥' + start2 + ' 取高，合计 ¥' + deliveryFee;
    }
    if (data.distanceKm) {
      return '配送距离 ' + data.distanceKm + ' km，按策略计费 ¥' + deliveryFee;
    }
    return '';
  },

  _formatFeeModeLabel(feeMode) {
    if (feeMode === 'DISTANCE_ONLY') return '按距离计费';
    if (feeMode === 'WEIGHT_DISTANCE') return '按重量和距离计费';
    if (feeMode === 'WEIGHT_ONLY') return '按重量计费';
    if (feeMode === 'FIXED_AMOUNT') return '固定运费';
    if (feeMode === 'FREE') return '免运费';
    if (feeMode === 'SELF_PICKUP') return '自提免运费';
    if (feeMode === 'NO_RULE') return '暂无运费规则';
    return feeMode || '';
  },

  _formatCouponTypeLabel(couponType) {
    if (Number(couponType) === 1) return '折扣券';
    return '满减券';
  },

  _buildCouponBadgeText(coupon) {
    if (!coupon) return '';
    if (coupon.descText) {
      return String(coupon.descText).replace(/\s+/g, '');
    }
    if (Number(coupon.couponType) === 1) {
      var percent = coupon.discountPercent || '0';
      var percentNum = Number(percent);
      var percentLabel = (!isNaN(percentNum) && percentNum > 10)
        ? (percentNum / 10) + '折'
        : percent + '折';
      return '满' + (coupon.thresholdAmount || '0') + '享' + percentLabel;
    }
    return '满' + (coupon.thresholdAmount || '0') + '减' + (coupon.discountAmount || '0') + '元';
  },

  _moneyText(value) {
    var num = Number(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  },

  _buildHomeBenefitSummary(orderPreview, claimableCoupons) {
    if (!orderPreview) {
      return null;
    }
    var goodsAmountNum = Number(orderPreview.goodsAmount);
    if (isNaN(goodsAmountNum) || goodsAmountNum <= 0) {
      return null;
    }

    var coupons = [];
    var seen = {};
    var pushCoupon = function (coupon) {
      if (!coupon) return;
      var key = coupon.userCouponId || coupon.couponId || coupon.couponName || coupon.descText;
      if (key && seen[key]) return;
      if (key) seen[key] = true;
      coupons.push(coupon);
    };

    if (orderPreview) {
      pushCoupon(orderPreview.bestCoupon);
    }

    var couponBadges = coupons.slice(0, 2).map(function (coupon) {
      return this._buildCouponBadgeText(coupon) || coupon.couponName || '优惠券';
    }.bind(this)).filter(function (text) { return !!text; });

    var hasCoupon = couponBadges.length > 0;
    var couponDiscountNum = Number(orderPreview.estimatedDiscount);
    var hasCouponDiscount = !isNaN(couponDiscountNum) && couponDiscountNum > 0;
    var deliveryFeeNum = 0;
    if (orderPreview && orderPreview.showDeliveryFee) {
      deliveryFeeNum = Number(orderPreview.deliveryFee);
    }
    var hasDeliveryFee = !isNaN(deliveryFeeNum) && deliveryFeeNum > 0;
    // 既没有运费也没有优惠券时整块不展示
    var showFeeCard = hasCoupon || hasCouponDiscount || hasDeliveryFee;

    var couponText = '';
    if (hasCoupon) {
      couponText = coupons.length > 1 ? (coupons.length + '张可用') : '可用';
    }

    return {
      goodsAmount: this._moneyText(goodsAmountNum),
      hasCoupon: hasCoupon,
      hasCouponDiscount: hasCouponDiscount,
      couponText: couponText,
      couponBadges: couponBadges,
      couponDiscount: this._moneyText(couponDiscountNum),
      hasDeliveryFee: hasDeliveryFee,
      deliveryFee: this._moneyText(deliveryFeeNum),
      showFeeCard: showFeeCard,
      deliveryFeeEstimate: !!(orderPreview && orderPreview.deliveryFeeEstimate),
      estimatedPayAmount: orderPreview.estimatedPayAmount || this._moneyText(Math.max(0, goodsAmountNum + deliveryFeeNum - (isNaN(couponDiscountNum) ? 0 : couponDiscountNum))),
    };
  },

  _buildClaimableCouponViews(coupons) {
    return (coupons || []).map(function (coupon) {
      var isDiscount = Number(coupon.couponType) === 1;
      var percent = coupon.discountPercent || '0';
      var percentNum = Number(percent);
      var percentLabel = (!isNaN(percentNum) && percentNum > 10)
        ? (percentNum / 10) + '折'
        : percent + '折';
      var amountText = isDiscount ? percentLabel : '¥' + this._moneyText(coupon.discountAmount).replace(/\.00$/, '');
      var thresholdText = this._buildCouponBadgeText(coupon);
      var dateText = coupon.validPeriodText || '';
      if (!dateText && (coupon.startDate || coupon.stopDate)) {
        dateText = (coupon.startDate || '即日起') + '—' + (coupon.stopDate || '长期');
      }
      if (!dateText) {
        dateText = '领取后可用';
      }
      var scopeText = coupon.scopeLabel || '';
      if (!scopeText && coupon.scopeNames && coupon.scopeNames.length) {
        scopeText = coupon.scopeNames.join('、');
      }
      return Object.assign({}, coupon, {
        amountText: amountText,
        thresholdText: thresholdText,
        dateText: dateText,
        scopeText: scopeText,
        displayName: coupon.couponName || thresholdText || '优惠券',
      });
    }.bind(this));
  },

  _buildBillSummary(bill) {
    if (!bill || bill === -1) return null;
    var goodsAmount = bill.nxDbGoodsAmount || bill.nxDbTotal || '0.00';
    var couponDiscount = bill.nxDbCouponDiscountAmount || '0.00';
    var deliveryFee = bill.nxDbDeliveryFee || '0.00';
    var payAmount = bill.nxDbPayAmount || bill.nxDbTotal || '0.00';
    var deliveryMode = bill.nxDbDeliveryMode || 'DELIVERY';
    var isSelfPickup = deliveryMode === 'SELF_PICKUP';
    var couponNum = Number(couponDiscount);
    var deliveryNum = Number(deliveryFee);
    // 是否有运费：存在实际运费(>0) 且 非自提
    var hasFee = !isSelfPickup && deliveryNum > 0;
    // 是否有优惠券：存在实际优惠金额(>0)
    var hasCouponAny = couponNum > 0;
    // 既无运费也无优惠券时整块不展示
    var showFeeCard = hasFee || hasCouponAny;
    return {
      goodsAmount: this._moneyText(goodsAmount),
      couponDiscount: this._moneyText(couponDiscount),
      couponName: bill.nxDbCouponName || '',
      couponBadgeText: bill.nxDbCouponName ? String(bill.nxDbCouponName).replace(/\s+/g, '') : '',
      hasCoupon: couponNum > 0,
      hasCouponDiscount: couponNum > 0,
      deliveryFee: this._moneyText(deliveryFee),
      deliveryMode: deliveryMode,
      deliveryModeLabel: this._formatDeliveryModeLabel(deliveryMode),
      deliveryAddress: bill.nxDbDeliveryAddress || '',
      distanceKm: bill.nxDbDistanceKm || '',
      payAmount: this._moneyText(payAmount),
      showDeliveryFee: !isSelfPickup,
      showDeliveryFeeDetail: !isSelfPickup && (!!(bill.nxDbDeliveryAddress) || !!(bill.nxDbDistanceKm)),
      deliveryFeeEstimate: false,
      showFeeCard: showFeeCard,
    };
  },

  _enrichBillSummaryWithPreview(billSummary, orderPreview) {
    if (!billSummary) {
      return billSummary;
    }
    var summary = Object.assign({}, billSummary);
    if (orderPreview) {
      var badge = orderPreview.couponBadgeText || this._buildCouponBadgeText(orderPreview.bestCoupon);
      if (badge) {
        summary.couponBadgeText = badge;
      }
    }
    return summary;
  },

  _processOrderPreview(data) {
    if (!data) return null;
    var couponPreview = data.couponPreview || {};
    var availableCoupons = (couponPreview.availableCoupons || []).map(function (item) {
      return Object.assign({}, item, {
        couponTypeLabel: item.couponTypeLabel || this._formatCouponTypeLabel(item.couponType),
      });
    }.bind(this));
    var unavailableCoupons = (couponPreview.unavailableCoupons || []).map(function (item) {
      return Object.assign({}, item, {
        couponTypeLabel: item.couponTypeLabel || this._formatCouponTypeLabel(item.couponType),
      });
    }.bind(this));
    var bestCoupon = couponPreview.bestCoupon || null;
    var estimatedDiscount = this._moneyText(couponPreview.estimatedDiscountAmount);
    var deliveryFee = this._moneyText(data.deliveryFee);
    var deliveryMode = data.deliveryMode || 'DELIVERY';
    var isSelfPickup = deliveryMode === 'SELF_PICKUP';
    var deliveryFeeNum = Number(deliveryFee);
    var goodsAmountNum = Number(this._moneyText(data.goodsAmount));
    var estimatedPayFromApi = this._moneyText(couponPreview.estimatedPayAmount);
    var estimatedPayAmount = estimatedPayFromApi;
    if (!estimatedPayAmount || estimatedPayAmount === '0.00') {
      estimatedPayAmount = this._moneyText(Math.max(0, goodsAmountNum + deliveryFeeNum - Number(estimatedDiscount)));
    }
    var hasCouponDiscount = Number(estimatedDiscount) > 0;
    var deliveryFeeFormula = this._buildDeliveryFeeFormula(data);
    var showDeliveryFeeDetail = !isSelfPickup && data.feeMode && data.feeMode !== 'NO_RULE';
    return {
      goodsAmount: this._moneyText(data.goodsAmount),
      deliveryFee: deliveryFee,
      payAmount: this._moneyText(data.payAmount),
      deliveryMode: deliveryMode,
      deliveryModeLabel: this._formatDeliveryModeLabel(deliveryMode),
      deliveryAddress: data.deliveryAddress || '',
      distanceKm: data.distanceKm || '',
      baseDistanceKm: data.baseDistanceKm || '',
      baseWeightJin: data.baseWeightJin || '',
      grossWeightJin: data.grossWeightJin || '',
      startFeeAmount: data.startFeeAmount ? this._moneyText(data.startFeeAmount) : '',
      pricePerKm: data.pricePerKm ? this._moneyText(data.pricePerKm) : '',
      pricePerJin: data.pricePerJin ? this._moneyText(data.pricePerJin) : '',
      pricePerJinPerKm: data.pricePerJinPerKm ? this._moneyText(data.pricePerJinPerKm) : '',
      baseChargeKm: data.baseChargeKm || '',
      chargeableKm: data.chargeableKm || '',
      deliveryFeeFormula: deliveryFeeFormula,
      showDeliveryFeeDetail: showDeliveryFeeDetail,
      feeMode: data.feeMode || '',
      feeModeLabel: data.feeModeLabel || this._formatFeeModeLabel(data.feeMode),
      deliveryFeeEstimate: !!data.deliveryFeeEstimate,
      deliveryFeePending: !isSelfPickup && (data.feeMode === 'NO_RULE' || deliveryFeeNum === 0),
      showDeliveryFee: !isSelfPickup,
      availableCoupons: availableCoupons,
      unavailableCoupons: unavailableCoupons,
      bestCoupon: bestCoupon,
      couponBadgeText: this._buildCouponBadgeText(bestCoupon),
      hasCouponDiscount: hasCouponDiscount,
      estimatedDiscount: estimatedDiscount,
      estimatedPayAmount: estimatedPayAmount,
      hasCoupons: availableCoupons.length > 0 || unavailableCoupons.length > 0,
    };
  },

  _afterOrderDataLoaded() {
    // 不再根据结算类型拦截：优惠券展示与领取交由后台 claimableList 判定。
    var showCashSettle = this._isCashSettle();
    console.log('[chefOrder][_afterOrderDataLoaded] showCashSettle =', showCashSettle, 'disId =', this.data.disId, 'depSettleType =', this.data.depSettleType);
    this.setData({ showCashSettle: showCashSettle });

    var bill = this.data.bill;
    if (bill && bill !== -1) {
      this.setData({
        billSummary: this._enrichBillSummaryWithPreview(this._buildBillSummary(bill), this.data.orderPreview),
      });
    } else {
      this.setData({ billSummary: null });
    }

    this._loadClaimableCoupons();
    this._refreshOrderPreview();
  },

  _loadClaimableCoupons() {
    console.log('[chefOrder][_loadClaimableCoupons] 进入, isCashSettle =', this._isCashSettle(), 'disId =', this.data.disId, 'canClaim =', this._canClaimCouponAtStore(), 'groupDepartmentId =', this._resolveGroupDepartmentId());
    if (!this.data.disId) {
      console.log('[chefOrder][_loadClaimableCoupons] 拦截: 无 disId，不发起请求');
      this.setData({
        claimableCoupons: [],
        claimableCouponViews: [],
        claimableLoading: false,
        canClaimStoreCoupon: false,
        showClaimableCouponPopup: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(this.data.orderPreview, []),
      });
      return;
    }
    var canClaim = this._canClaimCouponAtStore();
    var groupDepartmentId = this._resolveGroupDepartmentId();
    if (!canClaim || !groupDepartmentId) {
      this.setData({
        claimableCoupons: [],
        claimableCouponViews: [],
        claimableLoading: false,
        canClaimStoreCoupon: false,
        showClaimableCouponPopup: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(this.data.orderPreview, []),
      });
      return;
    }
    this.setData({ claimableLoading: true, canClaimStoreCoupon: true });
    getClaimableCoupons({
      distributerId: this.data.disId,
      departmentId: groupDepartmentId,
    }).then(function (res) {
      if (res.result && res.result.code === 0) {
        var coupons = res.result.data || [];
        var couponViews = this._buildClaimableCouponViews(coupons);
        this.setData({
          claimableCoupons: coupons,
          claimableCouponViews: couponViews,
          claimableLoading: false,
          showClaimableCouponPopup: couponViews.length > 0 && !this.data.claimCouponPopupDismissed,
          homeBenefitSummary: this._buildHomeBenefitSummary(this.data.orderPreview, coupons),
        });
      } else {
        this.setData({
          claimableCoupons: [],
          claimableCouponViews: [],
          claimableLoading: false,
          showClaimableCouponPopup: false,
          homeBenefitSummary: this._buildHomeBenefitSummary(this.data.orderPreview, []),
        });
      }
    }.bind(this)).catch(function () {
      this.setData({
        claimableCoupons: [],
        claimableCouponViews: [],
        claimableLoading: false,
        showClaimableCouponPopup: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(this.data.orderPreview, []),
      });
    }.bind(this));
  },

  openClaimableCouponPopup() {
    if (!this.data.claimableCouponViews || !this.data.claimableCouponViews.length) {
      return;
    }
    this.setData({
      showClaimableCouponPopup: true,
      claimCouponPopupDismissed: false,
    });
  },

  closeClaimableCouponPopup() {
    this.setData({
      showClaimableCouponPopup: false,
      claimCouponPopupDismissed: true,
    });
  },

  onClaimCoupon(e) {
    var couponId = (e.detail && e.detail.id) || e.currentTarget.dataset.id;
    if (!couponId || this.data.claimingCouponId || this.data.claimingAllCoupons) {
      return;
    }
    if (!this._canClaimCouponAtStore()) {
      wx.showToast({ title: '仅门店总部门可领取', icon: 'none' });
      return;
    }
    var groupDepartmentId = this._resolveGroupDepartmentId();
    if (!groupDepartmentId) {
      wx.showToast({ title: '门店信息缺失', icon: 'none' });
      return;
    }
    this.setData({ claimingCouponId: couponId });
    claimDistributerCoupon({
      couponId: couponId,
      distributerId: this.data.disId,
      departmentId: groupDepartmentId,
    }).then(function (res) {
      this.setData({ claimingCouponId: null });
      if (res.result && res.result.code === 0) {
        wx.showToast({ title: '领取成功', icon: 'success' });
        this._loadClaimableCoupons();
        this._refreshOrderPreview();
      } else {
        wx.showToast({
          title: (res.result && res.result.msg) || '领取失败',
          icon: 'none',
        });
      }
    }.bind(this)).catch(function () {
      this.setData({ claimingCouponId: null });
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    }.bind(this));
  },

  claimAllCoupons() {
    var coupons = this.data.claimableCouponViews || [];
    if (!coupons.length || this.data.claimingAllCoupons || this.data.claimingCouponId) {
      return;
    }
    if (!this._canClaimCouponAtStore()) {
      wx.showToast({ title: '仅门店总部门可领取', icon: 'none' });
      return;
    }
    var groupDepartmentId = this._resolveGroupDepartmentId();
    if (!groupDepartmentId) {
      wx.showToast({ title: '门店信息缺失', icon: 'none' });
      return;
    }

    var couponIds = coupons.map(function (item) { return item.couponId; }).filter(function (id) { return !!id; });
    if (!couponIds.length) {
      return;
    }

    this.setData({ claimingAllCoupons: true });
    var chain = Promise.resolve();
    var successCount = 0;
    couponIds.forEach(function (couponId) {
      chain = chain.then(function () {
        return claimDistributerCoupon({
          couponId: couponId,
          distributerId: this.data.disId,
          departmentId: groupDepartmentId,
        }).then(function (res) {
          if (res.result && res.result.code === 0) {
            successCount += 1;
          }
        });
      }.bind(this));
    }.bind(this));

    chain.then(function () {
      this.setData({
        claimingAllCoupons: false,
        showClaimableCouponPopup: false,
        claimCouponPopupDismissed: true,
      });
      wx.showToast({ title: successCount > 0 ? ('已领取' + successCount + '张') : '暂无可领取', icon: 'none' });
      this._loadClaimableCoupons();
      this._refreshOrderPreview();
    }.bind(this)).catch(function () {
      this.setData({ claimingAllCoupons: false });
      wx.showToast({ title: '领取失败，请重试', icon: 'none' });
      this._loadClaimableCoupons();
    }.bind(this));
  },

  _refreshOrderPreview() {
    if (!this._isCashSettle()) {
      this.setData({ orderPreview: null, orderPreviewLoading: false, homeBenefitSummary: null });
      return;
    }

    var orderIds = this._collectPreviewOrderIds();
    if (!orderIds.length || !this.data.disId) {
      this.setData({
        orderPreview: null,
        orderPreviewLoading: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(null, this.data.claimableCoupons),
      });
      return;
    }

    var departmentId = this._resolvePreviewDepartmentId();
    if (!departmentId) {
      this.setData({
        orderPreview: null,
        orderPreviewLoading: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(null, this.data.claimableCoupons),
      });
      return;
    }

    var payload = {
      distributerId: this.data.disId,
      departmentId: departmentId,
      orderIds: orderIds,
    };
    if (this.data.userInfo && this.data.userInfo.nxDepartmentUserId) {
      payload.departmentUserId = this.data.userInfo.nxDepartmentUserId;
    }

    this.setData({
      orderPreviewLoading: true,
      homeBenefitSummary: this._buildHomeBenefitSummary(null, this.data.claimableCoupons),
    });
    orderGroupPreview(payload).then(function (res) {
      if (res.result && res.result.code === 0) {
        var orderPreview = this._processOrderPreview(res.result.data);
        var update = {
          orderPreview: orderPreview,
          orderPreviewLoading: false,
          homeBenefitSummary: this._buildHomeBenefitSummary(orderPreview, this.data.claimableCoupons),
        };
        if (this.data.billSummary) {
          update.billSummary = this._enrichBillSummaryWithPreview(this.data.billSummary, orderPreview);
        }
        this.setData(update);
      } else {
        this.setData({
          orderPreview: null,
          orderPreviewLoading: false,
          homeBenefitSummary: this._buildHomeBenefitSummary(null, this.data.claimableCoupons),
        });
      }
    }.bind(this)).catch(function () {
      this.setData({
        orderPreview: null,
        orderPreviewLoading: false,
        homeBenefitSummary: this._buildHomeBenefitSummary(null, this.data.claimableCoupons),
      });
    }.bind(this));
  },

}
