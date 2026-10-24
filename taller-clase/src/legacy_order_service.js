// Servicio de procesamiento de órdenes. Refactor de la versión legacy para el taller.

const CONFIG = Object.freeze({ taxRate: 0.19, currency: 'USD', localShippingFee: 4.5 });

const inventory = {
  'PROD-001': { name: 'Teclado Mecánico', stock: 15, price: 80.0 },
  'PROD-002': { name: 'Monitor 4K', stock: 4, price: 320.0 },
  'PROD-003': { name: 'Mouse Ergonómico', stock: 0, price: 45.0 },
  'PROD-004': { name: 'Cable USB-C', stock: 50, price: 12.0 }
};

const processedOrders = [];

function validateOrder(order) {
  if (!order) return { ok: false, msg: 'ERR_NULL_REQ' };
  if (!order.customer_id || typeof order.customer_id !== 'string') {
    return { ok: false, msg: 'ERR_INVALID_CUST' };
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return { ok: false, msg: 'EMPTY_CART' };
  }
  for (const item of order.items) {
    if (!item || typeof item.id !== 'string' || !Number.isInteger(item.qty) || item.qty <= 0) {
      return { ok: false, msg: 'ERR_INVALID_ITEM' };
    }
    if (!inventory[item.id]) return { ok: false, msg: `PROD_NOT_FOUND_${item.id}` };
  }
  const requestedByProduct = new Map();
  for (const item of order.items) {
    requestedByProduct.set(item.id, (requestedByProduct.get(item.id) || 0) + item.qty);
  }
  for (const [productId, quantity] of requestedByProduct) {
    if (inventory[productId].stock < quantity) return { ok: false, msg: `OUT_OF_STOCK_${productId}` };
  }
  return { ok: true };
}

function calculateDiscounts(userType, coupon, subtotal) {
  let discountAmount = 0;
  if (userType === 'VIP') {
    discountAmount = subtotal > 200 ? subtotal * 0.10 : subtotal * 0.05;
  } else if (subtotal > 500) {
    discountAmount = subtotal * 0.08;
  }
  // El cupón FLASH25 no se combina con DESC5; esta rama implementa la regla de Equipo B
  // sin apropiarse de la funcionalidad FLASH25 que corresponde al Equipo A.
  if (coupon === 'DESC5' && (subtotal - discountAmount) > 20) discountAmount += 5.0;
  return Number(discountAmount.toFixed(2));
}

function calculateTaxesAndShipping(taxableSubtotal, isInternational, options = {}) {
  const tax = taxableSubtotal * CONFIG.taxRate;
  let shipping = 0;
  const userType = options.userType || 'REGULAR';
  const originalSubtotal = options.originalSubtotal ?? taxableSubtotal;
  const itemCount = options.itemCount || 0;

  if (isInternational) {
    // En el legado, transporte y aduanas están agrupados en una sola tarifa.
    shipping = 25.0 + (itemCount * 2.5);
    if (userType === 'VIP') shipping = Math.max(0, shipping - 10.0);
  } else if (userType === 'VIP' && originalSubtotal > 150) {
    // Regla Equipo B: envío express prioritario por tarifa fija de USD 1.50.
    shipping = 1.50;
  } else if (taxableSubtotal < 100.0) {
    shipping = CONFIG.localShippingFee;
  }
  return { tax: Number(tax.toFixed(2)), shipping: Number(shipping.toFixed(2)) };
}

function reserveInventory(items) {
  const reservedItems = [];
  try {
    for (const item of items) {
      inventory[item.item_id].stock -= item.qty;
      reservedItems.push({ item_id: item.item_id, qty: item.qty });
    }
  } catch (error) {
    rollbackInventory(reservedItems);
    throw error;
  }
  return reservedItems;
}

function rollbackInventory(reservedItems) {
  for (const item of reservedItems) {
    if (inventory[item.item_id]) inventory[item.item_id].stock += item.qty;
  }
}

function process_order(orderRequest) {
  const validation = validateOrder(orderRequest);
  if (!validation.ok) return validation;

  const itemsProcessed = orderRequest.items.map((item) => {
    const product = inventory[item.id];
    return {
      item_id: item.id,
      name: product.name,
      qty: item.qty,
      unit_price: product.price,
      subtotal: Number((product.price * item.qty).toFixed(2))
    };
  });
  const subtotal = Number(itemsProcessed.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  const discountAmount = calculateDiscounts(orderRequest.user_type, orderRequest.coupon, subtotal);
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const { tax, shipping } = calculateTaxesAndShipping(taxableSubtotal, Boolean(orderRequest.is_international), {
    userType: orderRequest.user_type,
    originalSubtotal: subtotal,
    itemCount: itemsProcessed.length
  });
  const finalTotal = Number((taxableSubtotal + tax + shipping).toFixed(2));

  let paymentStatus;
  if (orderRequest.payment_method === 'CREDIT_CARD') {
    if (!orderRequest.card_number || orderRequest.card_number.length < 13) {
      return { ok: false, msg: 'INVALID_CARD' };
    }
    paymentStatus = 'PAID';
  } else if (orderRequest.payment_method === 'CASH') {
    paymentStatus = 'PENDING_CASH';
  } else {
    return { ok: false, msg: 'UNSUPPORTED_PAYMENT' };
  }

  // Solo se reserva inventario cuando la validación y el pago han sido aceptados.
  reserveInventory(itemsProcessed);
  const orderRecord = {
    order_id: `ORD-${Math.floor(Math.random() * 90000 + 10000)}`,
    customer_id: orderRequest.customer_id,
    date: new Date().toISOString(),
    items: itemsProcessed,
    subtotal,
    discount: discountAmount,
    tax,
    shipping,
    total: finalTotal,
    payment_status: paymentStatus,
    currency: CONFIG.currency,
    legacy_code: orderRequest.is_international ? 2 : 0
  };
  processedOrders.push(orderRecord);
  return { ok: true, data: orderRecord };
}

module.exports = {
  process_order,
  inventory,
  processedOrders,
  validateOrder,
  calculateDiscounts,
  calculateTaxesAndShipping,
  reserveInventory,
  rollbackInventory
};
