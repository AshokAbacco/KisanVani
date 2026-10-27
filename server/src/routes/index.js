const router = require('express').Router();

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/settings', require('../modules/settings/settings.routes'));
router.use('/admin', require('../modules/admin/admin.routes'));
router.use('/categories', require('../modules/categories/categories.routes'));
router.use('/products', require('../modules/products/products.routes'));
router.use('/shop', require('../modules/shop/shop.routes'));
router.use('/inventory', require('../modules/inventory/inventory.routes'));
router.use('/billing', require('../modules/billing/billing.routes'));
router.use('/customers', require('../modules/customers/customers.routes'));
router.use('/suppliers', require('../modules/suppliers/suppliers.routes'));
router.use('/procurement', require('../modules/procurement/procurement.routes'));
router.use('/farmers', require('../modules/farmer/farmer.routes'));
router.use('/mandi', require('../modules/mandi/mandi.routes'));
router.use('/orders', require('../modules/orders/orders.routes'));
router.use('/drivers', require('../modules/driver/driver.routes'));
router.use('/vehicles', require('../modules/vehicle/vehicle.routes'));
router.use('/transport', require('../modules/transport/transport.routes'));
router.use('/tracking', require('../modules/tracking/tracking.routes'));
router.use('/payments', require('../modules/payments/payments.routes'));
router.use('/settlements', require('../modules/settlements/settlements.routes'));
router.use('/notifications', require('../modules/notifications/notifications.routes'));
router.use('/reports', require('../modules/reports/reports.routes'));

module.exports = router;
