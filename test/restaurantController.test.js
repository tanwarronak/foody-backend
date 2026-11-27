import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function setup() {
  const state = { updated: null };
  const dependencies = {
    '../models/restaurantModel.js': { Restaurant: { findByIdAndUpdate: async (id, changes) => { state.updated = { id, ...changes }; return state.updated; } } },
    '../models/ordersModel.js': { Order: {} },
    '../services/azureStorageService.js': { default: {} },
  };
  const context = vm.createContext({});
  const mod = new vm.SourceTextModule(await readFile(new URL('../src/controllers/restaurantController.js', import.meta.url), 'utf8'), { context });
  await mod.link((specifier) => {
    const exports = dependencies[specifier];
    if (!exports) throw new Error(`Unexpected dependency: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () { for (const [name, value] of Object.entries(exports)) this.setExport(name, value); }, { context });
  });
  await mod.evaluate();
  return { state, controller: mod.namespace };
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }

test('admin can close and reopen a restaurant', async () => {
  const { state, controller } = await setup();
  for (const is_open of [false, true]) {
    const res = response();
    await controller.setRestaurantStatus({ params: { id: 'r1' }, body: { is_open } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(state.updated.id, 'r1');
    assert.equal(state.updated.is_open, is_open);
  }
});
test('restaurant status rejects non-boolean values', async () => {
  const { state, controller } = await setup(); const res = response();
  await controller.setRestaurantStatus({ params: { id: 'r1' }, body: { is_open: 'false' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(state.updated, null);
});
