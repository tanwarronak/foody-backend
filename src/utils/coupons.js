export function couponDiscount(coupon, subtotal) {
  const amount = coupon.type === 'percent' ? subtotal * coupon.value / 100 : coupon.value;
  return Math.min(subtotal, Math.round(amount * 100) / 100);
}

export function validCouponValues({ code, type, value, expires_at, usage_limit }) {
  const expiry = new Date(expires_at);
  return typeof code === 'string' && /^[A-Z0-9_-]{3,40}$/.test(code.trim().toUpperCase()) &&
    ['fixed', 'percent'].includes(type) && Number.isFinite(value) && value > 0 &&
    (type !== 'percent' || value <= 100) && Number.isInteger(usage_limit) && usage_limit > 0 &&
    Number.isFinite(expiry.getTime()) && expiry > new Date();
}

export function availableCouponFilter(code) {
  return { code: code.trim().toUpperCase(), active: true, expires_at: { $gt: new Date() },
    $expr: { $lt: ['$usage_count', '$usage_limit'] } };
}
