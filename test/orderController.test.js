import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { calculatePricing } from '../src/utils/pricing.js';
import { couponDiscount, availableCouponFilter } from '../src/utils/coupons.js';

async function setup() {
  const state = { orders: [], coupon: { _id: 'c1', code: 'SAVE10', type: 'percent', value: 10 }, open: true, aggregate: null, reserved: false };
  class Order {
    constructor(values) { Object.assign(this, values); this._id = 'order-1'; }
    async save() { state.orders.push(this); }
    static async aggregate(pipeline) { state.aggregate = pipeline; return []; }
    static async findById() { return state.orders[0] ?? null; }
  }
  const refs = {
    '../models/ordersModel.js': { Order },
    '../models/userModel.js': { User: { findById: async () => ({ name: 'Customer', orders: [], save: async () => {} }) } },
    '../models/restaurantModel.js': { Restaurant: { findById: async () => ({ r_name: 'Kitchen', is_open: state.open, orders: [], save: async () => {} }) } },
    '../models/cartModel.js': { Cart_items: { findById: () => ({ populate: async () => ({ user_id: 'user-1', res_id: 'r1', menu: [{ menu_item_id: { _id: 'm1', name: 'Dish', price: 300 }, quantity: 1 }] }) }) } },
    '../config/razorpayConfig.js': { razorpayInstance: { orders: { create: async ({ amount }) => ({ id: 'rp1', amount, currency: 'INR' }) } } },
    '../models/paymentModel.js': { Payment: { create: async () => {} } },
    '../services/ownerNotificationService.js': { notifyOwner: async () => {} },
    '../models/couponModel.js': { Coupon: { findOneAndUpdate: async () => { state.reserved = true; return state.coupon; }, updateOne: async () => { state.reserved = false; } } },
    '../utils/pricing.js': { calculatePricing }, '../utils/coupons.js': { couponDiscount, availableCouponFilter },
    mongoose: { default: { Types: { ObjectId: class ObjectId {} } } },
  };
  const context = vm.createContext({ console, Date });
  const source = await readFile(new URL('../src/controllers/orderController.js', import.meta.url), 'utf8');
  const mod = new vm.SourceTextModule(source, { context });
  await mod.link((specifier) => {
    const exports = refs[specifier];
    if (!exports) throw new Error(`Unexpected dependency: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () { for (const [name, value] of Object.entries(exports)) this.setExport(name, value); }, { context });
  });
  await mod.evaluate();
  return { state, controller: mod.namespace };
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }

test('COD order stores tiered fees and server-calculated coupon discount', async () => {
  const { state, controller } = await setup();
  const res = response();
  await controller.createOrder({ user: { _id: 'user-1' }, body: { cartId: 'cart', payment_method: 'cod', coupon_code: 'save10' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(state.orders[0].service_fee, 12);
  assert.equal(state.orders[0].discount, 30);
  assert.equal(state.orders[0].total_amount, 314);
  assert.equal(res.body.pricing.total, 314);
  assert.equal(state.reserved, true);
});

test('closed restaurants reject orders before reserving a coupon', async () => {
  const { state, controller } = await setup(); state.open = false;
  const res = response();
  await controller.createOrder({ user: { _id: 'user-1' }, body: { cartId: 'cart', payment_method: 'cod', coupon_code: 'save10' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(state.orders.length, 0);
  assert.equal(state.reserved, false);
});

test('admin order list is not restricted to one restaurant', async () => {
  const { state, controller } = await setup(); const res = response();
  await controller.getAllOrders({ user: { role: 'admin', _id: 'admin-1' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(state.aggregate.some(stage => stage.$match?.res_id), false);
});

test('admin can advance an order for any restaurant', async () => {
  const { state, controller } = await setup();
  state.orders.push({ res_id: 'other-restaurant', order_status: 'pending', save: async () => {} });
  const res = response();
  await controller.updateOrderStatus({ user: { _id: 'admin-1' }, params: { id: 'order-1' }, body: { order_status: 'accepted' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(state.orders[0].order_status, 'accepted');
});

test('rejects changed checkout totals and releases the coupon reservation', async () => {
  const { state, controller } = await setup();
  const res = response();
  await controller.createOrder({ user: { _id: 'user-1' }, body: { cartId: 'cart', payment_method: 'cod', coupon_code: 'save10', expected_total: 300 } }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(state.orders.length, 0);
  assert.equal(state.reserved, false);
});

test('online order sends the discounted server total to the payment provider', async () => {
  const { state, controller } = await setup();
  const res = response();
  await controller.createOrder({ user: { _id: 'user-1' }, body: { cartId: 'cart', payment_method: 'online', coupon_code: 'save10', expected_total: 314 } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.razorpayOrder.amount, 31400);
  assert.equal(state.orders[0].total_amount, 314);
});
