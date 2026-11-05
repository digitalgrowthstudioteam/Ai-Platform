import 'dart:async';
import 'package:flutter/services.dart';

class AudioAlertService {
  static final AudioAlertService _instance = AudioAlertService._internal();
  factory AudioAlertService() => _instance;
  AudioAlertService._internal();

  Timer? _ringTimer;
  bool _isRinging = false;
  String? _activeOrderNumber;
  double? _activeOrderAmount;

  final _alertStreamController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get alertStream => _alertStreamController.stream;

  bool get isRinging => _isRinging;
  String? get activeOrderNumber => _activeOrderNumber;
  double? get activeOrderAmount => _activeOrderAmount;

  /// Starts real-time ringing alert ONLY if the vendor has the Hyperlocal module active!
  void triggerNewOrderAlert({
    required bool isHyperlocalActive,
    required String orderNumber,
    required double orderAmount,
    required String customerName,
  }) {
    // Condition 2: Ringing audio alert is STRICTLY for vendors with active Hyperlocal module
    if (!isHyperlocalActive) {
      // For standard vendors, do a simple subtle click/vibration without loud looping alarm
      HapticFeedback.mediumImpact();
      return;
    }

    if (_isRinging) return; // Already ringing

    _isRinging = true;
    _activeOrderNumber = orderNumber;
    _activeOrderAmount = orderAmount;

    // Notify UI listeners (to pop up incoming order banner)
    _alertStreamController.add({
      'type': 'RINGING',
      'order_number': orderNumber,
      'amount': orderAmount,
      'customer': customerName,
    });

    // Play immediate loud alert
    _playChime();

    // Loop ringing alarm every 1.2 seconds like a phone ring
    _ringTimer?.cancel();
    _ringTimer = Timer.periodic(const Duration(milliseconds: 1200), (timer) {
      if (!_isRinging) {
        timer.cancel();
        return;
      }
      _playChime();
    });
  }

  void _playChime() {
    SystemSound.play(SystemSoundType.alert);
    HapticFeedback.heavyImpact();
  }

  /// Stops the ringing alarm when vendor taps "Accept" or dismisses
  void stopRinging() {
    _isRinging = false;
    _ringTimer?.cancel();
    _ringTimer = null;
    _activeOrderNumber = null;
    _activeOrderAmount = null;

    _alertStreamController.add({'type': 'STOPPED'});
  }

  void dispose() {
    stopRinging();
    _alertStreamController.close();
  }
}

