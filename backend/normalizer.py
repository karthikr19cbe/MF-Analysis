"""
Stock name normalization, column alias matching, and cash-equivalent detection
for Indian mutual fund SEBI monthly portfolio disclosures.
"""

import re
import difflib
from typing import Optional

# Canonical column name -> list of known header variants in SEBI disclosures
COLUMN_ALIASES = {
    "isin": [
        "isin", "isin code", "isin no", "isin number", "isin no.",
    ],
    "stock_name": [
        "name of the instrument", "name of instrument", "instrument name",
        "security name", "name of the security", "stock name", "scrip name",
        "company name", "name of holding", "name of the instruments",
        "name of security", "instrument", "name",
    ],
    "sector": [
        "industry", "sector", "industry/sector", "industry classification",
        "sub industry", "asset class", "industry/ rating",
        "industry/rating", "rating/industry", "industry / rating",
    ],
    "quantity": [
        "quantity", "qty", "no. of shares", "number of shares", "units",
        "no of shares", "qty.", "holding",
    ],
    "market_value": [
        "market value", "market/fair value", "mv",
        "market value (rs. in lakhs)", "market value (in lakhs)",
        "value (in lakhs)", "market value in lakhs",
        "market value (rs in crores)", "market value (rs. in crores)",
        "market value (in crores)", "market/ fair value",
        "market value(rs in lakhs)", "market value(in lakhs)",
        "market/fair value (in rs.)", "market / fair value",
    ],
    "pct_net_assets": [
        "% to net assets", "% of net assets", "% to nav",
        "% of nav", "% of total", "% to total net assets",
        "percentage to net assets", "% of total net assets",
        "% to total", "% net assets", "% of aum",
        "%to net assets", "% to  net assets",
    ],
    "rating": [
        "rating", "credit rating", "rating / industry",
    ],
}

# Keywords that identify cash-equivalent instruments
CASH_KEYWORDS = {
    "cash": "Cash",
    "cblo": "CBLO",
    "treps": "TREPS",
    "tri-party repo": "TREPS",
    "triparty repo": "TREPS",
    "reverse repo": "Reverse Repo",
    "repo": "Reverse Repo",
    "clearing corporation of india": "TREPS",
    "ccil": "TREPS",
    "treasury bill": "Treasury Bills",
    "t-bill": "Treasury Bills",
    "treasury bills": "Treasury Bills",
    "net receivable": "Net Receivables",
    "net receivables": "Net Receivables",
    "net current asset": "Net Current Assets",
    "net current assets": "Net Current Assets",
    "fixed deposit": "Fixed Deposit",
    "certificate of deposit": "Certificate of Deposit",
    "commercial paper": "Commercial Paper",
}

# Suffixes to strip during name normalization
_NAME_SUFFIXES = [
    r"\bltd\.?$", r"\blimited$", r"\binc\.?$", r"\bincorporated$",
    r"\bcorp\.?$", r"\bcorporation$", r"\bplc\.?$", r"\bllc\.?$",
    r"\bnv$", r"\bsa$",
]
_SUFFIX_PATTERN = re.compile(
    "|".join(_NAME_SUFFIXES), re.IGNORECASE
)


_DERIVATIVE_SUFFIX = re.compile(
    r"\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+\d{4}\s+(?:Future|Futures|Option|Options|Call|Put)\s*$",
    re.IGNORECASE
)

def normalize_name(raw: str) -> str:
    """Normalize a stock/company name for consistent matching."""
    if not raw or not isinstance(raw, str):
        return ""
    name = raw.strip()
    # Remove derivative contract suffixes (e.g., "March 2026 Future")
    name = _DERIVATIVE_SUFFIX.sub("", name)
    # Strip trailing SEBI disclosure footnote markers (* ** # ^ £ and stray
    # non-decodable symbols) before suffix handling, e.g. "...Ltd.£",
    # "Malco Energy Limited **#" -> clean name.
    name = re.sub(r"[\s*#^~£¥§•·£�]+$", "", name)
    # Remove trailing dots and extra whitespace
    name = re.sub(r"\.+$", "", name)
    # Case-fold
    name = name.strip().title()
    # Remove common suffixes
    name = _SUFFIX_PATTERN.sub("", name).strip()
    # Remove trailing dots again after suffix removal
    name = re.sub(r"\.+$", "", name).strip()
    # Collapse multiple spaces
    name = re.sub(r"\s+", " ", name)
    return name


# Explicit overrides for scheme names that can't be auto-detected correctly
_SCHEME_NAME_OVERRIDES = {
    "capitalmind mutual fund": "Capitalmind Flexi Cap Fund",
    "pursuant to regulation 59a of securities & exchange board of india (mutual funds) regulations, 1996": "Zerodha Nifty LargeMidcap 250 Index Fund",
}


def normalize_scheme_name(raw: str) -> str:
    """Normalize a mutual fund scheme name to proper title case."""
    if not raw or not isinstance(raw, str):
        return raw
    name = raw.strip()
    # Check explicit overrides first
    override = _SCHEME_NAME_OVERRIDES.get(name.lower().strip())
    if override:
        return override
    # Collapse whitespace
    name = re.sub(r"\s+", " ", name)
    # Strip common prefixes like "Portfolio Of"
    name = re.sub(r"^(?:Portfolio\s+Of|Statement\s+Of)\s+", "", name, flags=re.IGNORECASE)
    # Strip trailing date suffixes like "As On 28-Feb-2026" or "As On February 2026"
    name = re.sub(
        r"\s+As\s+On\s+\d{1,2}[-/]\w{3,9}[-/]\d{2,4}\s*$", "", name, flags=re.IGNORECASE
    )
    name = re.sub(
        r"\s+As\s+On\s+\w+\s+\d{2,4}\s*$", "", name, flags=re.IGNORECASE
    )
    # Strip long parenthetical descriptions
    name = re.sub(r"\s*\(An?\s+Open\s+Ended\s+.*?\)\s*$", "", name, flags=re.IGNORECASE)
    name = name.strip()
    # Title-case each word, but preserve common uppercase acronyms
    _UPPERCASE_WORDS = {
        "ETF", "IDCW", "NAV", "SIP", "NFO", "AUM", "ELSS", "FOF",
        "SBI", "HDFC", "ICICI", "DSP", "UTI", "PGIM", "HSBC", "PPFAS",
        "IIFL", "ITI", "JM", "LIC", "NJ", "NPS", "ABSL",
    }
    words = name.split()
    result = []
    for w in words:
        upper = w.upper()
        if upper in _UPPERCASE_WORDS:
            result.append(upper)
        elif len(w) <= 1:
            result.append(w.upper())
        else:
            result.append(w[0].upper() + w[1:].lower() if w[0].islower() or w.isupper() or w.islower() else w)
    return " ".join(result)


def detect_cash_equivalent(name: str, isin: Optional[str] = None) -> Optional[str]:
    """
    Detect if a holding is a cash/liquid equivalent.
    Returns the category string (e.g., 'Cash', 'TREPS') or None if it's a regular equity holding.
    """
    if not name:
        return None

    name_lower = name.lower().strip()

    # Check by keywords in name
    for keyword, category in CASH_KEYWORDS.items():
        if keyword in name_lower:
            return category

    # Check by ISIN pattern - government securities often start with IN00
    if isin and isinstance(isin, str):
        isin = isin.strip()
        if isin.startswith("IN00"):
            return "Government Securities"

    return None


def _clean_header(header: str) -> str:
    """Clean a header string for comparison."""
    if not header or not isinstance(header, str):
        return ""
    return re.sub(r"\s+", " ", header.strip().lower())


def _get_data_column(sheet, row_idx: int, col_idx: int) -> int:
    """
    If a header cell is part of a merged range, return the rightmost column
    of that range (where the data typically lives). Otherwise return col_idx.
    """
    for mr in sheet.merged_cells.ranges:
        if mr.min_row <= row_idx <= mr.max_row and mr.min_col <= col_idx <= mr.max_col:
            return mr.max_col
    return col_idx


def find_header_row(sheet, max_rows: int = 15) -> tuple[int, dict]:
    """
    Scan the first `max_rows` rows of an openpyxl sheet to find the header row.
    Returns (row_index, column_mapping) where column_mapping is {canonical_name: column_index}.
    """
    best_row = -1
    best_mapping = {}
    best_score = 0

    for row_idx in range(1, min(max_rows + 1, sheet.max_row + 1)):
        row_values = []
        for col_idx in range(1, min(sheet.max_column + 1, 30)):
            cell = sheet.cell(row=row_idx, column=col_idx)
            val = cell.value
            if val is not None:
                row_values.append((col_idx, str(val)))

        if not row_values:
            continue

        mapping = {}
        score = 0

        for col_idx, raw_val in row_values:
            cleaned = _clean_header(raw_val)
            if not cleaned:
                continue

            # If this header cell is merged, use the rightmost column for data
            data_col = _get_data_column(sheet, row_idx, col_idx)

            # Try exact match first
            for canonical, aliases in COLUMN_ALIASES.items():
                if canonical in mapping:
                    continue
                if cleaned in aliases:
                    mapping[canonical] = data_col
                    score += 2
                    break
            else:
                # Try fuzzy match
                all_aliases = []
                alias_to_canonical = {}
                for canonical, aliases in COLUMN_ALIASES.items():
                    if canonical in mapping:
                        continue
                    for a in aliases:
                        all_aliases.append(a)
                        alias_to_canonical[a] = canonical

                matches = difflib.get_close_matches(cleaned, all_aliases, n=1, cutoff=0.7)
                if matches:
                    canonical = alias_to_canonical[matches[0]]
                    if canonical not in mapping:
                        mapping[canonical] = data_col
                        score += 1

        if score > best_score:
            best_score = score
            best_row = row_idx
            best_mapping = mapping

    return best_row, best_mapping


def detect_unit_multiplier(sheet, header_row: int, market_value_col: int) -> float:
    """
    Detect if market values are in Lakhs or Crores by examining the header.
    Returns a multiplier to normalize to Lakhs.
    """
    cell_value = sheet.cell(row=header_row, column=market_value_col).value
    if cell_value and isinstance(cell_value, str):
        lower = cell_value.lower()
        if "crore" in lower:
            return 100.0  # 1 Crore = 100 Lakhs
    return 1.0  # Already in Lakhs (default)


# Stable sheet-tab-name -> canonical scheme name overrides.
# Some AMC files (e.g. Abakkus consolidated disclosure) carry a generic AMC
# banner ("Abakkus Mutual Fund") in the first title row, which the row-scan
# heuristic would otherwise pick instead of the specific scheme name — causing
# multiple schemes in one workbook to collapse to the same name. The sheet tab
# codes are stable across all months, so we anchor on them.
_SHEET_TAB_SCHEME_OVERRIDES = {
    "ABAFC": "Abakkus Flexi Cap Fund",
    "ABASC": "Abakkus Small Cap Fund",
    "ABALI": "Abakkus Liquid Fund",
}

# Prefix overrides for sheet tabs that carry a trailing date (e.g.
# "CMFCF_April 30, 2026", "CMMAAF_May 2026"). Both Capitalmind schemes share the
# "Capitalmind Mutual Fund" banner, so the tab code is the only stable way to
# tell the Flexi Cap fund apart from the Multi Asset Allocation fund — without
# this they would collapse into one scheme.
_SHEET_TAB_PREFIX_OVERRIDES = {
    "CMMAAF": "Capitalmind Multi Asset Allocation Fund",
    "CMFCF": "Capitalmind Flexi Cap Fund",
}


def extract_scheme_name(sheet, header_row: int, column_mapping: dict) -> str:
    """
    Extract the scheme name from a sheet using these strategies:
    0. Stable sheet-tab-name override (for multi-scheme AMC workbooks)
    1. Look for a 'scheme_name' column in the data
    2. Check merged cells / rows above the header for scheme name text
    3. Fall back to sheet tab name
    """
    # Strategy 0: Stable sheet-tab override (exact, then prefix)
    tab = sheet.title.strip().upper()
    if tab in _SHEET_TAB_SCHEME_OVERRIDES:
        return _SHEET_TAB_SCHEME_OVERRIDES[tab]
    for prefix, scheme in _SHEET_TAB_PREFIX_OVERRIDES.items():
        if tab.startswith(prefix):
            return scheme

    # Strategy 1: Check rows above header for scheme name text
    scheme_keywords = ["fund", "scheme", "plan", "growth", "dividend", "direct", "regular", "idcw"]
    for row_idx in range(1, header_row):
        for col_idx in range(1, min(sheet.max_column + 1, 10)):
            cell = sheet.cell(row=row_idx, column=col_idx)
            val = cell.value
            if val and isinstance(val, str) and len(val) > 10:
                val_lower = val.lower()
                if any(kw in val_lower for kw in scheme_keywords):
                    return val.strip()

    # Strategy 2: Check merged cells
    for merged_range in sheet.merged_cells.ranges:
        cell = sheet.cell(row=merged_range.min_row, column=merged_range.min_col)
        val = cell.value
        if val and isinstance(val, str) and len(val) > 10:
            val_lower = val.lower()
            if any(kw in val_lower for kw in scheme_keywords):
                return val.strip()

    # Strategy 3: Fall back to sheet tab name
    return sheet.title


def extract_amc_name(filename: str) -> str:
    """Extract AMC name from filename heuristically."""
    # Remove extension and common suffixes
    name = re.sub(r"\.(xlsx|xls|csv)$", "", filename, flags=re.IGNORECASE)
    # Remove date patterns
    name = re.sub(r"\d{4}[-_]\d{2}[-_]\d{2}", "", name)
    name = re.sub(r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-_]?\d{2,4}", "", name, flags=re.IGNORECASE)
    # Clean up
    name = re.sub(r"[-_]+", " ", name).strip()
    # Take first meaningful word(s)
    parts = name.split()
    if parts:
        return " ".join(parts[:3])
    return "Unknown AMC"
