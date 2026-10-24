/**
 * Pruebas de Caracterización (Golden Master)
 * Diseñadas con el runner nativo de Node.js (node:test y node:assert).
 * Su propósito es congelar el comportamiento actual del monolito antes de refactorizar.
 */

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const legacyService = require('../src/legacy_order_service');

test.describe('Pruebas de Caracterización del Monolito de Órdenes', () => {

  test.beforeEach(() => {
    // Resetear inventario a estado conocido
    legacyService.inventory['PROD-001'].stock = 20;
    legacyService.inventory['PROD-002'].stock = 10;
    legacyService.inventory['PROD-003'].stock = 0;
  });

  test('Debe procesar orden VIP local con descuento y envío gratis', () => {
    const order = {
      customer_id: 'CUST-TEST-1',
      user_type: 'VIP',
      coupon: 'DESC5',
      is_international: false,
      payment_method: 'CREDIT_CARD',
      card_number: '4111222233334444',
      items: [{ id: 'PROD-001', qty: 2 }] // 80 * 2 = 160
    };

    const res = legacyService.process_order(order);

    assert.equal(res.ok, true);
    assert.equal(res.data.subtotal, 160);
    assert.equal(res.data.discount, 13); // 160 * 0.05 (8) + 5 (DESC5) = 13
    assert.equal(res.data.shipping, 1.5); // Local > 100 gratis
    assert.equal(res.data.tax, 27.93); // (160 - 13) * 0.19 = 27.93
    assert.equal(res.data.total, 174.93);
    assert.equal(res.data.payment_status, 'PAID');
  });

  test('Debe rechazar orden cuando no hay stock disponible', () => {
    const order = {
      customer_id: 'CUST-TEST-2',
      user_type: 'REGULAR',
      payment_method: 'CASH',
      items: [{ id: 'PROD-003', qty: 1 }] // Stock 0
    };

    const res = legacyService.process_order(order);

    assert.equal(res.ok, false);
    assert.equal(res.msg, 'OUT_OF_STOCK_PROD-003');
  });

  test('Debe rechazar tarjeta de crédito con longitud insuficiente', () => {
    const order = {
      customer_id: 'CUST-TEST-3',
      user_type: 'REGULAR',
      payment_method: 'CREDIT_CARD',
      card_number: '123', // Inválida
      items: [{ id: 'PROD-001', qty: 1 }]
    };

    const stockAntes = legacyService.inventory['PROD-001'].stock;
    const res = legacyService.process_order(order);

    assert.equal(res.ok, false);
    assert.equal(res.msg, 'INVALID_CARD');
    // Verifica que el rollback de stock haya ocurrido
    assert.equal(legacyService.inventory['PROD-001'].stock, stockAntes);
  });
});
