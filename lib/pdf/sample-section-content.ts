import type { SectionType } from "@/types";

/**
 * Generic, project-agnostic sample content per section type, used only to
 * preview a template's structure and formatting while it's being built —
 * before any real builder/project/contractor is selected. Real reports
 * replace this with live data (see lib/ai/gemini.ts's fallback renderer,
 * or actual Gemini output).
 */
export function getSampleSectionHtml(type: SectionType): string {
  switch (type) {
    case "project_information":
      return `<table class="report-table"><tbody>
        <tr><th>Project Name</th><td>Sample Project</td><th>Project Code</th><td>PRJ-0001</td></tr>
        <tr><th>Address</th><td colspan="3">123 Main Street, Sample City, ST</td></tr>
        <tr><th>Status</th><td>In Progress</td><th>Percent Complete</th><td>65%</td></tr>
        <tr><th>Start Date</th><td>Jan 1, 2026</td><th>Est. Completion</th><td>Dec 1, 2026</td></tr>
      </tbody></table>`;
    case "client_information":
      return `<p><strong>Client:</strong> Sample Client Co. — 500 Client Ave, Sample City, ST</p>`;
    case "builder_information":
      return `<p><strong>Builder:</strong> Your Company Name — Licensed General Contractor</p>`;
    case "contractor_information":
      return `<p><strong>Contractor:</strong> Sample Contractor LLC — Concrete &amp; Masonry</p>`;
    case "engineer_information":
      return `<p><strong>Engineer:</strong> Jane Engineer, PE — Structural Engineer of Record</p>`;
    case "weather_conditions":
      return `<table class="report-table"><thead><tr><th>Date</th><th>Conditions</th><th>High / Low</th><th>Precip.</th><th>Wind</th><th>Workable Hours</th></tr></thead><tbody>
        <tr><td>Jul 6, 2026</td><td>Clear</td><td>72°F / 58°F</td><td>0.0in</td><td>8mph</td><td>8</td></tr>
        <tr><td>Jul 7, 2026</td><td>Partly Cloudy</td><td>68°F / 55°F</td><td>0.1in</td><td>12mph</td><td>7.5</td></tr>
      </tbody></table>`;
    case "daily_progress":
      return `<p><strong>Jul 9, 2026 (Clear, 71°F):</strong> Sample narrative of work completed on site today — framing, MEP rough-in, or whichever trades are active. Crew on site: 24, hours worked: 192. No incidents reported.</p>`;
    case "weekly_progress":
      return `<p>Sample rollup narrative summarizing work completed across the reporting week — structural progress, trade coordination, and any notable delays or accelerations.</p>`;
    case "look_ahead_schedule":
      return `<table class="report-table"><thead><tr><th>Activity</th><th>Trade</th><th>Planned Start</th><th>Planned End</th><th>Notes</th></tr></thead><tbody>
        <tr><td>Sample upcoming activity</td><td>Framing</td><td>Jul 14, 2026</td><td>Jul 18, 2026</td><td>Pending material delivery</td></tr>
      </tbody></table>`;
    case "material_usage":
      return `<table class="report-table"><thead><tr><th>Material</th><th>Planned</th><th>Used</th><th>Remaining</th></tr></thead><tbody>
        <tr><td>Ready-Mix Concrete</td><td>500 cu yd</td><td>320 cu yd</td><td>180 cu yd</td></tr>
        <tr><td>Framing Lumber</td><td>60,000 board ft</td><td>38,000 board ft</td><td>22,000 board ft</td></tr>
      </tbody></table>`;
    case "deliveries":
      return `<table class="report-table"><thead><tr><th>Date</th><th>Vendor</th><th>Material</th><th>Quantity</th><th>Condition</th></tr></thead><tbody>
        <tr><td>Jul 9, 2026</td><td>Sample Supply Co.</td><td>Structural steel</td><td>12 tons</td><td>Good</td></tr>
      </tbody></table>`;
    case "equipment":
      return `<table class="report-table"><thead><tr><th>Equipment</th><th>Type</th><th>Qty</th><th>Hours Used</th><th>Status</th></tr></thead><tbody>
        <tr><td>Tower Crane</td><td>Crane</td><td>1</td><td>420</td><td>Operational</td></tr>
        <tr><td>Excavator</td><td>Earthmoving</td><td>2</td><td>180</td><td>Idle</td></tr>
      </tbody></table>`;
    case "labour":
      return `<table class="report-table"><thead><tr><th>Role</th><th>Headcount</th><th>Hours Logged</th><th>Shift</th></tr></thead><tbody>
        <tr><td>Carpenters</td><td>12</td><td>1,920</td><td>Day</td></tr>
        <tr><td>Electricians</td><td>5</td><td>800</td><td>Day</td></tr>
      </tbody></table>`;
    case "subcontractor_log":
      return `<table class="report-table"><thead><tr><th>Date</th><th>Contractor</th><th>Trade</th><th>Crew Size</th><th>Scope Today</th></tr></thead><tbody>
        <tr><td>Jul 9, 2026</td><td>Sample Contractor LLC</td><td>Electrical</td><td>6</td><td>Level 2 rough-in continued</td></tr>
      </tbody></table>`;
    case "budget":
      return `<table class="report-table"><thead><tr><th>Category</th><th>Allocated</th><th>Spent</th><th>Remaining</th></tr></thead><tbody>
        <tr><td>Site Work &amp; Foundation</td><td>$620,000</td><td>$598,000</td><td>$22,000</td></tr>
        <tr><td>Structural Framing</td><td>$980,000</td><td>$640,000</td><td>$340,000</td></tr>
      </tbody></table>`;
    case "cost_forecast":
      return `<table class="report-table"><tbody>
        <tr><th>Budget at Completion</th><td>$4,200,000</td><th>Actual Cost to Date</th><td>$1,890,000</td></tr>
        <tr><th>Percent Complete</th><td>42%</td><th>Cost Performance Index</th><td>0.98</td></tr>
        <tr><th>Forecast at Completion</th><td colspan="3">$4,285,000</td></tr>
      </tbody></table>`;
    case "timeline":
      return `<table class="report-table"><thead><tr><th>Milestone</th><th>Planned</th><th>Actual</th><th>Status</th></tr></thead><tbody>
        <tr><td>Foundation Complete</td><td>Mar 25, 2026</td><td>Mar 28, 2026</td><td>Completed</td></tr>
        <tr><td>Framing Complete</td><td>Jun 15, 2026</td><td>—</td><td>In Progress</td></tr>
      </tbody></table>`;
    case "change_orders":
      return `<table class="report-table"><thead><tr><th>CO #</th><th>Description</th><th>Date</th><th>Cost Impact</th><th>Status</th></tr></thead><tbody>
        <tr><td>CO-001</td><td>Sample scope addition requested by owner</td><td>Jun 15, 2026</td><td>$28,500</td><td>Approved</td></tr>
      </tbody></table>`;
    case "rfi_log":
      return `<table class="report-table"><thead><tr><th>RFI #</th><th>Subject</th><th>Submitted</th><th>Status</th><th>Response</th></tr></thead><tbody>
        <tr><td>RFI-001</td><td>Sample clarification request</td><td>Jun 28, 2026</td><td>Answered</td><td>See revised detail issued Jul 2, 2026.</td></tr>
      </tbody></table>`;
    case "submittals":
      return `<table class="report-table"><thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Due</th><th>Status</th></tr></thead><tbody>
        <tr><td>SUB-001</td><td>Sample shop drawing submittal</td><td>Shop Drawing</td><td>Jul 17, 2026</td><td>Pending</td></tr>
      </tbody></table>`;
    case "quality_inspection":
      return `<table class="report-table"><thead><tr><th>Date</th><th>Area</th><th>Inspector</th><th>Result</th><th>Deficiencies</th></tr></thead><tbody>
        <tr><td>Jul 8, 2026</td><td>Sample inspection area</td><td>Jane Engineer, PE</td><td>Pass</td><td>None</td></tr>
      </tbody></table>`;
    case "punch_list":
      return `<table class="report-table"><thead><tr><th>ID</th><th>Area</th><th>Item</th><th>Priority</th><th>Status</th></tr></thead><tbody>
        <tr><td>PL-001</td><td>Sample area</td><td>Sample punch item description</td><td>Low</td><td>Open</td></tr>
      </tbody></table>`;
    case "safety_incidents":
      return `<table class="report-table"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Severity</th><th>Status</th></tr></thead><tbody>
        <tr><td>Jul 9, 2026</td><td>Toolbox Talk</td><td>Weekly fall-protection briefing</td><td>Low</td><td>Resolved</td></tr>
      </tbody></table>`;
    case "permits_compliance":
      return `<table class="report-table"><thead><tr><th>Permit Type</th><th>Number</th><th>Status</th><th>Last Inspection</th></tr></thead><tbody>
        <tr><td>Building Permit</td><td>BP-2026-0001</td><td>Approved</td><td>Framing — Pass</td></tr>
      </tbody></table>`;
    case "risk_register":
      return `<table class="report-table"><thead><tr><th>Category</th><th>Description</th><th>Likelihood</th><th>Impact</th><th>Mitigation</th></tr></thead><tbody>
        <tr><td>Schedule</td><td>Sample identified risk description</td><td>Medium</td><td>Medium</td><td>Sample mitigation plan</td></tr>
      </tbody></table>`;
    case "visitor_log":
      return `<table class="report-table"><thead><tr><th>Date</th><th>Visitor</th><th>Company</th><th>Purpose</th></tr></thead><tbody>
        <tr><td>Jul 8, 2026</td><td>Sample Visitor</td><td>Sample Client Co.</td><td>Owner walkthrough</td></tr>
      </tbody></table>`;
    case "images":
      return `<div><p><em>Sample site photo caption</em> — captured Jul 9, 2026</p><p><em>Another sample photo caption</em> — captured Jul 8, 2026</p></div>`;
    case "ai_summary":
      return `<p>Sample AI-generated executive summary highlighting overall project health, progress against schedule, and any items requiring attention this period.</p>`;
    case "recommendations":
      return `<ul><li>Sample recommendation regarding schedule adherence.</li><li>Sample recommendation regarding material or labour planning.</li></ul>`;
    case "signature":
      return `<p>Prepared by: _______________________&nbsp;&nbsp;&nbsp;&nbsp;Date: ______________</p><p>Reviewed by: _______________________&nbsp;&nbsp;&nbsp;&nbsp;Date: ______________</p>`;
    case "appendix":
      return `<p><em>Supporting documents and references will appear here.</em></p>`;
    default:
      return `<p><em>Sample content will appear here.</em></p>`;
  }
}
