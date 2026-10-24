const { process_order, inventory, processedOrders } = require('../src/legacy_order_service');
console.log('--- INICIO DE SIMULACIÓN DE TRÁFICO ---');
const orders = [
  { customer_id: 'CUST-1001', user_type: 'VIP', coupon: 'DESC5', is_international: false, payment_method: 'CREDIT_CARD', card_number: '4111111111111111', items: [{ id: 'PROD-001', qty: 2 }] },
  { customer_id: 'CUST-2002', user_type: 'REGULAR', coupon: '', is_international: true, payment_method: 'CREDIT_CARD', card_number: '4222222222222222', items: [{ id: 'PROD-002', qty: 2 }] },
  { customer_id: 'CUST-3003', user_type: 'REGULAR', payment_method: 'CASH', items: [{ id: 'PROD-003', qty: 1 }] }
];
orders.forEach((order, index) => console.log(`Orden ${index + 1}:`, process_order(order)));
console.log('Total órdenes exitosas:', processedOrders.length);
console.log('Inventario restante:', JSON.stringify(inventory, null, 2));
