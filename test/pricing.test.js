import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePricing } from '../src/utils/pricing.js';

test('applies the highest tier only above each threshold', () => {
    for (const [subtotal, fee] of [[150, 0], [150.01, 6], [250, 6], [250.01, 12], [400, 12], [400.01, 18]]) {
        const price = calculatePricing(subtotal);
        assert.equal(price.serviceFee, fee);
        assert.equal(price.total, Math.round((subtotal + fee + 32) * 100) / 100);
    }
});

test('caps discounts at subtotal', () => {
    assert.equal(calculatePricing(100, 200).total, 32);
});
