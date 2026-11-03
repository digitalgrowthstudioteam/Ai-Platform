"""
Digital Growth Studio — Brand Legal Policies Generator
Provides default, professionally compliant policy templates for brand stores
(Terms & Conditions, Privacy Policy, Shipping & Delivery, Return & Refund).
"""
from typing import Dict, Optional


def generate_default_terms_and_conditions(
    brand_name: str,
    contact_email: Optional[str] = None,
    contact_phone: Optional[str] = None,
    business_address: Optional[str] = None,
) -> str:
    brand = brand_name or "Our Store"
    email = contact_email or "support@digitalgrowthstudio.in"
    phone = contact_phone or "+91 92702 78119"
    address = business_address or "Authorized Business Premises, India"

    return f"""# Terms & Conditions for {brand}

**Last Updated:** Today

Welcome to **{brand}** ("we", "our", or "us"). By accessing or using our online storefront, mobile application, or purchasing products from us, you agree to be bound by the following Terms & Conditions. Please read them carefully before placing an order.

---

### 1. General Overview & Eligibility
1.1. These Terms govern your purchase of handcrafted, retail, and designer products offered on this storefront and our official Android application.
1.2. By using this platform, you represent that you are at least 18 years of age or accessing under the supervision of a parent or legal guardian.

---

### 2. Products, Pricing & Accuracy
2.1. We make every effort to display the colors, specifications, and details of our products accurately. Because many items involve handcrafted craftsmanship, slight variations in weave, embroidery, or shades may naturally occur and are a hallmark of artisanal quality.
2.2. All prices are listed in Indian Rupees (₹ INR) inclusive of applicable taxes unless stated otherwise.
2.3. We reserve the right to revise product pricing, discontinue items, or adjust availability without prior notice.

---

### 3. Order Placement & Acceptance
3.1. An order confirmation sent via SMS, Email, or WhatsApp indicates that your order request has been received, but does not constitute final acceptance.
3.2. We reserve the right to cancel or limit orders in cases of stock unavailability, pricing inaccuracies, or suspected fraudulent activity. If your order is cancelled after payment, a full refund will be issued to your original payment method.

---

### 4. Payments & Billing
4.1. We support secure payment methods including UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Net Banking via certified gateways (Razorpay), as well as Cash on Delivery (COD) for eligible pin codes.
4.2. For COD orders, payment must be handed over in cash/UPI to the authorized courier partner upon physical delivery.

---

### 5. Intellectual Property
All content, product photography, logos, brand emblems, and styling on this website and mobile app are the proprietary intellectual property of **{brand}** and our platform technology provider. Unauthorized duplication or distribution is prohibited.

---

### 6. Limitation of Liability
To the maximum extent permitted by applicable Indian law, **{brand}** shall not be liable for any indirect, incidental, or consequential damages resulting from the use of our products or delivery delays caused by unforeseen logistics disruptions.

---

### 7. Governing Law & Dispute Resolution
These Terms are governed by and construed in accordance with the laws of India. Any disputes arising in connection with orders shall be subject to the exclusive jurisdiction of the competent courts in India.

---

### 8. Customer Support
For questions, custom design inquiries, or order status assistance, please contact our helpdesk:
- **Brand / Store:** {brand}
- **Support Email:** {email}
- **Support Phone / WhatsApp:** {phone}
- **Registered Address:** {address}
"""


def generate_default_privacy_policy(
    brand_name: str,
    contact_email: Optional[str] = None,
    contact_phone: Optional[str] = None,
) -> str:
    brand = brand_name or "Our Store"
    email = contact_email or "support@digitalgrowthstudio.in"
    phone = contact_phone or "+91 92702 78119"

    return f"""# Privacy Policy for {brand}

**Last Updated:** Today

At **{brand}**, your privacy is of paramount importance to us. This Privacy Policy outlines how we collect, use, store, and safeguard your personal information when you visit our website, mobile application, or place orders with us.

---

### 1. Information We Collect
When you browse or make a purchase from our store, we collect:
- **Contact Details:** Full Name, Phone Number, WhatsApp Number, and Email Address.
- **Delivery Information:** Shipping and billing addresses, landmarks, and pin codes.
- **Order Information:** Items ordered, sizes/measurements, custom notes, and payment status.
- **Technical Data:** Device type, browser information, IP address, and operational cookies to keep your cart active.

---

### 2. How We Use Your Information
We use your information exclusively for legitimate business purposes:
1. To process, fulfill, and deliver your orders accurately.
2. To send automated order tracking notifications, dispatch alerts, and delivery confirmations via SMS, WhatsApp, or Email.
3. To provide customer support, sizing consultations, and handle return/exchange requests.
4. To prevent fraudulent transactions and ensure platform security.

---

### 3. Payment Data Security
3.1. We do **not** store or record your complete credit/debit card numbers, CVVs, or Net Banking credentials on our servers.
3.2. All online payments are encrypted and processed through RBI-approved, PCI-DSS Level 1 compliant payment gateways (such as Razorpay).

---

### 4. Information Sharing & Third Parties
We do not sell, rent, or trade your personal information. We only share essential delivery data with:
- **Logistics Partners:** Trusted courier services (e.g., Delhivery, Blue Dart, DTDC, India Post) solely to deliver your packages.
- **Communication Gateways:** Certified SMS and WhatsApp Business APIs to deliver order updates.
- **Legal Compliance:** Law enforcement or regulatory bodies when required by Indian law.

---

### 5. Cookies & Tracking
Our website uses essential session cookies to remember items placed in your shopping cart and wishlist. You can manage or disable cookies in your browser settings.

---

### 6. Data Retention & Your Rights
We retain your order records only as long as required for tax compliance, accounting, and warranty obligations. You have the right to request access to your personal information or ask for deletion by contacting our privacy officer.

---

### 7. Contact Us
If you have questions about this Privacy Policy or wish to exercise your data privacy rights, contact us at:
- **Brand / Store:** {brand}
- **Email:** {email}
- **Phone / WhatsApp:** {phone}
"""


def generate_default_shipping_policy(
    brand_name: str,
    estimated_delivery_days: Optional[str] = None,
    free_shipping_min_order: Optional[float] = None,
    contact_phone: Optional[str] = None,
    contact_email: Optional[str] = None,
) -> str:
    brand = brand_name or "Our Store"
    delivery_time = estimated_delivery_days or "3-5 Business Days"
    free_shipping_text = (
        f"Free standard shipping applies on all orders above ₹{int(free_shipping_min_order):,}."
        if free_shipping_min_order and free_shipping_min_order > 0
        else "Enjoy free delivery on eligible promotional orders."
    )
    phone = contact_phone or "+91 92702 78119"
    email = contact_email or "support@digitalgrowthstudio.in"

    return f"""# Shipping & Delivery Policy for {brand}

**Last Updated:** Today

Thank you for shopping with **{brand}**. We are committed to delivering your handcrafted items, apparel, and orders safely, quickly, and in pristine condition.

---

### 1. Order Processing Time
- **Ready-to-Ship Items:** Processed and dispatched within **24 to 48 hours** (excluding Sundays and national holidays).
- **Custom / Handcrafted / Bridal Items:** Since select items involve custom stitching, embroidery, or sizing, processing typically takes **3 to 7 business days** before dispatch. You will be updated throughout the process.

---

### 2. Estimated Delivery Timelines
- **Metro & Tier-1 Cities:** Delivered within **{delivery_time}** following dispatch.
- **Rest of India & Regional Areas:** Delivered within **4 to 7 business days**.
- Severe weather, local holidays, or remote pin code logistics may occasionally cause minor transit extensions.

---

### 3. Shipping Charges & Free Delivery
- {free_shipping_text}
- Standard shipping charges (if applicable) are clearly calculated and displayed at checkout prior to payment.

---

### 4. Shipment Tracking
Once your package is handed over to our courier partner (Delhivery, Blue Dart, DTDC, India Post), you will receive a tracking link via **SMS / WhatsApp / Email** allowing you to track the transit status in real time.

---

### 5. Cash on Delivery (COD)
- Cash on Delivery is available for eligible serviceable pin codes across India.
- Please ensure exact cash or UPI payment is ready when the delivery executive arrives.
- Prior to dispatch of high-value COD orders, our verification team may place a brief confirmation call or WhatsApp message.

---

### 6. Damaged or Tampered Packages
If the outer parcel appears damaged, wet, or opened upon delivery, **please do not accept the package** or take clear photos/video of the packaging before opening and notify our team immediately within 24 hours.

---

### 7. Shipping Inquiries
Need express shipping assistance or tracking updates?
- **Brand / Store:** {brand}
- **WhatsApp / Phone:** {phone}
- **Email:** {email}
"""


def generate_default_refund_policy(
    brand_name: str,
    contact_email: Optional[str] = None,
    contact_phone: Optional[str] = None,
) -> str:
    brand = brand_name or "Our Store"
    email = contact_email or "support@digitalgrowthstudio.in"
    phone = contact_phone or "+91 92702 78119"

    return f"""# Return, Exchange & Refund Policy for {brand}

**Last Updated:** Today

At **{brand}**, customer satisfaction and quality craftsmanship are our highest priorities. We strive to provide accurate sizing and clear product previews. Please review our return and refund guidelines below.

---

### 1. Return & Exchange Window
- Customers may request a return or exchange within **7 days** of physical delivery of the parcel.
- Requests initiated after 7 days from delivery cannot be accommodated.

---

### 2. Eligibility for Returns & Replacements
To be eligible for a return or exchange:
1. The item must be unused, unwashed, and in the same condition that you received it.
2. Original product tags, labels, and protective packaging must remain intact.
3. For apparel, items must not show any perfume smell, makeup stains, or altered stitching.
4. **Custom-Made / Personalized Orders:** Custom stitched bridal pieces tailored to individual customer measurements are eligible for free sizing alteration/refitting rather than cash refund, unless received with manufacturing defects.

---

### 3. Damaged, Defective or Incorrect Items
If you received an item that was damaged in transit, defective, or incorrect:
- Please notify us within **48 hours** of delivery with photos/video of the issue.
- We will arrange a free reverse pickup and dispatch a replacement or issue a 100% refund at no extra cost to you.

---

### 4. Return Process
1. Contact our support team via **WhatsApp ({phone})** or **Email ({email})** with your Order ID and reason for return.
2. Once approved, our courier partner will coordinate reverse pickup from your delivery address.
3. If reverse pickup is unavailable in your pin code, our team will guide you on self-shipping with reimbursement of courier charges up to standard rates.

---

### 5. Refund Method & Turnaround Time
- **Prepaid Orders (Cards, Net Banking, UPI):** Refunds are credited directly back to the original payment source within **5 to 7 business days** after the returned parcel passes quality inspection.
- **Cash on Delivery (COD) Orders:** Refunds are transferred via direct UPI (Google Pay, PhonePe, Paytm) or NEFT/IMPS bank transfer to your provided account details within **3 to 5 business days** of inspection.

---

### 6. Cancellation Policy
You may cancel an order free of charge before it has been dispatched by contacting our customer care team. Once dispatched, orders must go through the standard return process upon delivery.

---

### 7. Support Contact
For all return, exchange, or refund assistance:
- **Brand / Store:** {brand}
- **WhatsApp / Helpline:** {phone}
- **Email:** {email}
"""


def get_store_policies(
    store,
    vendor_profile=None,
) -> Dict[str, str]:
    """
    Returns the store's policies, falling back to brand-customized default templates
    if any policy field is not yet set by the vendor.
    """
    brand_name = (
        getattr(store, "store_name", None)
        or getattr(vendor_profile, "brand_name", None)
        or getattr(vendor_profile, "business_name", None)
        or "Our Store"
    )
    contact_email = getattr(store, "contact_email", None) or (vendor_profile.email if vendor_profile else None)
    contact_phone = getattr(store, "contact_phone", None) or (vendor_profile.phone if vendor_profile else None)
    business_address = getattr(store, "business_address", None) or (vendor_profile.address if vendor_profile else None)
    estimated_delivery_days = getattr(store, "estimated_delivery_days", "3-5 Business Days")
    free_shipping_min_order = getattr(store, "free_shipping_min_order", 999.0)

    terms = getattr(store, "terms_and_conditions", None)
    if not terms or not terms.strip():
        terms = generate_default_terms_and_conditions(
            brand_name=brand_name,
            contact_email=contact_email,
            contact_phone=contact_phone,
            business_address=business_address,
        )

    privacy = getattr(store, "privacy_policy", None)
    if not privacy or not privacy.strip():
        privacy = generate_default_privacy_policy(
            brand_name=brand_name,
            contact_email=contact_email,
            contact_phone=contact_phone,
        )

    shipping = getattr(store, "shipping_policy", None)
    if not shipping or not shipping.strip():
        shipping = generate_default_shipping_policy(
            brand_name=brand_name,
            estimated_delivery_days=estimated_delivery_days,
            free_shipping_min_order=free_shipping_min_order,
            contact_phone=contact_phone,
            contact_email=contact_email,
        )

    refund = getattr(store, "refund_policy", None)
    if not refund or not refund.strip():
        refund = generate_default_refund_policy(
            brand_name=brand_name,
            contact_email=contact_email,
            contact_phone=contact_phone,
        )

    return {
        "terms_and_conditions": terms,
        "privacy_policy": privacy,
        "shipping_policy": shipping,
        "refund_policy": refund,
    }
