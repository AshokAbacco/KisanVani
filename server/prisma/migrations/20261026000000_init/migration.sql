-- KisanVani initial schema
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SHOPKEEPER', 'FARMER', 'MANDI_OWNER', 'DRIVER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('VEGETABLE', 'FRUIT', 'LEAFY_GREEN', 'GRAIN', 'PULSE', 'SPICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LotType" AS ENUM ('LOOSE', 'BAGGED', 'CRATED', 'BOXED');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'PAUSED', 'SOLD_OUT', 'CLOSED');

-- CreateEnum
CREATE TYPE "InventoryTxnType" AS ENUM ('OPENING', 'SALE', 'SALE_CANCELLED', 'PURCHASE_RECEIPT', 'ORDER_RECEIPT', 'ADJUSTMENT', 'WASTAGE');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'CREDIT', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('SALE_INVOICE', 'CREDIT_COLLECTION', 'ORDER', 'SUPPLIER_PURCHASE', 'TRANSPORT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('ORDERED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('FARMER', 'MANDI', 'WHOLESALER', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('SHOP_FROM_FARMER', 'SHOP_FROM_MANDI', 'MANDI_FROM_FARMER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'ACCEPTED', 'REJECTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "TransportRequestStatus" AS ENUM ('OPEN', 'ASSIGNED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('TRACTOR', 'MINI_TRUCK', 'TEMPO', 'PICKUP', 'TRUCK', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VehicleDocumentType" AS ENUM ('REGISTRATION', 'INSURANCE', 'FITNESS', 'PERMIT', 'POLLUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "mobile" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "avatarUrl" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "line1" TEXT,
    "village" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "farmName" TEXT,
    "landAcres" DECIMAL(8,2),
    "primaryCrops" TEXT[],
    "upiId" TEXT,
    "bankAccount" TEXT,
    "ifsc" TEXT,
    "addressId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "shopCode" TEXT NOT NULL,
    "gstin" TEXT,
    "upiId" TEXT,
    "receiptFooter" TEXT,
    "addressId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandi_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mandiName" TEXT NOT NULL,
    "marketYardName" TEXT,
    "licenseNumber" TEXT,
    "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "upiId" TEXT,
    "addressId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mandi_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3),
    "experienceYrs" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "addressId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "capacityKg" DECIMAL(12,3) NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerMobile" TEXT,
    "insurancePolicyNo" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "fitnessExpiry" TIMESTAMP(3),
    "permitNumber" TEXT,
    "permitExpiry" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "VehicleDocumentType" NOT NULL,
    "documentNumber" TEXT,
    "fileUrl" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "localName" TEXT,
    "categoryId" TEXT NOT NULL,
    "emoji" TEXT,
    "imageUrl" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvest_listings" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "variety" TEXT,
    "grade" TEXT,
    "description" TEXT,
    "harvestAt" TIMESTAMP(3) NOT NULL,
    "totalQuantityKg" DECIMAL(12,3) NOT NULL,
    "availableQuantityKg" DECIMAL(12,3) NOT NULL,
    "pricePerKg" DECIMAL(14,2) NOT NULL,
    "minOrderKg" DECIMAL(12,3) NOT NULL,
    "village" TEXT,
    "district" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "images" TEXT[],
    "freshnessNotes" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "harvest_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandi_lots" (
    "id" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "mandiOwnerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "commodityName" TEXT NOT NULL,
    "variety" TEXT,
    "grade" TEXT,
    "lotType" "LotType" NOT NULL DEFAULT 'LOOSE',
    "unitSizeKg" DECIMAL(10,3),
    "totalWeightKg" DECIMAL(12,3) NOT NULL,
    "availableWeightKg" DECIMAL(12,3) NOT NULL,
    "pricePerKg" DECIMAL(14,2) NOT NULL,
    "minOrderKg" DECIMAL(12,3) NOT NULL,
    "marketYardName" TEXT NOT NULL,
    "location" TEXT,
    "district" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "qualityNotes" TEXT,
    "loadingInfo" TEXT,
    "images" TEXT[],
    "status" "LotStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mandi_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityKg" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "sellingPricePerKg" DECIMAL(14,2) NOT NULL,
    "costPricePerKg" DECIMAL(14,2),
    "lowStockThresholdKg" DECIMAL(12,3) NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" "InventoryTxnType" NOT NULL,
    "quantityChangeKg" DECIMAL(12,3) NOT NULL,
    "balanceAfterKg" DECIMAL(12,3) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "address" TEXT,
    "creditBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "creditLimit" DECIMAL(14,2) NOT NULL DEFAULT 5000,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "type" "SupplierType" NOT NULL DEFAULT 'OTHER',
    "linkedUserId" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerMobile" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "amountPaid" DECIMAL(14,2) NOT NULL,
    "creditAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'COMPLETED',
    "idempotencyKey" TEXT NOT NULL,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantityKg" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "sales_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "total" DECIMAL(14,2) NOT NULL,
    "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityKg" DECIMAL(12,3) NOT NULL,
    "receivedQuantityKg" DECIMAL(12,3),
    "unitCost" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentStatus" "OrderPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "deliveryAddress" TEXT,
    "expectedDeliveryAt" TIMESTAMP(3),
    "notes" TEXT,
    "rejectionReason" TEXT,
    "cancelReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "harvestListingId" TEXT,
    "mandiLotId" TEXT,
    "productId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantityKg" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "deliveredQuantityKg" DECIMAL(12,3),
    "receivedQuantityKg" DECIMAL(12,3),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_requests" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "orderId" TEXT,
    "commodity" TEXT NOT NULL,
    "expectedQuantityKg" DECIMAL(12,3) NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupLat" DECIMAL(9,6),
    "pickupLng" DECIMAL(9,6),
    "pickupContactName" TEXT NOT NULL,
    "pickupContactPhone" TEXT NOT NULL,
    "dropAddress" TEXT NOT NULL,
    "dropLat" DECIMAL(9,6),
    "dropLng" DECIMAL(9,6),
    "dropContactName" TEXT,
    "dropContactPhone" TEXT,
    "preferredVehicleType" "VehicleType",
    "preferredPickupAt" TIMESTAMP(3),
    "offeredCharge" DECIMAL(14,2),
    "status" "TransportRequestStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "tripNumber" TEXT NOT NULL,
    "transportRequestId" TEXT,
    "orderId" TEXT,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assignedById" TEXT,
    "commodity" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupLat" DECIMAL(9,6),
    "pickupLng" DECIMAL(9,6),
    "pickupContactName" TEXT NOT NULL,
    "pickupContactPhone" TEXT NOT NULL,
    "dropAddress" TEXT NOT NULL,
    "dropLat" DECIMAL(9,6),
    "dropLng" DECIMAL(9,6),
    "dropContactName" TEXT,
    "dropContactPhone" TEXT,
    "expectedQuantityKg" DECIMAL(12,3) NOT NULL,
    "loadedQuantityKg" DECIMAL(12,3),
    "deliveredQuantityKg" DECIMAL(12,3),
    "transportCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "TripStatus" NOT NULL DEFAULT 'ASSIGNED',
    "acceptedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "estimatedArrivalAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "statusReason" TEXT,
    "trackingActive" BOOLEAN NOT NULL DEFAULT false,
    "lastLat" DECIMAL(9,6),
    "lastLng" DECIMAL(9,6),
    "lastLocationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_events" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "fromStatus" "TripStatus",
    "toStatus" "TripStatus" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_locations" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "accuracyM" DECIMAL(10,2),
    "speedMps" DECIMAL(8,2),
    "heading" DECIMAL(6,2),
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_proofs" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "fileUrl" TEXT,
    "receiverName" TEXT NOT NULL,
    "receiverMobile" TEXT,
    "deliveredQuantityKg" DECIMAL(12,3) NOT NULL,
    "notes" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT,
    "notes" TEXT,
    "payerId" TEXT,
    "payeeId" TEXT,
    "recordedById" TEXT NOT NULL,
    "invoiceId" TEXT,
    "customerId" TEXT,
    "orderId" TEXT,
    "purchaseOrderId" TEXT,
    "tripId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "settlementNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "payeeId" TEXT NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "commissionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "document_counters" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_counters_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "addresses_district_idx" ON "addresses"("district");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_profiles_userId_key" ON "farmer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_profiles_addressId_key" ON "farmer_profiles"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_profiles_userId_key" ON "shop_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_profiles_shopCode_key" ON "shop_profiles"("shopCode");

-- CreateIndex
CREATE UNIQUE INDEX "shop_profiles_addressId_key" ON "shop_profiles"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "mandi_profiles_userId_key" ON "mandi_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mandi_profiles_licenseNumber_key" ON "mandi_profiles"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "mandi_profiles_addressId_key" ON "mandi_profiles"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_userId_key" ON "driver_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_licenseNumber_key" ON "driver_profiles"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_addressId_key" ON "driver_profiles"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registrationNumber_key" ON "vehicles"("registrationNumber");

-- CreateIndex
CREATE INDEX "vehicles_driverId_idx" ON "vehicles"("driverId");

-- CreateIndex
CREATE INDEX "vehicles_verificationStatus_idx" ON "vehicles"("verificationStatus");

-- CreateIndex
CREATE INDEX "vehicle_documents_vehicleId_idx" ON "vehicle_documents"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_name_key" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "harvest_listings_status_categoryId_idx" ON "harvest_listings"("status", "categoryId");

-- CreateIndex
CREATE INDEX "harvest_listings_farmerId_idx" ON "harvest_listings"("farmerId");

-- CreateIndex
CREATE INDEX "harvest_listings_district_idx" ON "harvest_listings"("district");

-- CreateIndex
CREATE UNIQUE INDEX "mandi_lots_lotCode_key" ON "mandi_lots"("lotCode");

-- CreateIndex
CREATE INDEX "mandi_lots_status_categoryId_idx" ON "mandi_lots"("status", "categoryId");

-- CreateIndex
CREATE INDEX "mandi_lots_mandiOwnerId_idx" ON "mandi_lots"("mandiOwnerId");

-- CreateIndex
CREATE INDEX "inventory_items_shopId_idx" ON "inventory_items"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_shopId_productId_key" ON "inventory_items"("shopId", "productId");

-- CreateIndex
CREATE INDEX "inventory_transactions_inventoryItemId_createdAt_idx" ON "inventory_transactions"("inventoryItemId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_transactions_referenceType_referenceId_idx" ON "inventory_transactions"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "customers_shopId_name_idx" ON "customers"("shopId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_shopId_mobile_key" ON "customers"("shopId", "mobile");

-- CreateIndex
CREATE INDEX "suppliers_shopId_name_idx" ON "suppliers"("shopId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_invoiceNumber_key" ON "sales_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "sales_invoices_shopId_createdAt_idx" ON "sales_invoices"("shopId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_shopId_idempotencyKey_key" ON "sales_invoices"("shopId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "sales_invoice_items_invoiceId_idx" ON "sales_invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "sales_invoice_items_productId_idx" ON "sales_invoice_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_shopId_createdAt_idx" ON "purchase_orders"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_buyerId_status_idx" ON "orders"("buyerId", "status");

-- CreateIndex
CREATE INDEX "orders_sellerId_status_idx" ON "orders"("sellerId", "status");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "orders_buyerId_idempotencyKey_key" ON "orders"("buyerId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_harvestListingId_idx" ON "order_items"("harvestListingId");

-- CreateIndex
CREATE INDEX "order_items_mandiLotId_idx" ON "order_items"("mandiLotId");

-- CreateIndex
CREATE INDEX "order_status_history_orderId_createdAt_idx" ON "order_status_history"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "transport_requests_requestNumber_key" ON "transport_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "transport_requests_status_idx" ON "transport_requests"("status");

-- CreateIndex
CREATE INDEX "transport_requests_requesterId_idx" ON "transport_requests"("requesterId");

-- CreateIndex
CREATE INDEX "transport_requests_orderId_idx" ON "transport_requests"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "trips_tripNumber_key" ON "trips"("tripNumber");

-- CreateIndex
CREATE INDEX "trips_driverId_status_idx" ON "trips"("driverId", "status");

-- CreateIndex
CREATE INDEX "trips_orderId_idx" ON "trips"("orderId");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "trip_events_tripId_createdAt_idx" ON "trip_events"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "trip_locations_tripId_recordedAt_idx" ON "trip_locations"("tripId", "recordedAt");

-- CreateIndex
CREATE INDEX "delivery_proofs_tripId_idx" ON "delivery_proofs"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_key" ON "payments"("paymentNumber");

-- CreateIndex
CREATE INDEX "payments_payerId_createdAt_idx" ON "payments"("payerId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_payeeId_createdAt_idx" ON "payments"("payeeId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_purpose_createdAt_idx" ON "payments"("purpose", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_settlementNumber_key" ON "settlements"("settlementNumber");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_orderId_key" ON "settlements"("orderId");

-- CreateIndex
CREATE INDEX "settlements_payeeId_status_idx" ON "settlements"("payeeId", "status");

-- CreateIndex
CREATE INDEX "settlements_payerId_status_idx" ON "settlements"("payerId", "status");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_profiles" ADD CONSTRAINT "farmer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_profiles" ADD CONSTRAINT "farmer_profiles_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_profiles" ADD CONSTRAINT "shop_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_profiles" ADD CONSTRAINT "shop_profiles_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandi_profiles" ADD CONSTRAINT "mandi_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandi_profiles" ADD CONSTRAINT "mandi_profiles_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_listings" ADD CONSTRAINT "harvest_listings_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_listings" ADD CONSTRAINT "harvest_listings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_listings" ADD CONSTRAINT "harvest_listings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandi_lots" ADD CONSTRAINT "mandi_lots_mandiOwnerId_fkey" FOREIGN KEY ("mandiOwnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandi_lots" ADD CONSTRAINT "mandi_lots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandi_lots" ADD CONSTRAINT "mandi_lots_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_harvestListingId_fkey" FOREIGN KEY ("harvestListingId") REFERENCES "harvest_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_mandiLotId_fkey" FOREIGN KEY ("mandiLotId") REFERENCES "mandi_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_transportRequestId_fkey" FOREIGN KEY ("transportRequestId") REFERENCES "transport_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_locations" ADD CONSTRAINT "trip_locations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "sales_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_settings" ADD CONSTRAINT "application_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
