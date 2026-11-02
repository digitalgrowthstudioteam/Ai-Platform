class StoreConfig {
  final String storeName;
  final String storeSlug;
  final String? subdomain;
  final String? description;
  final String primaryColorHex;
  final String secondaryColorHex;
  final String? logoUrl;
  final String? bannerUrl;
  final String? contactEmail;
  final String? contactPhone;
  final String? businessAddress;
  final String openingHours;
  final bool codEnabled;
  final bool razorpayEnabled;
  final String? razorpayKeyId;
  final String appVersion;
  final bool shippingEnabled;
  final double shippingCharge;
  final double freeShippingMinOrder;
  final double codCharge;
  final String estimatedDeliveryDays;

  StoreConfig({
    required this.storeName,
    required this.storeSlug,
    this.subdomain,
    this.description,
    required this.primaryColorHex,
    required this.secondaryColorHex,
    this.logoUrl,
    this.bannerUrl,
    this.contactEmail,
    this.contactPhone,
    this.businessAddress,
    required this.openingHours,
    required this.codEnabled,
    required this.razorpayEnabled,
    this.razorpayKeyId,
    required this.appVersion,
    required this.shippingEnabled,
    required this.shippingCharge,
    required this.freeShippingMinOrder,
    required this.codCharge,
    required this.estimatedDeliveryDays,
  });

  factory StoreConfig.fromJson(Map<String, dynamic> json) {
    return StoreConfig(
      storeName: json['store_name'] ?? 'Store',
      storeSlug: json['store_slug'] ?? '',
      subdomain: json['subdomain'],
      description: json['description'],
      primaryColorHex: json['primary_color'] ?? '#2563EB',
      secondaryColorHex: json['secondary_color'] ?? '#1E293B',
      logoUrl: json['logo_url'],
      bannerUrl: json['banner_url'],
      contactEmail: json['contact_email'],
      contactPhone: json['contact_phone'],
      businessAddress: json['business_address'],
      openingHours: json['opening_hours'] ?? 'Mon - Sat: 9:00 AM - 9:00 PM',
      codEnabled: json['cod_enabled'] ?? true,
      razorpayEnabled: json['razorpay_enabled'] ?? false,
      razorpayKeyId: json['razorpay_key_id'],
      appVersion: json['app_version'] ?? '1.0.0',
      shippingEnabled: json['shipping_enabled'] ?? true,
      shippingCharge: (json['shipping_charge'] as num?)?.toDouble() ?? 0.0,
      freeShippingMinOrder: (json['free_shipping_min_order'] as num?)?.toDouble() ?? 999.0,
      codCharge: (json['cod_charge'] as num?)?.toDouble() ?? 0.0,
      estimatedDeliveryDays: json['estimated_delivery_days'] ?? '3-5 Business Days',
    );
  }
}

class BannerItem {
  final String id;
  final String title;
  final String? subtitle;
  final String imageUrl;
  final String? actionUrl;

  BannerItem({
    required this.id,
    required this.title,
    this.subtitle,
    required this.imageUrl,
    this.actionUrl,
  });

  factory BannerItem.fromJson(Map<String, dynamic> json) {
    return BannerItem(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      subtitle: json['subtitle'],
      imageUrl: json['image_url'] ?? '',
      actionUrl: json['action_url'],
    );
  }
}

class CategoryItem {
  final String id;
  final String name;
  final String slug;
  final String? imageUrl;

  CategoryItem({
    required this.id,
    required this.name,
    required this.slug,
    this.imageUrl,
  });

  factory CategoryItem.fromJson(Map<String, dynamic> json) {
    return CategoryItem(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      imageUrl: json['image_url'],
    );
  }
}

class ProductVariant {
  final String id;
  final String title;
  final String sku;
  final double price;
  final double? salePrice;
  final int stockQuantity;
  final List<String> images;
  final Map<String, dynamic> attributes;

  ProductVariant({
    required this.id,
    required this.title,
    required this.sku,
    required this.price,
    this.salePrice,
    required this.stockQuantity,
    required this.images,
    required this.attributes,
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      sku: json['sku'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      salePrice: (json['sale_price'] as num?)?.toDouble(),
      stockQuantity: json['stock_quantity'] ?? 0,
      images: (json['images'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      attributes: (json['attributes'] as Map<String, dynamic>?) ?? {},
    );
  }
}

class ProductItem {
  final String id;
  final String title;
  final String slug;
  final String? description;
  final double regularPrice;
  final double? salePrice;
  final double effectivePrice;
  final int stockQuantity;
  final String? category;
  final String? primaryImage;
  final List<String> galleryImages;
  final List<ProductVariant> variants;

  ProductItem({
    required this.id,
    required this.title,
    required this.slug,
    this.description,
    required this.regularPrice,
    this.salePrice,
    required this.effectivePrice,
    required this.stockQuantity,
    this.category,
    this.primaryImage,
    required this.galleryImages,
    required this.variants,
  });

  factory ProductItem.fromJson(Map<String, dynamic> json) {
    List<String> gallery = [];
    if (json['images'] != null) {
      gallery = (json['images'] as List<dynamic>).map((e) {
        if (e is Map<String, dynamic>) {
          return e['image_url']?.toString() ?? '';
        }
        return e.toString();
      }).where((s) => s.isNotEmpty).toList();
    }

    List<ProductVariant> vars = [];
    if (json['variants'] != null) {
      vars = (json['variants'] as List<dynamic>)
          .map((v) => ProductVariant.fromJson(v as Map<String, dynamic>))
          .toList();
    }

    return ProductItem(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description'],
      regularPrice: (json['regular_price'] as num?)?.toDouble() ?? 0.0,
      salePrice: (json['sale_price'] as num?)?.toDouble(),
      effectivePrice: (json['effective_price'] as num?)?.toDouble() ??
          ((json['sale_price'] as num?)?.toDouble() ??
              ((json['regular_price'] as num?)?.toDouble() ?? 0.0)),
      stockQuantity: json['stock_quantity'] ?? 0,
      category: json['category'],
      primaryImage: json['primary_image'] ?? (gallery.isNotEmpty ? gallery.first : null),
      galleryImages: gallery,
      variants: vars,
    );
  }
}

class CartItem {
  final ProductItem product;
  final ProductVariant? variant;
  int quantity;

  CartItem({
    required this.product,
    this.variant,
    this.quantity = 1,
  });

  double get unitPrice => variant != null
      ? (variant!.salePrice ?? variant!.price)
      : product.effectivePrice;

  double get totalPrice => unitPrice * quantity;

  String get itemKey => variant != null ? "${product.id}_${variant!.id}" : product.id;
}
