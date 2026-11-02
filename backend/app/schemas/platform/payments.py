"""
Digital Growth Studio — Platform Payments & Coupon Schemas
"""
import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class SetupFeeQuoteResponse(BaseModel):
    plan_name: str
    base_price_inr: float
    sale_price_inr: float
    custom_price_inr: Optional[float] = None
    final_price_inr: float
    setup_fee_paid: bool
    setup_fee_waived: bool
    setup_fee_cleared: bool
    key_id: str
    currency: str = "INR"
    features: List[str]


class CouponValidateRequest(BaseModel):
    code: str


class CouponValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_type: str
    discount_value: float
    discount_inr: float
    new_total_inr: float
    message: str


class SetupFeeOrderCreateRequest(BaseModel):
    coupon_code: Optional[str] = None


class SetupFeeOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str = "INR"
    key_id: str
    is_mock: bool = False
    is_free: bool = False
    message: Optional[str] = None


class SetupFeeVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    coupon_code: Optional[str] = None


class AddonOrderCreateRequest(BaseModel):
    addon_id: uuid.UUID


class AddonVerifyRequest(BaseModel):
    addon_id: uuid.UUID
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class AdminCouponCreateRequest(BaseModel):
    code: str
    discount_type: str = "FIXED_INR"  # FIXED_INR or PERCENTAGE
    discount_value: float
    applicable_to: str = "SETUP_FEE"
    vendor_id: Optional[uuid.UUID] = None
    max_uses: int = 1
    valid_days: int = 30


class AdminVendorSetupFeeUpdateRequest(BaseModel):
    waive_fee: Optional[bool] = None
    custom_price_inr: Optional[float] = None


class AdminPlanPricingUpdateRequest(BaseModel):
    monthly_price_inr: Optional[float] = None
    setup_fee_inr: Optional[float] = None
    setup_fee_sale_price_inr: Optional[float] = None

