class ApiConfig {
  static const String baseUrl = 'https://digitalgrowthstudio.in';

  // Auth endpoints
  static const String loginUrl = '$baseUrl/api/v1/platform/auth/login';
  static const String googleLoginUrl = '$baseUrl/api/v1/platform/auth/google-login';
  static const String meUrl = '$baseUrl/api/v1/platform/auth/me';

  // Vendor endpoints
  static const String overviewUrl = '$baseUrl/api/v1/platform/vendor/overview';
  static const String ordersUrl = '$baseUrl/api/v1/platform/vendor/orders';
  static const String productsUrl = '$baseUrl/api/v1/platform/vendor/products';
  static const String notificationsUrl = '$baseUrl/api/v1/platform/vendor/notifications';
  static const String hyperlocalSettingsUrl = '$baseUrl/api/v1/platform/vendor/hyperlocal-settings';

  static String orderStatusUrl(String orderId) => '$baseUrl/api/v1/platform/vendor/orders/$orderId/status';
  static String productStockUrl(String productId) => '$baseUrl/api/v1/platform/vendor/products/$productId';
  static String readNotificationUrl(String id) => '$baseUrl/api/v1/platform/vendor/notifications/$id/read';

  // External Web URLs (Strictly opened in Browser)
  static const String webRegisterUrl = '$baseUrl/app/register';
  static const String webSubscriptionRenewUrl = '$baseUrl/app/dashboard/subscription';
  static const String webSupportUrl = '$baseUrl/app/support';
}

