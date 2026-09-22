"""
Regression tests for the MF portfolio pipeline.

Run:  python backend/test_regression.py
Exits non-zero if any check fails, so it can gate the refresh pipeline.

These lock in every bug class we have hit so far:
  * a held fund silently vanishing because a disclosure retitled its sheet
    (generic "<AMC> Mutual Fund" banner hijacking the scheme name)
  * two schemes in one workbook collapsing into a single name
  * section-class leaks (REIT / Treasury Bills bleeding onto later rows)
  * supplementary tables after GRAND TOTAL inflating weights past 100%
  * corporate renames (same ISIN) showing as phantom Exit + New
"""

import sys
from collections import defaultdict
from pathlib import Path

from parse_disclosures import parse_file
import generate_multi_period as g

# Filename fragments that identify each held fund's disclosure file. Used to
# tell "disclosure not published yet" apart from "file present but fund dropped".
FUND_FILE_PATTERNS = {
    "Zerodha Nifty LargeMidcap 250 Index Fund": ("zn250",),
    "Abakkus Flexi Cap Fund": ("abakkus", "abk_mf", "in_mf_monthly", "monthly_portfolio_jun", "final_monthly_portfolio", "portfolio_aug"),
    "Axis Nifty Smallcap 50 Index Fund": ("axis",),
    "Capitalmind Flexi Cap Fund": ("cmflexi",),
    "HDFC Nifty 100 Equal Weight Index Fund": ("equal weight",),
    "Capitalmind Multi Asset Allocation Fund": ("cmmaaf",),
}

FAILURES = []
PASSES = []


def check(name, condition, detail=""):
    if condition:
        PASSES.append(name)
        print(f"  PASS  {name}")
    else:
        FAILURES.append(f"{name}: {detail}")
        print(f"  FAIL  {name}  -- {detail}")


def main():
    periods = g.discover_periods()
    print(f"Discovered {len(periods)} periods: {[p['period_label'] for p in periods]}\n")

    # Parse every period once, keeping both raw and held-only holdings
    raw_by_period = {}
    held_by_period = {}
    for p in periods:
        raw, held = [], []
        for fp in p["files"]:
            try:
                hs = parse_file(fp)
            except Exception as e:
                FAILURES.append(f"parse error {fp.name}: {e}")
                continue
            raw.extend(hs)
            held.extend([h for h in hs if h["scheme_name"] in g.HELD_FUNDS])
        raw_by_period[p["period_key"]] = raw
        held_by_period[p["period_key"]] = held

    # ---- 1. Fund coverage: no held fund may vanish once it has appeared ----
    # A fund missing because its disclosure is not published yet is expected and
    # only warned about. A fund missing while its file sits in the folder is the
    # real bug (scheme name stopped matching HELD_FUNDS) and fails the suite.
    print("[1] Fund coverage across periods")
    seen_before = set()
    warnings = []
    for p in periods:
        present = {h["scheme_name"] for h in held_by_period[p["period_key"]]}
        names = [fp.name.lower() for fp in p["files"]]
        for fund in sorted(seen_before - present):
            pats = FUND_FILE_PATTERNS.get(fund, ())
            file_exists = any(any(pat in n for pat in pats) for n in names)
            if file_exists:
                check(
                    f"{p['period_label']}: '{fund[:30]}' present (file exists)",
                    False,
                    "file is in the folder but the fund was dropped - scheme name "
                    "likely stopped matching HELD_FUNDS",
                )
            else:
                warnings.append(f"{p['period_label']}: {fund} - disclosure not published yet")
        seen_before |= present
    for w in warnings:
        print(f"  WARN  {w}")

    # ---- 2. Every disclosure file must yield at least one held fund ----
    # Guards the "scheme renamed -> filtered out silently" failure mode.
    print("\n[2] Every file maps to a held fund")
    KNOWN_NON_HELD = ("samco", "mcf", "hdfc nifty 100 index", "kotak")
    for p in periods:
        for fp in p["files"]:
            try:
                hs = parse_file(fp)
            except Exception:
                continue
            schemes = {h["scheme_name"] for h in hs}
            held = schemes & g.HELD_FUNDS
            if not held and not any(k in fp.name.lower() for k in KNOWN_NON_HELD):
                check(
                    f"{p['period_label']}/{fp.name[:38]} maps to a held fund",
                    False,
                    f"parsed as {sorted(schemes)}",
                )

    # ---- 3. Per-fund weights must sum to ~100% ----
    print("\n[3] Per-fund weight sums ~100%")
    for p in periods:
        sums = defaultdict(float)
        for h in held_by_period[p["period_key"]]:
            sums[h["scheme_name"]] += h["pct_of_net_assets"]
        for fund, s in sorted(sums.items()):
            check(
                f"{p['period_label']}/{fund[:34]} sums to 100%",
                97.0 <= s <= 103.0,
                f"sum={s:.2f}%",
            )

    # ---- 4. Asset-class sanity: no REIT tag on equity-industry rows ----
    print("\n[4] Asset-class purity (no REIT/T-Bill leak)")
    REALTY = ("realty", "reit", "invit", "real estate")
    leaks = []
    for p in periods:
        for h in held_by_period[p["period_key"]]:
            sec = (h["sector"] or "").lower()
            nm = h["raw_name"].lower()
            if h["asset_class"] == "REIT" and not any(x in sec for x in REALTY) \
                    and not any(x in nm for x in ("reit", "invit")):
                leaks.append(f"{p['period_label']} {h['scheme_name'][:18]} {h['raw_name'][:26]}")
            if h["asset_class"] == "Treasury Bills" and any(
                x in nm for x in ("gold", "silver", "etf")
            ):
                leaks.append(f"{p['period_label']} T-Bill leak: {h['raw_name'][:30]}")
    check("no REIT/T-Bill classification leaks", not leaks, f"{len(leaks)} leaks: {leaks[:4]}")

    # ---- 5. Two schemes in one workbook must not collapse ----
    print("\n[5] Multi-scheme workbooks stay distinct")
    for p in periods:
        by_file = defaultdict(set)
        for fp in p["files"]:
            try:
                hs = parse_file(fp)
            except Exception:
                continue
            for h in hs:
                by_file[fp.name].add(h["scheme_name"])
        for fname, schemes in by_file.items():
            low = fname.lower()
            if "cmmaaf" in low:
                check(
                    f"{p['period_label']}/CMMAAF is Multi Asset (not Flexi Cap)",
                    "Capitalmind Multi Asset Allocation Fund" in schemes,
                    f"got {sorted(schemes)}",
                )
            if "cmflexi" in low:
                check(
                    f"{p['period_label']}/CMFLEXI is Flexi Cap",
                    "Capitalmind Flexi Cap Fund" in schemes,
                    f"got {sorted(schemes)}",
                )

    # ---- 6. No duplicate (name, asset_class) within a fund-period ----
    print("\n[6] No duplicate holdings within a fund")
    dups = []
    for p in periods:
        per = defaultdict(lambda: defaultdict(int))
        for h in held_by_period[p["period_key"]]:
            per[h["scheme_name"]][(h["name"].lower(), h["asset_class"])] += 1
        for fund, d in per.items():
            for k, c in d.items():
                if c > 1:
                    dups.append(f"{p['period_label']} {fund[:20]} {k[0][:22]} x{c}")
    check("no duplicate holdings", not dups, f"{len(dups)}: {dups[:4]}")

    # ---- 7. Comparison integrity: renames must not create Exit+New pairs ----
    print("\n[7] Comparison integrity (ISIN matching)")
    import json
    out = g.DATA_DIR / "consolidated.json"
    if out.exists():
        d = json.loads(out.read_text(encoding="utf-8"))
        for ckey, comp in d.get("comparisons", {}).items():
            for fund, fc in comp["funds"].items():
                isins = [s["isin"] for s in fc["stocks"] if s.get("isin")]
                dup_isins = {i for i in isins if isins.count(i) > 1}
                check(
                    f"{ckey}/{fund[:28]} no duplicate-ISIN rows",
                    not dup_isins,
                    f"{sorted(dup_isins)[:3]}",
                )
    else:
        print("  (skipped: consolidated.json not generated yet)")

    # ---- Summary ----
    print("\n" + "=" * 70)
    print(f"RESULT: {len(PASSES)} passed, {len(FAILURES)} failed")
    if FAILURES:
        print("\nFAILURES:")
        for f in FAILURES:
            print(f"  - {f}")
        return 1
    print("All regression checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
