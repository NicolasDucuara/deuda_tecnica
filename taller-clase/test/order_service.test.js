const test = require('node:test');
const assert = require('node:assert/strict');
const { process_order, inventory, processedOrders } = require('../src/legacy_order_service');

const initialStock = Object.fromEntries(Object.entries(inventory).map(([id, product]) => [id, product.stock]));
function resetState() {
  for (const [id, stock] of Object.entries(initialStock)) inventory[id].stock = stock;
  processedOrders.length = 0;
}
function order(overrides = {}) {
  return {
    customer_id: 'TEST-CUSTOMER', user_type: 'REGULAR', coupon: '',
    is_international: false, payment_method: 'CREDIT_CARD',
    card_number: '4111111111111111', items: [{ id: 'PROD-001', qty: 1 }],
    ...overrides
  };
}

test('VIP local con subtotal original superior a 150 paga envío express de 1.50 USD', () => {
  resetState();
  const request = order({ customer_id: 'VIP-LOCAL', user_type: 'VIP', items: [{ id: 'PROD-001', qty: 2 }] });
  const requestBefore = structuredClone(request);
  const result = process_order(request);
  assert.equal(result.ok, true);
  assert.equal(result.data.subtotal, 160);
  assert.equal(result.data.shipping, 1.5);
  assert.deepEqual(request, requestBefore, 'el servicio no debe mutar la entrada');
});

test('VIP internacional recibe subsidio de 10 USD sobre la tarifa agrupada de envío/aduanas', () => {
  resetState();
  const result = process_order(order({ customer_id: 'VIP-INT', user_type: 'VIP', is_international: true }));
  assert.equal(result.ok, true);
  assert.equal(result.data.shipping, 17.5);
  assert.equal(result.data.legacy_code, 2);
});

test('cliente regular internacional conserva la tarifa existente', () => {
  resetState();
  const result = process_order(order({ customer_id: 'REG-INT', is_international: true }));
  assert.equal(result.ok, true);
  assert.equal(result.data.shipping, 27.5);
});

test('cliente regular local conserva envío gratis cuando el subtotal gravable es al menos 100 USD', () => {
  resetState();
  const result = process_order(order({ items: [{ id: 'PROD-001', qty: 2 }] }));
  assert.equal(result.ok, true);
  assert.equal(result.data.shipping, 0);
});

test('carrito sin inventario suficiente no descuenta stock', () => {
  resetState();
  const stockBefore = inventory['PROD-003'].stock;
  const result = process_order(order({ items: [{ id: 'PROD-003', qty: 1 }] }));
  assert.equal(result.ok, false);
  assert.equal(result.msg, 'OUT_OF_STOCK_PROD-003');
  assert.equal(inventory['PROD-003'].stock, stockBefore);
});

test('tarjeta inválida no reserva inventario ni registra la orden', () => {
  resetState();
  const stockBefore = inventory['PROD-001'].stock;
  const result = process_order(order({ card_number: '123' }));
  assert.deepEqual(result, { ok: false, msg: 'INVALID_CARD' });
  assert.equal(inventory['PROD-001'].stock, stockBefore);
  assert.equal(processedOrders.length, 0);
});

test('validación considera el total de líneas repetidas del mismo producto', () => {
  resetState();
  const result = process_order(order({ items: [
    { id: 'PROD-002', qty: 3 }, { id: 'PROD-002', qty: 2 }
  ] }));
  assert.equal(result.ok, false);
  assert.equal(result.msg, 'OUT_OF_STOCK_PROD-002');
  assert.equal(inventory['PROD-002'].stock, initialStock['PROD-002']);
});
