import test from 'node:test';
import assert from 'node:assert/strict';
import { couponDiscount, validCouponValues, availableCouponFilter } from '../src/utils/coupons.js';

const base = { code: 'SAVE10', type: 'percent', value: 10, expires_at: '2099-01-01T00:00:00Z', usage_limit: 5 };
test('calculates percentage and fixed discounts without exceeding subtotal', () => {
  assert.equal(couponDiscount(base, 255), 25.5);
  assert.equal(couponDiscount({ type: 'fixed', value: 500 }, 100), 100);
});
test('validates coupon configuration', () => {
  assert.equal(validCouponValues(base), true);
  assert.equal(validCouponValues({ ...base, value: 101 }), false);
  assert.equal(validCouponValues({ ...base, usage_limit: 0 }), false);
  assert.equal(validCouponValues({ ...base, expires_at: '2000-01-01' }), false);
  assert.equal(validCouponValues({ ...base, code: 'bad code' }), false);
});
test('normalizes coupon codes and enforces expiry and usage limit in the reservation filter', () => {
  const filter = availableCouponFilter(' save10 ');
  assert.equal(filter.code, 'SAVE10');
  assert.equal(filter.active, true);
  assert.ok(filter.expires_at.$gt instanceof Date);
  assert.deepEqual(filter.$expr, { $lt: ['$usage_count', '$usage_limit'] });
});
