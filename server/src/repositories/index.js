/**
 * Data-access helpers that are shared across modules. Each lives next to the module that owns the data;
 * this index is the single import point for cross-module use (e.g. orders adding stock to a shop).
 */
module.exports = {
  auth: require('../modules/auth/auth.repository'),
  inventory: require('../modules/inventory/inventory.repository'),
  orders: require('../modules/orders/orders.repository'),
};
