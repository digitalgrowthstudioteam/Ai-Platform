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
      storeName: json['store_name'] ?? 'Glam stree nails',
      storeSlug: json['store_slug'] ?? 'glam-stree-nails',
      subdomain: json['subdomain'],
      description: json['description'],
      primaryColorHex: json['primary_color'] ?? '#0B192C',
      secondaryColorHex: json['secondary_color'] ?? '#DB2777',
      logoUrl: json['logo_url'],
      bannerUrl: json['banner_url'],
      contactEmail: json['contact_email'],
      contactPhone: json['contact_phone'] ?? '7499904962',
      businessAddress: json['business_address'] ?? 'Pune, Maharashtra',
      openingHours: json['opening_hours'] ?? 'Mon - Sat: 9:00 AM - 9:00 PM',
      codEnabled: json['cod_enabled'] ?? true,
      razorpayEnabled: json['razorpay_enabled'] ?? true,
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
  final String? promoOffer;
  final String imageUrl;
  final String? actionUrl;
  final int sortOrder;

  BannerItem({
    required this.id,
    required this.title,
    this.subtitle,
    this.promoOffer,
    required this.imageUrl,
    this.actionUrl,
    this.sortOrder = 0,
  });

  factory BannerItem.fromJson(Map<String, dynamic> json) {
    return BannerItem(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      subtitle: json['subtitle'] ?? json['description'],
      promoOffer: json['promo_offer'],
      imageUrl: json['image_url'] ?? '',
      actionUrl: json['action_url'] ?? json['link_url'],
      sortOrder: json['sort_order'] ?? 0,
    );
  }
}

class CategoryItem {
  final String id;
  final String name;
  final String slug;
  final String? imageUrl;
  final int sortOrder;

  CategoryItem({
    required this.id,
    required this.name,
    required this.slug,
    this.imageUrl,
    this.sortOrder = 0,
  });

  factory CategoryItem.fromJson(Map<String, dynamic> json) {
    return CategoryItem(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      imageUrl: json['image_url'],
      sortOrder: json['sort_order'] ?? 0,
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
    List<String> imgs = [];
    if (json['images'] != null) {
      if (json['images'] is List) {
        imgs = (json['images'] as List).map((e) => e.toString()).toList();
      } else if (json['images'] is String && (json['images'] as String).isNotEmpty) {
        imgs = [(json['images'] as String)];
      }
    }

    return ProductVariant(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? (json['name'] ?? ''),
      sku: json['sku'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      salePrice: (json['sale_price'] as num?)?.toDouble(),
      stockQuantity: json['stock_quantity'] ?? 0,
      images: imgs,
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
  final bool isFeatured;
  final bool inStock;

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
    this.isFeatured = false,
    this.inStock = true,
  });

  int get discountPercentage {
    if (regularPrice > 0 && effectivePrice < regularPrice) {
      return (((regularPrice - effectivePrice) / regularPrice) * 100).round();
    }
    return 0;
  }

  factory ProductItem.fromJson(Map<String, dynamic> json) {
    List<String> gallery = [];
    if (json['images'] != null && json['images'] is List) {
      gallery = (json['images'] as List<dynamic>).map((e) {
        if (e is Map<String, dynamic>) {
          return e['image_url']?.toString() ?? '';
        }
        return e.toString();
      }).where((s) => s.isNotEmpty).toList();
    }

    List<ProductVariant> vars = [];
    if (json['variants'] != null && json['variants'] is List) {
      vars = (json['variants'] as List<dynamic>)
          .map((v) => ProductVariant.fromJson(v as Map<String, dynamic>))
          .toList();
    }

    final regPrice = (json['regular_price'] as num?)?.toDouble() ?? 0.0;
    final sPrice = (json['sale_price'] as num?)?.toDouble();
    final effPrice = (json['effective_price'] as num?)?.toDouble() ??
        (sPrice != null && sPrice > 0 ? sPrice : regPrice);

    final pImage = json['thumbnail_url'] ??
        (json['primary_image'] ?? (gallery.isNotEmpty ? gallery.first : null));

    final title = json['name'] ?? (json['title'] ?? 'Luxury Press-On Nails');
    final catName = json['category_name'] ?? json['category'];

    return ProductItem(
      id: json['id']?.toString() ?? '',
      title: title,
      slug: json['slug'] ?? '',
      description: json['description'],
      regularPrice: regPrice,
      salePrice: sPrice,
      effectivePrice: effPrice,
      stockQuantity: json['stock_quantity'] ?? 50,
      category: catName,
      primaryImage: pImage,
      galleryImages: gallery.isNotEmpty ? gallery : (pImage != null ? [pImage] : []),
      variants: vars,
      isFeatured: json['is_featured'] ?? false,
      inStock: json['in_stock'] ?? (json['stock_quantity'] == null || json['stock_quantity'] > 0),
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
