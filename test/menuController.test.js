import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function setup() {
  const state = { saved: [], existing: null, restaurants: true, items: [] };
  class MenuItem {
    constructor(fields) { Object.assign(this, fields); }
    async save() { state.saved.push(this); }
    static findById() { return { select: async () => state.existing, then: (resolve) => resolve(state.existing) }; }
    static findByIdAndDelete() { return { select: async () => state.existing }; }
    static find() { return { select: async () => state.items }; }
  }
  const context = vm.createContext({});
  const source = await readFile(new URL('../src/controllers/menuController.js', import.meta.url), 'utf8');
  const mod = new vm.SourceTextModule(source, { context });
  await mod.link(async (specifier) => {
    if (specifier.endsWith('restaurantModel.js')) return new vm.SyntheticModule(['Restaurant'], function () {
      this.setExport('Restaurant', { findById: async () => state.restaurants ? {} : null });
    }, { context });
    if (specifier.endsWith('menuModel.js')) return new vm.SyntheticModule(['Menu_item'], function () {
      this.setExport('Menu_item', MenuItem);
    }, { context });
    throw new Error(`Unexpected dependency: ${specifier}`);
  });
  await mod.evaluate();
  return { state, controller: mod.namespace };
}

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

const fields = { name: 'Dosa', description: 'Crisp dosa', price: 90, category: 'South Indian' };

test('creates a menu item without an image or storage service', async () => {
  const { state, controller } = await setup();
  const res = response();
  await controller.createMenuItem({ params: { restaurant_id: 'restaurant-1' }, body: fields }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(state.saved.length, 1);
  assert.equal(res.body.menuItem.name, 'Dosa');
  assert.equal(res.body.menuItem.res_id, 'restaurant-1');
  assert.equal('image' in res.body.menuItem, false);
  assert.equal('imageUrl' in res.body, false);
});

test('rejects missing fields and unknown restaurants without saving', async () => {
  const { state, controller } = await setup();
  const missing = response();
  await controller.createMenuItem({ params: { restaurant_id: 'r' }, body: { ...fields, name: '' } }, missing);
  assert.equal(missing.statusCode, 400);
  state.restaurants = false;
  const unknown = response();
  await controller.createMenuItem({ params: { restaurant_id: 'r' }, body: fields }, unknown);
  assert.equal(unknown.statusCode, 404);
  assert.equal(state.saved.length, 0);
});

test('updates menu fields without an image and leaves missing items as 404', async () => {
  const { state, controller } = await setup();
  const missing = response();
  await controller.updateMenuItem({ params: { id: 'missing' }, body: fields }, missing);
  assert.equal(missing.statusCode, 404);
  state.existing = { name: 'Old', save: async () => state.saved.push(state.existing) };
  const res = response();
  await controller.updateMenuItem({ params: { id: 'item-1' }, body: fields }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.updatedMenuItem.name, 'Dosa');
  assert.equal(res.body.updatedMenuItem.price, 90);
  assert.equal('imageUrl' in res.body, false);
  assert.equal(state.saved.length, 1);
});

test('returns menu items without needing image storage', async () => {
  const { state, controller } = await setup();
  state.items = [{ name: 'Dosa', price: 90 }];
  const all = response();
  await controller.getAllMenuItems({}, all);
  assert.equal(all.body.menuList[0].name, 'Dosa');
  const restaurant = response();
  await controller.getMenuItemById({ params: { restaurant_id: 'r' } }, restaurant);
  assert.equal(restaurant.body.menuItems[0].price, 90);
});
