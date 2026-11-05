class VendorUser {
  final String userId;
  final String email;
  final String name;
  final String role;
  final String? vendorId;
  final String? vendorCode;
  final String? storeSlug;
  final String? storeName;
  final String status;
  final bool isSubscriptionExpired;
  final String subscriptionStatus;
  final bool hyperlocalEnabled;
  final bool razorpayEnabled;
  final bool shiprocketEnabled;
  final bool smsGatewayEnabled;
  final bool customDomainEnabled;
  final bool whatsappAlertsEnabled;

  VendorUser({
    required this.userId,
    required this.email,
    required this.name,
    required this.role,
    this.vendorId,
    this.vendorCode,
    this.storeSlug,
    this.storeName,
    required this.status,
    this.isSubscriptionExpired = false,
    this.subscriptionStatus = 'active',
    this.hyperlocalEnabled = false,
    this.razorpayEnabled = false,
    this.shiprocketEnabled = false,
    this.smsGatewayEnabled = false,
    this.customDomainEnabled = false,
    this.whatsappAlertsEnabled = false,
  });

  factory VendorUser.fromJson(Map<String, dynamic> json) {
    return VendorUser(
      userId: json['user_id'] ?? json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? 'Vendor Admin',
      role: json['role'] ?? 'VENDOR_ADMIN',
      vendorId: json['vendor_id']?.toString(),
      vendorCode: json['vendor_code'],
      storeSlug: json['store_slug'],
      storeName: json['store_name'],
      status: json['status'] ?? 'active',
      isSubscriptionExpired: json['is_subscription_expired'] ?? false,
      subscriptionStatus: json['subscription_status'] ?? 'active',
      hyperlocalEnabled: json['hyperlocal_enabled'] ?? false,
      razorpayEnabled: json['razorpay_enabled'] ?? false,
      shiprocketEnabled: json['shiprocket_enabled'] ?? false,
      smsGatewayEnabled: json['sms_gateway_enabled'] ?? false,
      customDomainEnabled: json['custom_domain_enabled'] ?? false,
      whatsappAlertsEnabled: json['whatsapp_alerts_enabled'] ?? false,
    );
  }
}

class OrderItemModel {
  final String id;
  final String productName;
  final double price;
  final int quantity;
  final double total;

  OrderItemModel({
    required this.id,
    required this.productName,
    required this.price,
    required this.quantity,
    required this.total,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      id: json['id']?.toString() ?? '',
      productName: json['product_name'] ?? 'Product',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      quantity: json['quantity'] as int? ?? 1,
      total: (json['total'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class VendorOrderModel {
  final String id;
  final String orderNumber;
  final String customerName;
  final String customerPhone;
  final String? customerEmail;
  final String shippingAddress;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final String orderStatus;
  final String? courierName;
  final String? trackingNumber;
  final DateTime createdAt;
  final List<OrderItemModel> items;
  final bool isHyperlocalDelivery;

  VendorOrderModel({
    required this.id,
    required this.orderNumber,
    required this.customerName,
    required this.customerPhone,
    this.customerEmail,
    required this.shippingAddress,
    required this.totalAmount,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.orderStatus,
    this.courierName,
    this.trackingNumber,
    required this.createdAt,
    required this.items,
    this.isHyperlocalDelivery = false,
  });

  factory VendorOrderModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    final itemsList = rawItems.map((e) => OrderItemModel.fromJson(e)).toList();

    DateTime parsedDate;
    try {
      parsedDate = json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now();
    } catch (_) {
      parsedDate = DateTime.now();
    }

    final courier = json['courier_name']?.toString() ?? '';
    final address = json['shipping_address']?.toString() ?? '';
    final bool isLocal = courier.toLowerCase().contains('hyperlocal') ||
        courier.toLowerCase().contains('local') ||
        address.toLowerCase().contains('km') ||
        (json['is_hyperlocal'] == true);

    return VendorOrderModel(
      id: json['id']?.toString() ?? '',
      orderNumber: json['order_number'] ?? '',
      customerName: json['customer_name'] ?? 'Customer',
      customerPhone: json['customer_phone'] ?? '',
      customerEmail: json['customer_email'],
      shippingAddress: address,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['payment_method'] ?? 'COD',
      paymentStatus: json['payment_status'] ?? 'PENDING',
      orderStatus: json['order_status'] ?? 'NEW',
      courierName: json['courier_name'],
      trackingNumber: json['tracking_number'],
      createdAt: parsedDate,
      items: itemsList,
      isHyperlocalDelivery: isLocal,
    );
  }
}

class VendorProductModel {
  final String id;
  final String name;
  final String slug;
  final double regularPrice;
  final double? salePrice;
  final String sku;
  final int stockQuantity;
  final String status;
  final String? thumbnailUrl;

  VendorProductModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.regularPrice,
    this.salePrice,
    required this.sku,
    required this.stockQuantity,
    required this.status,
    this.thumbnailUrl,
  });

  bool get isInStock => status == 'active' && stockQuantity > 0;

  factory VendorProductModel.fromJson(Map<String, dynamic> json) {
    return VendorProductModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      regularPrice: (json['regular_price'] as num?)?.toDouble() ?? 0.0,
      salePrice: (json['sale_price'] as num?)?.toDouble(),
      sku: json['sku'] ?? '',
      stockQuantity: json['stock_quantity'] as int? ?? 0,
      status: json['status'] ?? 'active',
      thumbnailUrl: json['thumbnail_url'],
    );
  }
}

class VendorNotificationModel {
  final String id;
  final String title;
  final String message;
  final String notificationType;
  final bool isRead;
  final String? actionUrl;
  final DateTime createdAt;

  VendorNotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.notificationType,
    required this.isRead,
    this.actionUrl,
    required this.createdAt,
  });

  factory VendorNotificationModel.fromJson(Map<String, dynamic> json) {
    DateTime parsedDate;
    try {
      parsedDate = json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now();
    } catch (_) {
      parsedDate = DateTime.now();
    }

    return VendorNotificationModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? 'Notification',
      message: json['message'] ?? '',
      notificationType: json['notification_type'] ?? 'SYSTEM',
      isRead: json['is_read'] ?? false,
      actionUrl: json['action_url'],
      createdAt: parsedDate,
    );
  }
}

