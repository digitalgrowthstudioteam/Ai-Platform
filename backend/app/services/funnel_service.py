"""
Digital Growth Studio — Funnel Service
Contains logic for Campaign Recommendation questions evaluation and strategy generation.
"""

def calculate_readiness_score(answers: dict) -> int:
    """
    Calculates the Strategy Readiness Score (0-100) based on questionnaire inputs.
    Score factors: Goal clarity, Campaign maturity, Optimization frequency, Creative testing, Pacing.
    """
    score = 0
    
    # Q1: Advertising type (Neutral, but 10 points for completing)
    score += 10
    
    # Q2: Main goal
    goal = answers.get("q2", "")
    if goal in ["Get Sales", "Generate Leads", "Website Conversions", "WhatsApp Enquiries"]:
        score += 10
    elif goal == "App Installs":
        score += 8
    else:
        score += 5
        
    # Q3: Budget
    budget = answers.get("q3", "")
    if budget in ["₹1 Lakh – ₹5 Lakhs", "₹5 Lakhs – ₹10 Lakhs", "₹10 Lakhs+"]:
        score += 10
    elif budget == "₹50,000 – ₹1 Lakh":
        score += 9
    elif budget == "₹25,000 – ₹50,000":
        score += 7
    else:
        score += 5
        
    # Q4: History
    history = answers.get("q4", "")
    if history == "More than 1 year":
        score += 10
    elif history == "6–12 months":
        score += 9
    elif history == "3–6 months":
        score += 7
    elif history == "Less than 3 months":
        score += 5
    else:
        score += 3
        
    # Q5: Biggest problem
    score += 10  # 10 points for acknowledging problem
    
    # Q6: Campaigns count
    camp_count = answers.get("q6", "")
    if camp_count in ["11–25", "25+"]:
        score += 10
    elif camp_count == "4–10":
        score += 8
    else:
        score += 5
        
    # Q7: Optimization frequency
    freq = answers.get("q7", "")
    if freq == "Every day":
        score += 10
    elif freq == "A few times a week":
        score += 8
    elif freq == "Once a week":
        score += 6
    elif freq == "Occasionally":
        score += 4
    else:
        score += 2
        
    # Q8: What they optimize (list / multi-select)
    opt_fields = answers.get("q8", [])
    if isinstance(opt_fields, list):
        if "I'm not sure" in opt_fields:
            score += 2
        else:
            score += min(len(opt_fields) * 2, 10)
    else:
        score += 5
        
    # Q9: Biggest concern
    score += 10
    
    # Q10: What they would like to know
    score += 10
    
    return min(max(score, 0), 100)


def generate_recommendations(answers: dict) -> list:
    """
    Deterministic campaign recommendation generator matching logic constraints.
    Returns up to 4 priorities with id, type, priority, title, summary, reason, recommendation, expected_impact, confidence.
    """
    problem = answers.get("q5", "")
    industry = answers.get("q1", "")
    
    recs = []
    
    # 1. Primary Recommendation based on Problem
    problem_map = {
        "CPL / CPA is too high": {
            "id": "high_cpl",
            "type": "campaign_optimization",
            "priority": "HIGH",
            "title": "Mitigate High Cost-Per-Acquisition",
            "summary": "Optimize campaigns and ads that exceed your target conversion costs.",
            "reason": "You indicated that high acquisition costs (CPL/CPA) are your biggest bottleneck.",
            "recommendation": "Focus on identifying campaigns and ads with acquisition costs significantly above your normal performance level. Reduce inefficient spend before increasing total budget.",
            "expected_impact": "Reduction in overall cost-per-lead and wasted ad spend.",
            "confidence": 0.92
        },
        "Not getting enough leads": {
            "id": "low_leads",
            "type": "lead_generation",
            "priority": "HIGH",
            "title": "Boost Lead Volume",
            "summary": "Diagnose structural bottlenecks causing low lead volume.",
            "reason": "You indicated that you are not getting enough leads from your current campaigns.",
            "recommendation": "Review campaign structure, creative performance, audience quality and conversion tracking before increasing spend.",
            "expected_impact": "Increase in lead volume and higher conversion rates from landing pages.",
            "confidence": 0.89
        },
        "Sales are low": {
            "id": "low_sales",
            "type": "sales_performance",
            "priority": "HIGH",
            "title": "Improve Conversion Funnel Velocity",
            "summary": "Optimize product offer matching and click-to-purchase ratios.",
            "reason": "You indicated that low sales volume is your primary concern.",
            "recommendation": "Focus on conversion efficiency, creative quality, audience intent and post-click conversion performance rather than increasing budget immediately.",
            "expected_impact": "Higher ROAS and improved purchase checkout rates.",
            "confidence": 0.91
        },
        "ROAS is poor": {
            "id": "poor_roas",
            "type": "budget_efficiency",
            "priority": "HIGH",
            "title": "Maximize Return on Ad Spend (ROAS)",
            "summary": "Prune underperforming campaigns and allocate budget to high-revenue drivers.",
            "reason": "You indicated that your return on ad spend is currently poor.",
            "recommendation": "Review campaigns based on purchase value, spend and conversion efficiency before scaling.",
            "expected_impact": "Immediate lift in ROAS and better allocation of ad spend.",
            "confidence": 0.94
        },
        "Ads are becoming expensive": {
            "id": "expensive_ads",
            "type": "creative_testing",
            "priority": "HIGH",
            "title": "Counteract Rising Ad Costs",
            "summary": "Refresh visual assets and text hooks to decrease high CPMs and CPCs.",
            "reason": "You indicated that ad delivery cost spikes are squeezing your margins.",
            "recommendation": "Review CPM, CTR, CPC and conversion performance to determine whether the increase is driven by creative fatigue, audience competition or conversion efficiency.",
            "expected_impact": "Lower cost-per-click and increased engagement CTRs.",
            "confidence": 0.87
        },
        "I don't know which campaigns to stop": {
            "id": "stop_decisions",
            "type": "account_structure",
            "priority": "HIGH",
            "title": "Implement Stop-Loss Thresholds",
            "summary": "Apply a clear campaign audit checklist to identify wasted spend.",
            "reason": "You indicated difficulty in identifying underperforming campaigns to deactivate.",
            "recommendation": "Use a Stop / Review / Scale framework based on spend, conversion volume, acquisition cost and recent performance.",
            "expected_impact": "Reduced ad waste and higher clean budget efficiency.",
            "confidence": 0.90
        },
        "I don't know where to increase budget": {
            "id": "scale_decisions",
            "type": "scaling",
            "priority": "HIGH",
            "title": "SOP for Budget Escalation",
            "summary": "Use target CPA/ROAS thresholds to scale winning campaigns safely.",
            "reason": "You indicated that you do not know where to safely increase budgets.",
            "recommendation": "Identify campaigns with sufficient conversion volume, stable performance and better-than-average acquisition efficiency before increasing budgets.",
            "expected_impact": "Successful budget scaling without performance degradation.",
            "confidence": 0.88
        },
        "Results are inconsistent": {
            "id": "inconsistent_results",
            "type": "measurement",
            "priority": "HIGH",
            "title": "Stabilize Performance Baselines",
            "summary": "Reduce ad set learning phase volatility and structure tracking.",
            "reason": "You indicated that your ad results fluctuate heavily day-to-day.",
            "recommendation": "Analyse recent performance trends and separate temporary fluctuations from sustained performance changes before making major budget decisions.",
            "expected_impact": "More predictable day-to-day lead and sales flow.",
            "confidence": 0.85
        }
    }
    
    primary_rec = problem_map.get(problem)
    if primary_rec:
        recs.append(primary_rec)
        
    # 2. Secondary Recommendation based on Industry
    industry_recs = {
        "Ecommerce / Products": {
            "id": "ind_ecom",
            "type": "sales_performance",
            "priority": "MEDIUM",
            "title": "Optimize E-Commerce Purchase Funnel",
            "summary": "Review Catalog and Dynamic Product Ads ROAS.",
            "reason": "Customized for the E-Commerce industry.",
            "recommendation": "Prioritize tracking and optimizing for Purchases, Purchase Value, and ROAS. Focus creative resources on high-intent catalog variations.",
            "expected_impact": "Increased product-to-purchase conversion efficiency.",
            "confidence": 0.93
        },
        "Lead Generation": {
            "id": "ind_leadgen",
            "type": "lead_generation",
            "priority": "MEDIUM",
            "title": "Enhance Lead Quality Validation",
            "summary": "Verify lead collection forms and user intent metrics.",
            "reason": "Customized for the Lead Generation industry.",
            "recommendation": "Focus on lowering Lead Acquisition Costs (CPL) while validating lead conversion rates down the pipeline. Utilize CRM feedback loops.",
            "expected_impact": "Reduction in junk lead volume and improved sales pipeline value.",
            "confidence": 0.91
        },
        "Local Business": {
            "id": "ind_local",
            "type": "audience_optimization",
            "priority": "MEDIUM",
            "title": "Optimize Local Target Boundaries",
            "summary": "Focus ad delivery in high-density zip codes and local map pins.",
            "reason": "Customized for Local Business growth.",
            "recommendation": "Prioritize direct contact methods like WhatsApp message starts and inbound calls. Ensure geo-targeting is limited to functional service radiuses.",
            "expected_impact": "Higher conversion rates from direct chat inquiries.",
            "confidence": 0.88
        },
        "SaaS / Software": {
            "id": "ind_saas",
            "type": "automation",
            "priority": "MEDIUM",
            "title": "Trial Sign-Up Conversion Optimization",
            "summary": "Review trial activation metrics and user onboarding value propositions.",
            "reason": "Customized for SaaS/Software platforms.",
            "recommendation": "Structure campaign goals around trial sign-ups and active subscriptions. Use custom audience exclusions to avoid retargeting existing trial users.",
            "expected_impact": "Lower user acquisition cost (CAC) and higher trial-to-paid conversions.",
            "confidence": 0.92
        },
        "Education": {
            "id": "ind_edu",
            "type": "lead_generation",
            "priority": "MEDIUM",
            "title": "Nurture Long-Cycle Educational Leads",
            "summary": "Create multi-step education landing pages and brochure downloads.",
            "reason": "Customized for Educational institutions and courses.",
            "recommendation": "Prioritize student lead quality over raw lead count. Highlight student outcomes, course schedules, and placement success testimonials.",
            "expected_impact": "Higher enrollment ratios from generated ad leads.",
            "confidence": 0.89
        },
        "Services": {
            "id": "ind_services",
            "type": "audience_optimization",
            "priority": "MEDIUM",
            "title": "Position Authority and Testimonials",
            "summary": "Establish service credibility and project work portfolios.",
            "reason": "Customized for B2B or consumer services.",
            "recommendation": "Promote client success case studies and direct consultation offers. Use custom audiences to target business decision-makers.",
            "expected_impact": "Increase in booked introductory calls and closed contracts.",
            "confidence": 0.90
        }
    }
    
    ind_rec = industry_recs.get(industry)
    if ind_rec:
        recs.append(ind_rec)
        
    # 3. Structural advice
    opt_freq = answers.get("q7", "")
    if opt_freq in ["Occasionally", "Almost never"]:
        recs.append({
            "id": "structure_auto",
            "type": "automation",
            "priority": "MEDIUM",
            "title": "Introduce Systematic Optimization Intervals",
            "summary": "Create a weekly routine to check metrics and adjust budgets.",
            "reason": "You indicated that campaigns are optimized occasionally or almost never.",
            "recommendation": "Set up a standard review schedule (at least once a week) to check for audience fatigue, high-spend non-converters, and adjust budget allocation.",
            "expected_impact": "Consistent performance monitoring and reduced ad budget leaks.",
            "confidence": 0.85
        })
    else:
        recs.append({
            "id": "structure_testing",
            "type": "creative_testing",
            "priority": "MEDIUM",
            "title": "Establish Creative Asset Sandbox",
            "summary": "Isolate testing environments to discover winning media formats.",
            "reason": "You indicated active optimization intervals.",
            "recommendation": "Keep active campaigns running with proven assets, and route new creatives through a dedicated sandbox to test overlays, watch times, and CTRs.",
            "expected_impact": "Continuous supply of validated creatives to feed main scaling setups.",
            "confidence": 0.88
        })
        
    return recs[:4]
