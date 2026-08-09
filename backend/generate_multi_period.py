"""
Multi-period parser: processes Monthly Disclosures folder structure,
generates per-period data and fund-level comparisons.

Expected structure:
  Monthly Disclosures/2026/January/*.xlsx
  Monthly Disclosures/2026/February/*.xlsx
"""

import json
import logging
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from parse_disclosures import parse_file, aggregate, SKIP_SHEETS

BASE_DIR = Path(__file__).resolve().parent.parent
DISCLOSURES_ROOT = BASE_DIR / "Monthly Disclosures"
DATA_DIR = BASE_DIR / "data"
OUTPUT_FILE = DATA_DIR / "consolidated.json"

MONTH_ORDER = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

# The user holds exactly these 5 funds. Disclosure folders contain other
# schemes (Samco Multi Cap, plain HDFC Nifty 100, Kotak Midcap 50, Abakkus
# Small Cap / Liquid, etc.) and the Abakkus file is a multi-scheme workbook —
# only the Flexi Cap sheet is held. We filter every parsed period down to these
# canonical scheme names so all downstream aggregation/comparison covers only
# the held portfolio.
HELD_FUNDS = {
    "Zerodha Nifty LargeMidcap 250 Index Fund",
    "Abakkus Flexi Cap Fund",
    "Axis Nifty Smallcap 50 Index Fund",
    "Capitalmind Flexi Cap Fund",
    "HDFC Nifty 100 Equal Weight Index Fund",
    "Capitalmind Multi Asset Allocation Fund",  # data only from April 2026 onward
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def discover_periods() -> list[dict]:
    """Discover all year/month folders under Monthly Disclosures/."""
    periods = []
    if not DISCLOSURES_ROOT.exists():
        return periods

    for year_dir in sorted(DISCLOSURES_ROOT.iterdir()):
        if not year_dir.is_dir() or not year_dir.name.isdigit():
            continue
        year = year_dir.name
        for month_dir in year_dir.iterdir():
            if not month_dir.is_dir():
                continue
            month_name = month_dir.name.strip()
            # Get month index for sorting
            month_idx = next(
                (i for i, m in enumerate(MONTH_ORDER) if m.lower() == month_name.lower()),
                -1,
            )
            if month_idx < 0:
                continue
            xlsx_files = list(month_dir.glob("*.xlsx")) + list(month_dir.glob("*.xls"))
            if xlsx_files:
                periods.append({
                    "year": year,
                    "month": month_name,
                    "month_idx": month_idx,
                    "period_key": f"{year}-{month_idx + 1:02d}",
                    "period_label": f"{month_name} {year}",
                    "dir": month_dir,
                    "files": xlsx_files,
                })

    periods.sort(key=lambda p: (p["year"], p["month_idx"]))
    return periods


# --- Market-cap classification (by index-fund membership) ---
# A stock's large/mid/small nature is stable month to month, so we derive it
# from index-fund membership across ALL periods. This makes the classification
# resilient to a single fund's disclosure being late (e.g. Zerodha Nifty
# LargeMidcap 250 — our only mid-cap reference — missing for a month would
# otherwise collapse every mid cap into the small-cap default).
_LARGE_CAP_PATTERNS = [r"nifty\s*100", r"nifty\s*50", r"sensex", r"large\s*cap", r"bluechip"]
_MID_CAP_PATTERNS = [r"mid\s*cap", r"midcap", r"nifty\s*midcap", r"nifty\s*next"]
_SMALL_CAP_PATTERNS = [r"small\s*cap", r"smallcap", r"nifty\s*smallcap", r"micro\s*cap"]
_CAP_PRIORITY = {"Large Cap": 3, "Mid Cap": 2, "Small Cap": 1}


def _classify_fund_cap(fund_name: str):
    """Map an index fund name to the market-cap category it represents."""
    for p in _LARGE_CAP_PATTERNS:
        if re.search(p, fund_name, re.IGNORECASE):
            return "Large Cap"
    for p in _MID_CAP_PATTERNS:
        if re.search(p, fund_name, re.IGNORECASE):
            return "Mid Cap"
    for p in _SMALL_CAP_PATTERNS:
        if re.search(p, fund_name, re.IGNORECASE):
            return "Small Cap"
    return None


def build_market_cap_map(periods_data: dict) -> dict:
    """
    Build an ISIN -> market-cap category map from index-fund membership across
    every period. Priority Large > Mid > Small, so a stock in both the Nifty 100
    fund and the LargeMidcap 250 fund resolves to Large Cap.
    """
    isin_to_cap = {}
    for data in periods_data.values():
        for stock in data.get("stocks", {}).values():
            isin = stock.get("isin")
            if not isin or stock.get("asset_class") != "Equity":
                continue
            for fh in stock.get("funds", []):
                cat = _classify_fund_cap(fh["scheme_name"])
                if not cat:
                    continue
                existing = isin_to_cap.get(isin)
                if existing is None or _CAP_PRIORITY[cat] > _CAP_PRIORITY[existing]:
                    isin_to_cap[isin] = cat
    return isin_to_cap


def parse_period(period: dict) -> dict:
    """Parse all files for a single period and return aggregated data."""
    all_holdings = []
    files_parsed = []

    for filepath in period["files"]:
        try:
            holdings = parse_file(filepath)
            # Keep only the funds the user actually holds
            kept = [h for h in holdings if h["scheme_name"] in HELD_FUNDS]
            dropped_schemes = {
                h["scheme_name"] for h in holdings if h["scheme_name"] not in HELD_FUNDS
            }
            if dropped_schemes:
                logger.info(f"    Excluding non-held schemes: {sorted(dropped_schemes)}")
            if not kept:
                continue
            schemes = set(h["scheme_name"] for h in kept)
            files_parsed.append({
                "filename": filepath.name,
                "scheme_count": len(schemes),
                "holdings_count": len(kept),
            })
            all_holdings.extend(kept)
        except Exception as e:
            logger.error(f"  Error parsing {filepath.name}: {e}")

    logger.info(f"  {period['period_label']}: {len(all_holdings)} held holdings from {len(files_parsed)} files")
    return aggregate(all_holdings, files_parsed)


def _normalize_fund_name(name: str) -> str:
    """Strip date patterns from fund names for cross-period matching."""
    # Remove "as on DD-Mon-YYYY" or "as on DD Mon YYYY"
    n = re.sub(r"\s+as\s+on\s+\d{1,2}[-\s]?\w+[-\s]?\d{2,4}", "", name, flags=re.IGNORECASE)
    # Remove standalone date patterns like "28 February 2026", "31-Jan-2026"
    n = re.sub(r"\s*\d{1,2}[-\s]?(January|February|March|April|May|June|July|August|September|October|November|December)[-\s]?\d{2,4}", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*\d{1,2}[-\s]?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s]?\d{2,4}", "", n, flags=re.IGNORECASE)
    return n.strip()


def match_fund_across_periods(periods_data: dict) -> dict:
    """
    Build a mapping of fund names across periods.
    Funds with date-varying names (e.g. "Kotak...as on 28-Feb" vs "Kotak...as on 31-Jan")
    are matched by normalizing away the date portion.
    Returns: { canonical_name: { period_key: actual_fund_name } }
    """
    # Group fund names by their normalized form
    norm_to_period_names = defaultdict(dict)
    for period_key, data in periods_data.items():
        for fund_name in data["funds"]:
            norm = _normalize_fund_name(fund_name)
            norm_to_period_names[norm][period_key] = fund_name

    # Build canonical mapping: use the latest period's name as canonical
    canonical = {}
    for norm, period_map in norm_to_period_names.items():
        # Use the name from the latest available period as canonical
        latest_key = sorted(period_map.keys())[-1]
        canon_name = period_map[latest_key]
        canonical[canon_name] = period_map

    return canonical


# 0.5% relative market-value change threshold for Hold classification
MV_HOLD_THRESHOLD = 0.005


def _classify_status(prev: dict, curr: dict) -> str:
    """
    Classify a holding's status based on relative market value change.

    Using market value instead of pct_of_net_assets because percentage
    shifts when total AUM changes, even if the position itself is unchanged.
    """
    prev_mv = prev["market_value_lakhs"]
    curr_mv = curr["market_value_lakhs"]

    if prev_mv > 0:
        mv_rel_change = (curr_mv - prev_mv) / prev_mv
    elif curr_mv > 0:
        mv_rel_change = 1.0
    else:
        mv_rel_change = 0.0

    if abs(mv_rel_change) < MV_HOLD_THRESHOLD:
        return "Hold"
    elif mv_rel_change > 0:
        return "Inc"
    else:
        return "Dec"


def compute_fund_comparison(
    fund_name: str,
    prev_data: dict,
    curr_data: dict,
    prev_period: str,
    curr_period: str,
    prev_fund_name: str = None,
    curr_fund_name: str = None,
) -> dict:
    """
    Compare a single fund's holdings between two periods.
    Returns comparison data with stock statuses (New, Exit, Inc, Dec, Hold).
    """
    prev_fund_name = prev_fund_name or fund_name
    curr_fund_name = curr_fund_name or fund_name

    # Get stocks for this fund from each period
    # Use (name_lower, asset_class) as the composite key so that:
    # - Equity and Derivatives for the same stock stay separate
    # - ISIN changes (e.g. Angel One) are matched by name within same asset class
    def _extract_holdings(period_data, fund_name_to_match):
        holdings = {}
        for key, stock in period_data.get("stocks", {}).items():
            for fh in stock.get("funds", []):
                if fh["scheme_name"] == fund_name_to_match:
                    name = stock["name"]
                    ac = stock.get("asset_class", "Equity")
                    composite_key = (name.strip().lower(), ac)
                    existing = holdings.get(composite_key)
                    # If duplicate composite key, merge (sum values)
                    if existing:
                        existing["market_value_lakhs"] += fh["market_value_lakhs"]
                        existing["pct_of_net_assets"] += fh["pct_of_net_assets"]
                        existing["quantity"] += fh.get("quantity", 0)
                    else:
                        holdings[composite_key] = {
                            "key": key,
                            "name": name,
                            "isin": stock.get("isin"),
                            "sector": stock.get("sector", ""),
                            "asset_class": ac,
                            "market_value_lakhs": fh["market_value_lakhs"],
                            "pct_of_net_assets": fh["pct_of_net_assets"],
                            "quantity": fh.get("quantity", 0),
                        }
                    break
        return holdings

    prev_stocks = _extract_holdings(prev_data, prev_fund_name)
    curr_stocks = _extract_holdings(curr_data, curr_fund_name)

    # --- Match holdings across periods: ISIN first, then (name, asset_class) ---
    # ISIN is the stable identity, so a renamed security (same ISIN, e.g.
    # "Talwandi Sabo Power" -> "Vedanta Power") is tracked as a continued holding
    # (Inc/Dec/Hold) rather than a spurious Exit + New. The (name, asset_class)
    # fallback still catches securities whose ISIN changed (e.g. Angel One) or
    # that have no ISIN.
    prev_by_isin = {h["isin"]: k for k, h in prev_stocks.items() if h["isin"]}
    curr_by_isin = {h["isin"]: k for k, h in curr_stocks.items() if h["isin"]}

    matched_prev, matched_curr = set(), set()
    pairs = []  # list of (prev_key | None, curr_key | None)

    # Phase 1: match by ISIN
    for isin, pk in prev_by_isin.items():
        ck = curr_by_isin.get(isin)
        if ck is not None:
            pairs.append((pk, ck))
            matched_prev.add(pk)
            matched_curr.add(ck)

    # Phase 2: match remaining holdings by (name, asset_class) composite key
    for pk in prev_stocks:
        if pk in matched_prev:
            continue
        if pk in curr_stocks and pk not in matched_curr:
            pairs.append((pk, pk))
            matched_prev.add(pk)
            matched_curr.add(pk)

    # Phase 3: leftovers are genuine exits / new entries
    for pk in prev_stocks:
        if pk not in matched_prev:
            pairs.append((pk, None))
    for ck in curr_stocks:
        if ck not in matched_curr:
            pairs.append((None, ck))

    stocks_comparison = []
    counts = {"new": 0, "exit": 0, "inc": 0, "dec": 0, "hold": 0}

    for pk, ck in pairs:
        prev = prev_stocks.get(pk) if pk is not None else None
        curr = curr_stocks.get(ck) if ck is not None else None

        if curr and not prev:
            status = "New"
            counts["new"] += 1
        elif prev and not curr:
            status = "Exit"
            counts["exit"] += 1
        else:
            status = _classify_status(prev, curr)
            counts[status.lower()] += 1

        ref = curr or prev  # prefer current period's name/sector (shows renames)
        entry = {
            "name": ref["name"],
            "isin": ref.get("isin"),
            "sector": ref.get("sector", ""),
            "asset_class": ref.get("asset_class", "Equity"),
            "status": status,
            "prev_market_value_lakhs": prev["market_value_lakhs"] if prev else None,
            "curr_market_value_lakhs": curr["market_value_lakhs"] if curr else None,
            "prev_pct": prev["pct_of_net_assets"] if prev else None,
            "curr_pct": curr["pct_of_net_assets"] if curr else None,
            "delta_pct": round(
                (curr["pct_of_net_assets"] if curr else 0)
                - (prev["pct_of_net_assets"] if prev else 0),
                2,
            ),
            "prev_quantity": prev["quantity"] if prev else None,
            "curr_quantity": curr["quantity"] if curr else None,
        }
        stocks_comparison.append(entry)

    # Sort: New first, then by current weight descending
    status_order = {"New": 0, "Inc": 1, "Dec": 2, "Hold": 3, "Exit": 4}
    stocks_comparison.sort(
        key=lambda s: (
            status_order.get(s["status"], 5),
            -(s["curr_pct"] or 0),
        )
    )

    # Asset allocation comparison
    prev_fund = prev_data.get("funds", {}).get(prev_fund_name, {})
    curr_fund = curr_data.get("funds", {}).get(curr_fund_name, {})

    def get_asset_allocation(period_data, fname):
        allocation = defaultdict(float)
        total = 0.0
        for key, stock in period_data.get("stocks", {}).items():
            for fh in stock.get("funds", []):
                if fh["scheme_name"] == fname:
                    ac = stock.get("asset_class", "Equity")
                    allocation[ac] += fh["market_value_lakhs"]
                    total += fh["market_value_lakhs"]
                    break
        if total > 0:
            return {ac: round(v / total * 100, 1) for ac, v in allocation.items()}
        return {}

    return {
        "fund_name": fund_name,
        "amc": (curr_fund or prev_fund).get("amc", ""),
        "prev_period": prev_period,
        "curr_period": curr_period,
        "prev_aum_lakhs": round(prev_fund.get("total_aum_lakhs", 0), 2),
        "curr_aum_lakhs": round(curr_fund.get("total_aum_lakhs", 0), 2),
        "total_stocks": len(stocks_comparison),
        "counts": counts,
        "stocks": stocks_comparison,
        "prev_asset_allocation": get_asset_allocation(prev_data, fund_name),
        "curr_asset_allocation": get_asset_allocation(curr_data, fund_name),
    }


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    periods = discover_periods()
    if not periods:
        logger.warning(f"No period folders found in {DISCLOSURES_ROOT}")
        return

    logger.info(f"Found {len(periods)} periods: {[p['period_label'] for p in periods]}")

    # Parse each period
    periods_data = {}
    period_labels = {}
    for period in periods:
        logger.info(f"\n--- Parsing {period['period_label']} ---")
        data = parse_period(period)
        periods_data[period["period_key"]] = data
        period_labels[period["period_key"]] = period["period_label"]

    # Use latest period as the current consolidated data
    latest_key = periods[-1]["period_key"]
    latest_data = periods_data[latest_key]

    # Build market-cap classification across all periods and stamp it onto the
    # latest-period equity stocks so the frontend can classify Large/Mid/Small
    # even when an index fund is missing from the current month.
    market_cap_map = build_market_cap_map(periods_data)
    cap_counts = defaultdict(int)
    for stock in latest_data.get("stocks", {}).values():
        isin = stock.get("isin")
        if stock.get("asset_class") == "Equity" and isin and isin in market_cap_map:
            stock["market_cap"] = market_cap_map[isin]
            cap_counts[market_cap_map[isin]] += 1
    logger.info(
        f"Market-cap map: {len(market_cap_map)} ISINs classified across all periods; "
        f"latest-period stamped: {dict(cap_counts)}"
    )

    # Generate comparisons between consecutive periods
    comparisons = {}
    period_keys = [p["period_key"] for p in periods]
    for i in range(1, len(period_keys)):
        prev_key = period_keys[i - 1]
        curr_key = period_keys[i]
        prev_data = periods_data[prev_key]
        curr_data = periods_data[curr_key]

        comparison_key = f"{prev_key}_vs_{curr_key}"
        logger.info(f"\n--- Comparing {period_labels[prev_key]} vs {period_labels[curr_key]} ---")

        # Match funds across periods using normalized names
        fund_mapping = match_fund_across_periods({
            prev_key: prev_data, curr_key: curr_data,
        })

        fund_comparisons = {}
        for canon_name, period_names in sorted(fund_mapping.items()):
            prev_fund_name = period_names.get(prev_key)
            curr_fund_name = period_names.get(curr_key)

            # Use whichever name is available for comparison
            comp = compute_fund_comparison(
                prev_fund_name or curr_fund_name,
                prev_data if prev_fund_name else {"stocks": {}, "funds": {}},
                curr_data if curr_fund_name else {"stocks": {}, "funds": {}},
                period_labels[prev_key], period_labels[curr_key],
                prev_fund_name=prev_fund_name,
                curr_fund_name=curr_fund_name,
            )
            fund_comparisons[canon_name] = comp
            c = comp["counts"]
            logger.info(
                f"  {canon_name}: {comp['total_stocks']} stocks "
                f"(New:{c['new']} Exit:{c['exit']} Inc:{c['inc']} Dec:{c['dec']} Hold:{c['hold']})"
            )

        comparisons[comparison_key] = {
            "prev_period": prev_key,
            "curr_period": curr_key,
            "prev_label": period_labels[prev_key],
            "curr_label": period_labels[curr_key],
            "funds": fund_comparisons,
        }

    # Build the final output
    result = {
        **latest_data,
        "periods": {
            key: {
                "label": period_labels[key],
                "meta": data["meta"],
                "funds": {
                    fname: {
                        "amc": fdata["amc"],
                        "total_aum_lakhs": fdata["total_aum_lakhs"],
                        "holding_count": fdata["holding_count"],
                    }
                    for fname, fdata in data["funds"].items()
                },
                "concentration": data["concentration"],
                "liquidity_summary": data["liquidity_summary"],
            }
            for key, data in periods_data.items()
        },
        "comparisons": comparisons,
        "current_period": latest_key,
        "period_keys": period_keys,
        "period_labels": period_labels,
        "market_cap_map": market_cap_map,
    }

    # Write output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    logger.info(f"\nMulti-period data written to {OUTPUT_FILE}")
    logger.info(f"  Periods: {list(period_labels.values())}")
    logger.info(f"  Comparisons: {list(comparisons.keys())}")

    # Copy to frontend
    frontend_data = BASE_DIR / "frontend" / "public" / "data"
    frontend_data.mkdir(parents=True, exist_ok=True)
    import shutil
    shutil.copy2(OUTPUT_FILE, frontend_data / "consolidated.json")
    logger.info(f"  Copied to frontend: {frontend_data / 'consolidated.json'}")


if __name__ == "__main__":
    main()
