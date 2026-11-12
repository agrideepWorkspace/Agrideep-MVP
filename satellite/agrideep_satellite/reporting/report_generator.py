"""Scientific PDF monitoring report generation."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def _display(value: Any, *, digits: int = 3) -> str:
    return "Not available" if value is None else f"{float(value):.{digits}f}"


def _table(rows: list[list[str]], widths: list[float]) -> Table:
    table = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#174d35")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#dce4df")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f7f5")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def generate_monitoring_report(
    result: dict[str, Any],
    *,
    map_path: Path,
    ndvi_map_path: Path,
    ndmi_map_path: Path,
    ndvi_chart_path: Path,
    ndmi_chart_path: Path,
    destination: Path,
) -> None:
    """Create a report that states data gaps and scientific limits explicitly."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="ReportSubtitle",
            parent=styles["BodyText"],
            fontSize=11,
            textColor=colors.HexColor("#55615c"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading2"],
            textColor=colors.HexColor("#174d35"),
            spaceBefore=8,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SmallBody",
            parent=styles["BodyText"],
            fontSize=8.5,
            leading=12,
            alignment=TA_LEFT,
        )
    )

    metadata = result["metadata"]
    summary = result["summary"]
    observations = result["observations"]
    valid_observations = [item for item in observations if item["valid"]]
    story: list[Any] = [
        Paragraph("AgriDeep | Orchard Satellite Monitoring", styles["Title"]),
        Paragraph(
            "Scientific summary of Sentinel-2 vegetation-index observations",
            styles["ReportSubtitle"],
        ),
        Spacer(1, 5 * mm),
        Paragraph("Orchard and monitoring period", styles["SectionHeading"]),
    ]
    orchard_name = metadata.get("orchard_identifier") or "Identifier not provided"
    orchard_rows = [
        ["Orchard identifier", orchard_name],
        ["Area", f"{metadata['area_ha']:.2f} ha (geodesic WGS84)"],
        ["Geometry", metadata["geometry_type"]],
        ["Period", f"{metadata['start_date']} to {metadata['end_date']}"],
        ["Data source", metadata["source"]],
        ["Processing scale", f"{metadata['processing_scale_m']} m regional statistics"],
        ["Maximum orchard cloud/shadow coverage", f"{metadata['max_cloud_pct']:.1f}%"],
    ]
    story.append(
        _table(
            [["Field", "Value"], *orchard_rows],
            [45 * mm, 125 * mm],
        )
    )
    story.extend(
        [
            Paragraph("Boundary map", styles["SectionHeading"]),
            Image(str(map_path), width=150 * mm, height=104 * mm, kind="proportional"),
            Paragraph(
                "The map shows only the supplied boundary; it is not a satellite "
                "basemap or an independent land-cover classification.",
                styles["SmallBody"],
            ),
            Paragraph("Observation quality", styles["SectionHeading"]),
        ]
    )
    quality_rows = [
        ["Acquisitions", str(summary["n_observations"])],
        ["Valid observations", str(summary["n_valid"])],
        ["Invalid observations", str(summary["n_invalid"])],
        [
            "Mean orchard cloud/shadow area",
            f"{_display(summary['mean_cloud_pct'], digits=2)}%",
        ],
        [
            "Mean valid-pixel area",
            f"{_display(summary['mean_valid_pixel_pct'], digits=2)}%",
        ],
    ]
    story.append(_table([["Quality measure", "Value"], *quality_rows], [75 * mm, 95 * mm]))

    story.extend(
        [
            PageBreak(),
            Paragraph(
                "Vegetation-index results (across valid observation means)",
                styles["SectionHeading"],
            ),
            Paragraph(
                "The table summarizes the distribution of valid orchard-level "
                "observation means across dates. Per-observation pixel-level "
                "statistics are included in the CSV and JSON exports.",
                styles["SmallBody"],
            ),
        ]
    )
    if valid_observations:
        index_rows = [["Index", "Mean", "Median", "Minimum", "Maximum", "Std. dev."]]
        for index_name in ("ndvi", "ndmi"):
            index_rows.append(
                [
                    index_name.upper(),
                    _display(summary[f"{index_name}_mean"]),
                    _display(summary[f"{index_name}_median"]),
                    _display(summary[f"{index_name}_min"]),
                    _display(summary[f"{index_name}_max"]),
                    _display(summary[f"{index_name}_std_dev"]),
                ]
            )
        story.append(
            _table(
                index_rows,
                [24 * mm, 26 * mm, 26 * mm, 26 * mm, 26 * mm, 26 * mm],
            )
        )
    else:
        story.append(
            Paragraph(
                "No valid satellite observations were available for this period. "
                "Index values and trends are not reported.",
                styles["BodyText"],
            )
        )

    story.extend(
        [
            Spacer(1, 4 * mm),
            Paragraph("Latest available spatial index maps", styles["SectionHeading"]),
            Image(
                str(ndvi_map_path),
                width=150 * mm,
                height=95 * mm,
                kind="proportional",
            ),
            Image(
                str(ndmi_map_path),
                width=150 * mm,
                height=95 * mm,
                kind="proportional",
            ),
            Image(str(ndvi_chart_path), width=170 * mm, height=68 * mm, kind="proportional"),
            Image(str(ndmi_chart_path), width=170 * mm, height=68 * mm, kind="proportional"),
            Paragraph("Observed changes and statistical screening", styles["SectionHeading"]),
        ]
    )
    temporal = result["temporal_analysis"]
    anomalies = temporal["anomalies"]
    if anomalies:
        anomaly_rows = [["Date", "Index", "Observed value", "Screening note"]]
        anomaly_rows.extend(
            [
                item["date"],
                item["metric"].upper(),
                _display(item["value"]),
                item["interpretation"],
            ]
            for item in anomalies
        )
        story.append(
            _table(
                anomaly_rows,
                [22 * mm, 18 * mm, 25 * mm, 105 * mm],
            )
        )
    elif len(valid_observations) < 5:
        story.append(
            Paragraph(
                "Anomaly screening was not performed because fewer than five valid "
                "observations are available. No agricultural cause is inferred.",
                styles["SmallBody"],
            )
        )
    else:
        story.append(
            Paragraph(
                "No statistical outlier was flagged in the available observations. "
                "Screening does not infer an agricultural cause.",
                styles["SmallBody"],
            )
        )

    comparison = summary.get("period_comparison")
    if comparison:
        comparison_rows = [["Index", "Earlier mean", "Later mean", "Change"]]
        for index_name in ("ndvi", "ndmi"):
            values = comparison.get(index_name)
            if values:
                change = values["percent_change"]
                change_text = (
                    "Not defined (zero baseline)"
                    if change is None
                    else f"{change:+.1f}%"
                )
                comparison_rows.append(
                    [
                        index_name.upper(),
                        _display(values["baseline_mean"]),
                        _display(values["comparison_mean"]),
                        change_text,
                    ]
                )
        if len(comparison_rows) > 1:
            story.extend(
                [
                    Paragraph("First-half / second-half comparison", styles["Heading3"]),
                    _table(comparison_rows, [30 * mm, 40 * mm, 40 * mm, 60 * mm]),
                ]
            )

    story.extend(
        [
            PageBreak(),
            Paragraph("Observation log", styles["SectionHeading"]),
        ]
    )
    temporal_by_date = {
        item["date"]: item for item in temporal["observations"]
    }
    observation_rows = [[
        "Date",
        "Status",
        "NDVI",
        "NDMI",
        "Δ NDVI",
        "Δ NDMI",
        "Cloud %",
        "Valid pixels %",
    ]]
    for item in observations:
        changes = temporal_by_date.get(item["date"], {})
        ndvi_change = changes.get("ndvi_change_from_baseline") or {}
        ndmi_change = changes.get("ndmi_change_from_baseline") or {}
        observation_rows.append(
            [
                item["date"],
                "Valid" if item["valid"] else item["invalid_reason"] or "Invalid",
                _display(item["ndvi"]),
                _display(item["ndmi"]),
                _display(ndvi_change.get("absolute_change")),
                _display(ndmi_change.get("absolute_change")),
                _display(item["cloud_pct"], digits=1),
                _display(item["valid_pixel_pct"], digits=1),
            ]
        )
    if len(observation_rows) == 1:
        observation_rows.append(["No observations", "—", "—", "—", "—", "—"])
    story.append(
        _table(
            observation_rows,
            [23 * mm, 25 * mm, 16 * mm, 16 * mm, 19 * mm, 19 * mm, 22 * mm, 30 * mm],
        )
    )
    story.extend(
        [
            Paragraph("Methodology and limitations", styles["SectionHeading"]),
            Paragraph(
                "NDVI = (B8 − B4) / (B8 + B4), using Sentinel-2 B8 and B4 at "
                "10 m native resolution. NDMI = (B8 − B11) / (B8 + B11); "
                "B11 is 20 m, so NDMI is exported at 20 m. Statistics use a "
                f"{metadata['processing_scale_m']} m scale. Nearest-neighbor "
                "sampling is used by Earth Engine when a source band is evaluated "
                "on a different scale; the output is not presented as finer "
                "spatial detail.",
                styles["SmallBody"],
            ),
            Spacer(1, 2 * mm),
            Paragraph(
                "NDVI is a relative spectral greenness indicator. NDMI is a "
                "near-infrared/SWIR contrast sensitive to canopy moisture and "
                "structure. Comparing observations is most informative when "
                "season, acquisition conditions, and data quality are considered; "
                "neither index is a direct measurement of plant or soil water.",
                styles["SmallBody"],
            ),
            Spacer(1, 2 * mm),
            Paragraph(
                "SCL classes 0, 1, 3, 7, 8, 9, 10, and 11 are masked; cloud "
                "percentage counts classes 3, 8, 9, and 10 over the orchard. "
                "Scene-wide cloud metadata is reported separately from this "
                "orchard-level estimate.",
                styles["SmallBody"],
            ),
            Spacer(1, 2 * mm),
            Paragraph(
                "NDVI and NDMI are spectral indicators, not independent "
                "measurements of olive-oil quality or authenticity. They do not "
                "determine harvest dates or confirm disease, drought, irrigation "
                "failure, or any other agricultural cause. Changes and outlier "
                "flags are observations for further investigation; field "
                "assessment and laboratory analysis are needed for conclusions "
                "outside the scope of satellite indices.",
                styles["SmallBody"],
            ),
            Paragraph(
                "Clouds, shadows, sensor coverage, mixed pixels, seasonal effects, "
                "and the 10–20 m band resolutions limit interpretation. Missing "
                "observations are not interpolated or replaced with zero.",
                styles["SmallBody"],
            ),
        ]
    )
    if result.get("warnings"):
        story.append(Paragraph("Processing warnings", styles["SectionHeading"]))
        for warning in result["warnings"]:
            story.append(Paragraph(warning, styles["SmallBody"]))

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    def draw_footer(canvas: Any, document: Any) -> None:
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#55615c"))
        canvas.drawString(20 * mm, 12 * mm, f"Generated {generated_at} | AgriDeep")
        canvas.drawRightString(190 * mm, 12 * mm, f"Page {document.page}")
        canvas.restoreState()

    document = SimpleDocTemplate(
        str(destination),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=17 * mm,
        bottomMargin=20 * mm,
        title="AgriDeep orchard satellite monitoring report",
        author="AgriDeep Satellite Engine",
    )
    document.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
