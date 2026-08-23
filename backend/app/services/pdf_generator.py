"""
Digital Growth Studio — ReportLab PDF Report Generator Service
Generates high-fidelity, premium PDF performance audits natively.
"""
import os
from datetime import datetime
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

class NumberedCanvas(canvas.Canvas):
    """
    Canvas to calculate total pages and draw footer/header on all non-cover pages.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_elements(num_pages)
            super().showPage()
        super().save()

    def draw_page_elements(self, page_count):
        # We skip the cover page (Page 1)
        if self._pageNumber == 1:
            return

        self.saveState()
        
        # Header (Top of Page)
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#475569")) # slate-600
        self.drawString(54, 750, "DIGITAL GROWTH STUDIO")
        self.setFont("Helvetica", 8)
        self.drawRightString(558, 750, "Meta Ads Performance Audit Report")
        
        # Thin line under header
        self.setStrokeColor(colors.HexColor("#E2E8F0")) # slate-200
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)
        
        # Footer (Bottom of Page)
        self.line(54, 50, 558, 50)
        self.setFont("Helvetica", 8)
        self.drawString(54, 38, "Confidential • Calculated using real Meta Ads API data")
        self.drawRightString(558, 38, f"Page {self._pageNumber} of {page_count}")
        
        self.restoreState()


class PDFReportGenerator:
    """
    Service to compile real Meta Ads campaign metrics and strategy priorities into a PDF.
    """

    @classmethod
    def generate_audit_report(cls, user_name: str, ad_account_name: str, health_score: int, metrics: dict, campaigns: list, findings: list) -> BytesIO:
        """
        Builds a SimpleDocTemplate and prints report layout using Flowables.
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=72,
            bottomMargin=72
        )

        styles = getSampleStyleSheet()
        
        # Custom Brand Styles
        primary_color = colors.HexColor("#1D4ED8") # blue-700
        secondary_color = colors.HexColor("#1E293B") # slate-800
        accent_color = colors.HexColor("#0D9488") # teal-600
        bg_card_color = colors.HexColor("#F8FAFC") # slate-50
        border_color = colors.HexColor("#E2E8F0") # slate-200
        text_muted = colors.HexColor("#64748B") # slate-500

        # Paragraph Styles
        styles.add(ParagraphStyle(
            name="CoverTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=32,
            leading=38,
            textColor=primary_color,
            spaceAfter=15
        ))
        styles.add(ParagraphStyle(
            name="CoverSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=14,
            leading=18,
            textColor=text_muted,
            spaceAfter=40
        ))
        styles.add(ParagraphStyle(
            name="CoverMeta",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=secondary_color
        ))
        styles.add(ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=secondary_color,
            spaceBefore=15,
            spaceAfter=10,
            keepWithNext=True
        ))
        styles.add(ParagraphStyle(
            name="CardLabel",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=text_muted
        ))
        styles.add(ParagraphStyle(
            name="CardValue",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=primary_color
        ))
        styles.add(ParagraphStyle(
            name="TableCell",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=11,
            textColor=secondary_color
        ))
        styles.add(ParagraphStyle(
            name="TableHeaderCell",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=colors.white
        ))
        styles.add(ParagraphStyle(
            name="BodyTextSlate",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=secondary_color,
            spaceAfter=8
        ))
        styles.add(ParagraphStyle(
            name="FindingPriority",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#B91C1C") # red-700
        ))

        story = []

        # ==========================================
        # COVER PAGE
        # ==========================================
        story.append(Spacer(1, 100))
        story.append(Paragraph("META ADS PERFORMANCE", styles["CoverTitle"]))
        story.append(Paragraph("AUDIT & OPTIMIZATION REPORT", ParagraphStyle(
            name="CoverTitle2", parent=styles["CoverTitle"], fontSize=28, leading=32, textColor=secondary_color
        )))
        story.append(Spacer(1, 10))
        story.append(Paragraph("An automated deep-dive analysis powered by Digital Growth Studio.", styles["CoverSubtitle"]))
        story.append(Spacer(1, 150))
        
        # Meta info box
        meta_html = f"""
        <b>PREPARED FOR:</b> {user_name}<br/>
        <b>AD ACCOUNT:</b> {ad_account_name}<br/>
        <b>DATE GENERATED:</b> {datetime.now().strftime('%B %d, %Y')}<br/>
        <b>STATUS:</b> Complete • Active Campaign Audit
        """
        story.append(Paragraph(meta_html, styles["CoverMeta"]))
        story.append(PageBreak())

        # ==========================================
        # EXECUTIVE SUMMARY & KPI CARDS
        # ==========================================
        story.append(Paragraph("Executive Summary", styles["SectionHeading"]))
        story.append(Paragraph(
            "This report summarizes the primary advertising delivery metrics and ROI performance indices "
            "synced directly from your connected Meta Ad Account. Below is your structured account analysis "
            "categorized into clean optimization KPIs and scaling opportunities.",
            styles["BodyTextSlate"]
        ))
        story.append(Spacer(1, 15))

        # KPI Metrics Cards (using ReportLab Table)
        def fmt_curr(val):
            return f"Rs. {val:,.2f}" if val is not None else "N/A"

        spend_str = fmt_curr(metrics.get("spend"))
        roas_val = metrics.get("roas")
        roas_str = f"{roas_val:.2f}x" if roas_val is not None and roas_val > 0 else "N/A"
        cpl_val = metrics.get("cpl")
        cpl_str = fmt_curr(cpl_val) if cpl_val is not None and cpl_val > 0 else "N/A"
        ctr_val = metrics.get("ctr")
        ctr_str = f"{ctr_val:.2f}%" if ctr_val is not None and ctr_val > 0 else "N/A"

        score_text = f"<font size='26'>{health_score}</font>/100" if health_score is not None else "N/A"

        cards_data = [
            [
                Paragraph("ACCOUNT HEALTH SCORE", styles["CardLabel"]),
                Paragraph("TOTAL SPEND", styles["CardLabel"]),
                Paragraph("CONVERSION ROAS", styles["CardLabel"])
            ],
            [
                Paragraph(score_text, styles["CardValue"]),
                Paragraph(spend_str, styles["CardValue"]),
                Paragraph(roas_str, styles["CardValue"])
            ],
            [
                Paragraph("AVERAGE CPL", styles["CardLabel"]),
                Paragraph("LINK CTR", styles["CardLabel"]),
                Paragraph("TOTAL LEADS", styles["CardLabel"])
            ],
            [
                Paragraph(cpl_str, styles["CardValue"]),
                Paragraph(ctr_str, styles["CardValue"]),
                Paragraph(str(metrics.get("leads", "N/A")), styles["CardValue"])
            ]
        ]
        
        cards_table = Table(cards_data, colWidths=[168, 168, 168])
        cards_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg_card_color),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 10),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ('BOX', (0,0), (-1,-1), 1, border_color),
            ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ]))
        story.append(cards_table)
        story.append(Spacer(1, 25))

        # ==========================================
        # CAMPAIGNS SUMMARY TABLE
        # ==========================================
        story.append(Paragraph("Campaign Delivery Analysis", styles["SectionHeading"]))
        story.append(Paragraph(
            "Below is a list of your Meta Ads campaigns synced over the audited historical window. "
            "Underperforming items are recommended for review or stop-loss, while highly efficient campaigns "
            "are flagged as scaling candidates.",
            styles["BodyTextSlate"]
        ))
        story.append(Spacer(1, 10))

        # Build campaign rows
        headers = [
            Paragraph("Campaign Name", styles["TableHeaderCell"]),
            Paragraph("Spend", styles["TableHeaderCell"]),
            Paragraph("Results", styles["TableHeaderCell"]),
            Paragraph("Cost/Res", styles["TableHeaderCell"]),
            Paragraph("CTR", styles["TableHeaderCell"]),
            Paragraph("Status", styles["TableHeaderCell"])
        ]
        
        table_rows = [headers]
        
        for c in campaigns:
            c_spend = fmt_curr(c.get("spend"))
            c_ctr = f"{c.get('ctr'):.2f}%" if c.get("ctr") is not None else "N/A"
            
            c_cpl = c.get("cpl")
            c_cpl_str = fmt_curr(c_cpl) if c_cpl is not None else "N/A"
            
            table_rows.append([
                Paragraph(c.get("name", "N/A"), styles["TableCell"]),
                Paragraph(c_spend, styles["TableCell"]),
                Paragraph(str(c.get("results", "N/A")), styles["TableCell"]),
                Paragraph(c_cpl_str, styles["TableCell"]),
                Paragraph(c_ctr, styles["TableCell"]),
                Paragraph(c.get("status", "N/A").upper(), styles["TableCell"])
            ])
            
        campaigns_table = Table(table_rows, colWidths=[150, 70, 60, 80, 60, 84])
        campaigns_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), primary_color),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, border_color),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_card_color])
        ]))
        
        # Keep campaigns table together to avoid bad pagebreaks
        story.append(KeepTogether(campaigns_table))
        story.append(Spacer(1, 25))

        # ==========================================
        # INSIGHTS & RECOMMENDATIONS
        # ==========================================
        story.append(Paragraph("Strategic Findings & Recommendations", styles["SectionHeading"]))
        
        if not findings:
            story.append(Paragraph("No critical issues detected in this account audit. The setup complies with standard conversion baselines.", styles["BodyTextSlate"]))
        else:
            findings_flowables = []
            for f in findings:
                finding_text = (
                    f"<b>{f.get('title')}</b><br/>"
                    f"<font color='#64748B'>Impact Area: {f.get('type')}</font><br/>"
                    f"{f.get('recommendation')}<br/>"
                    f"<b>Expected outcome:</b> {f.get('expected_impact')}"
                )
                findings_flowables.append(Paragraph(finding_text, styles["BodyTextSlate"]))
                findings_flowables.append(Spacer(1, 12))
            
            story.append(KeepTogether(findings_flowables))
            
        story.append(Spacer(1, 20))

        # ==========================================
        # CONCLUSION & NEXT STEPS
        # ==========================================
        story.append(Paragraph("Action Plan & Next Steps", styles["SectionHeading"]))
        story.append(Paragraph(
            "1. <b>Scale Winners</b>: Increase the daily budgets of campaigns with healthy ROAS/CPL margins by 15-20% weekly.<br/>"
            "2. <b>Mitigate Losses</b>: Pause or adjust ad sets where acquisition cost exceeds your profit margins or target lead thresholds.<br/>"
            "3. <b>Continuous Monitoring</b>: Review automated daily briefs and let our AI recommendations guide your budget reallocations.",
            styles["BodyTextSlate"]
        ))
        story.append(Spacer(1, 40))
        
        # Closing signature
        story.append(Paragraph("<b>Report compiled automatically by Digital Growth Studio.</b>", styles["CoverMeta"]))

        # Build PDF Document
        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer

    @classmethod
    def generate_strategy_report(cls, user_name: str, contact_phone: str, score: int, priorities: list) -> BytesIO:
        """
        Builds a Strategy Readiness Report PDF with score, priorities, and contact details.
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=72,
            bottomMargin=72
        )

        styles = getSampleStyleSheet()

        # Brand colors
        primary_color = colors.HexColor("#1D4ED8")
        secondary_color = colors.HexColor("#1E293B")
        accent_color = colors.HexColor("#0D9488")
        bg_card_color = colors.HexColor("#F8FAFC")
        border_color = colors.HexColor("#E2E8F0")
        text_muted = colors.HexColor("#64748B")

        # Custom styles
        styles.add(ParagraphStyle(
            name="StrategyCoverTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=28,
            leading=34,
            textColor=primary_color,
            spaceAfter=6,
        ))
        styles.add(ParagraphStyle(
            name="StrategySubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=text_muted,
            spaceAfter=20,
        ))
        styles.add(ParagraphStyle(
            name="StrategySection",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=secondary_color,
            spaceBefore=20,
            spaceAfter=10,
        ))
        styles.add(ParagraphStyle(
            name="StrategyBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#334155"),
            spaceAfter=6,
        ))
        styles.add(ParagraphStyle(
            name="StrategyMeta",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=text_muted,
            spaceAfter=4,
        ))

        story = []

        # ========== COVER ==========
        story.append(Spacer(1, 60))
        story.append(Paragraph("DIGITAL GROWTH STUDIO", ParagraphStyle(
            name="StrategyCoverBrand",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=text_muted,
            spaceAfter=20,
        )))
        story.append(Paragraph("Your Strategy<br/>Readiness Report", styles["StrategyCoverTitle"]))
        story.append(Paragraph(
            "Based on your campaign profile, we have calculated your conversion setup readiness score and key operational priorities.",
            styles["StrategySubtitle"]
        ))

        # User info
        info_data = [
            ["Prepared For:", user_name or "—"],
            ["Phone:", contact_phone or "—"],
            ["Date:", datetime.now().strftime("%B %d, %Y")],
        ]
        info_table = Table(info_data, colWidths=[100, 350])
        info_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TEXTCOLOR", (0, 0), (0, -1), text_muted),
            ("TEXTCOLOR", (1, 0), (1, -1), secondary_color),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 30))

        # ========== SCORE ==========
        score_label = "Conversion Ready" if score >= 80 else ("Requires Tuning" if score >= 60 else "Critical Optimization Needed")
        score_color = colors.HexColor("#059669") if score >= 80 else (colors.HexColor("#D97706") if score >= 60 else colors.HexColor("#DC2626"))

        score_data = [[
            Paragraph(f'<font size="36" color="{primary_color.hexval()}">{score}</font>'
                      f'<font size="12" color="#94A3B8"> / 100</font>', styles["Normal"]),
        ]]
        score_table = Table(score_data, colWidths=[450])
        score_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg_card_color),
            ("BOX", (0, 0), (-1, -1), 1, border_color),
            ("TOPPADDING", (0, 0), (-1, -1), 20),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 20),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]))
        story.append(Paragraph("STRATEGY READINESS SCORE", ParagraphStyle(
            name="ScoreLabel",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=text_muted,
            alignment=1,
            spaceAfter=8,
        )))
        story.append(score_table)
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            f'<font color="{score_color.hexval()}"><b>⚡ {score_label}</b></font>',
            ParagraphStyle(name="ScoreStatus", parent=styles["Normal"], fontSize=10, alignment=1, spaceAfter=20)
        ))

        story.append(PageBreak())

        # ========== PRIORITIES ==========
        story.append(Paragraph("Your Core Strategic Priorities", styles["StrategySection"]))
        story.append(Spacer(1, 8))

        for idx, rec in enumerate(priorities):
            priority_label = f"Priority {idx + 1}"
            rec_type = (rec.get("type") or "optimization").replace("_", " ").upper()
            priority_level = rec.get("priority", "MEDIUM")
            title = rec.get("title", "Untitled")
            recommendation = rec.get("recommendation", "")
            expected_impact = rec.get("expected_impact", "")

            p_color = colors.HexColor("#DC2626") if priority_level == "HIGH" else colors.HexColor("#D97706")

            priority_flowables = []

            # Header row
            header_text = (
                f'<font color="{primary_color.hexval()}"><b>{priority_label}</b></font>'
                f'  <font color="#94A3B8" size="8">{rec_type}</font>'
                f'  <font color="{p_color.hexval()}" size="8"><b>{priority_level}</b></font>'
            )
            priority_flowables.append(Paragraph(header_text, styles["StrategyBody"]))
            priority_flowables.append(Spacer(1, 4))

            # Title
            priority_flowables.append(Paragraph(f"<b>{title}</b>", ParagraphStyle(
                name=f"PriorityTitle{idx}",
                parent=styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=12,
                leading=16,
                textColor=secondary_color,
                spaceAfter=4,
            )))

            # Recommendation text
            priority_flowables.append(Paragraph(recommendation, styles["StrategyBody"]))

            # Expected impact
            if expected_impact:
                priority_flowables.append(Spacer(1, 4))
                priority_flowables.append(Paragraph(
                    f'<font color="#059669"><b>✓ Expected Outcome:</b> {expected_impact}</font>',
                    styles["StrategyMeta"]
                ))

            # Wrap in a table for card-like styling
            card_data = [[priority_flowables]]
            card_table = Table(card_data, colWidths=[450])
            card_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 1, border_color),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
            ]))
            story.append(card_table)
            story.append(Spacer(1, 12))

        story.append(Spacer(1, 30))

        # ========== FOOTER ==========
        story.append(Paragraph(
            "<b>Next Step:</b> Audit your actual campaign performance metrics with a free Ads Health Check.",
            styles["StrategyBody"]
        ))
        story.append(Spacer(1, 20))
        story.append(Paragraph(
            "<b>Report compiled automatically by Digital Growth Studio.</b>",
            styles["StrategyMeta"]
        ))

        # Build
        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer

