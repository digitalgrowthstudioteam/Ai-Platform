import os
import sys

# Add backend app directory to path
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_path)

from app.services.pdf_generator import PDFReportGenerator

def generate():
    metrics = {
        "spend": 45210.0,
        "roas": 3.12,
        "cpl": 145.0,
        "ctr": 1.95,
        "leads": 312
    }
    campaigns = [
        {"name": "Scale Winner - Conversions Ecom", "spend": 28400.0, "results": 195, "cpl": 145.6, "ctr": 2.25, "status": "active"},
        {"name": "Re-Targeting - Dynamic Product Ads", "spend": 9800.0, "results": 82, "cpl": 119.5, "ctr": 1.85, "status": "active"},
        {"name": "A/B Testing Sandbox - Video Ads", "spend": 7010.0, "results": 35, "cpl": 200.2, "ctr": 1.10, "status": "active"}
    ]
    findings = [
        {
            "title": "Low Outbound Click-Through Rate",
            "type": "Creative Performance",
            "recommendation": "Review ad creatives in 'A/B Testing Sandbox - Video Ads' showing CTR below 1.5%. Replace video hook overlays in the first 3 seconds.",
            "expected_impact": "Lower cost-per-click (CPC) and increased traffic to landing pages."
        },
        {
            "title": "Uncapped Scaling headroom available",
            "type": "Budget Allocation",
            "recommendation": "Scale winner campaign 'Scale Winner - Conversions Ecom' showing strong CPL stability. Increase daily budget limit by 15% weekly.",
            "expected_impact": "Increase lead conversion volume while maintaining acquisition cost targets."
        }
    ]
    
    pdf_stream = PDFReportGenerator.generate_audit_report(
        user_name="Vikram",
        ad_account_name="Primary Ad Account (DGS Demo)",
        health_score=82,
        metrics=metrics,
        campaigns=campaigns,
        findings=findings
    )
    
    output_path = r"C:\Users\vikra\.gemini\antigravity-ide\brain\c19d00eb-7289-41e5-a753-11045f14b449\sample_audit_report.pdf"
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "wb") as f:
        f.write(pdf_stream.getvalue())
        
    print(f"Sample PDF successfully generated at: {output_path}")

if __name__ == "__main__":
    generate()
