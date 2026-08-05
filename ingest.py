"""
CLFS Fee Schedule Ingestion Script
===================================
Reads the three CMS source files from extracted-zips/ and writes
a merged data/clfs.json for use by the static front-end.

Re-run this script whenever you download updated CMS ZIPs.

Usage:
    python ingest.py

Output:
    data/clfs.json
"""

import csv
import json
import os
import re
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).parent
EXTRACTED = ROOT / "extracted-zips"
OUT_DIR = ROOT / "data"
OUT_FILE = OUT_DIR / "clfs.json"

FEE_SCHEDULE_CSV = EXTRACTED / "PUF_CLFS_CY2026_Q3V1.csv"
WORKING_HCPCS_TXT = EXTRACTED / "Section 508 compliant - Working_HCPCS_list_for_PAMA 2-23 update.txt"
ADLT_DELETIONS_TXT = EXTRACTED / "Section 508 compliant - Working_HCPCS_list_for_PAMA 2-23 update - Addtions-Deletions.txt"
PRIVATE_PAYER_CSV = (
    EXTRACTED
    / "Medicare Clinical Laboratory Fee Schedule Private Payer Rates and Volumes"
    / "2018"
    / "CLFS Applicable Information 2018 Raw Data File-updated 12152021.csv"
)


# ---------------------------------------------------------------------------
# Step 1: Load CY2026 fee schedule (skip 4 header comment lines)
# ---------------------------------------------------------------------------
def load_fee_schedule(path: Path) -> dict[str, dict]:
    """Returns dict keyed by (hcpcs, modifier) with rate info."""
    records: dict[str, dict] = {}
    with open(path, newline="", encoding="utf-8") as f:
        # Skip the 4 preamble lines before the real CSV header
        for _ in range(4):
            next(f)
        reader = csv.DictReader(f)
        for row in reader:
            hcpcs = row["HCPCS"].strip()
            modifier = row["MOD"].strip()
            key = hcpcs  # primary key is HCPCS; we store modifier separately
            rate_str = row["RATE"].strip()
            try:
                rate = float(rate_str)
            except ValueError:
                rate = None

            # If code already seen (e.g. QW variant), prefer the base entry
            # but record if a QW variant exists.
            if key not in records:
                records[key] = {
                    "hcpcs": hcpcs,
                    "modifier": modifier,
                    "year": row["YEAR"].strip(),
                    "eff_date": row["EFF_DATE"].strip(),
                    "indicator": row["INDICATOR"].strip(),
                    "rate_2026": rate,
                    "short_desc": row.get("SHORTDESC", "").strip(),
                    "long_desc": row.get("LONGDESC", "").strip(),
                    "extended_desc": row.get("EXTENDEDLONGDESC", "").strip(),
                    "has_qw_variant": modifier == "QW",
                }
            else:
                # Mark that a QW variant exists
                if modifier == "QW":
                    records[key]["has_qw_variant"] = True

    print(f"  Fee schedule: {len(records):,} unique HCPCS codes loaded")
    return records


# ---------------------------------------------------------------------------
# Step 2: Load working HCPCS list (PAMA scope + richer descriptions)
# ---------------------------------------------------------------------------
def load_working_hcpcs(path: Path) -> dict[str, dict]:
    """Returns dict keyed by HCPCS with description tiers and PAMA scope flag."""
    scope: dict[str, dict] = {}
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        # First 3 lines are title/blank; line 4 is the tab-delimited header
        for _ in range(3):
            next(f)
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            hcpcs = row.get("HCPCS", "").strip()
            if not hcpcs:
                continue
            scope[hcpcs] = {
                "pama_short_desc": row.get("SHORTDESC", "").strip(),
                "pama_long_desc": row.get("LONGDESC", "").strip(),
                "pama_extended_desc": row.get("EXTENDED LONGDESC", "").strip(),
            }
    print(f"  Working HCPCS list: {len(scope):,} codes in PAMA scope")
    return scope


# ---------------------------------------------------------------------------
# Step 3: Load ADLT deletions (codes excluded from PAMA rebasing)
# ---------------------------------------------------------------------------
def load_adlt_codes(path: Path) -> set[str]:
    """Returns set of HCPCS codes flagged as ADLTs (excluded from PAMA)."""
    adlt: set[str] = set()
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            # Lines look like:  0537U\t"Oncology..."  or just a code
            parts = line.split("\t")
            code = parts[0].strip().rstrip()
            # Filter out header/description lines
            if re.match(r"^[0-9A-Z]{4,5}$", code.replace(" ", "")):
                adlt.add(code.replace(" ", ""))
    print(f"  ADLT exclusion list: {len(adlt)} codes flagged")
    return adlt


# ---------------------------------------------------------------------------
# Step 4: Load private payer rates and compute weighted median per HCPCS
# ---------------------------------------------------------------------------
def load_private_payer(path: Path) -> dict[str, dict]:
    """
    Reads 967K-row CSV and computes weighted median PRICE_AMT per hcpcs_cd.

    Weighted median: sort by PRICE_AMT, find the rate at the 50th percentile
    of cumulative volume.
    """
    # Accumulate: hcpcs -> list of (price, volume) tuples
    raw: dict[str, list[tuple[float, float]]] = {}

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            hcpcs = row["hcpcs_cd"].strip()
            try:
                price = float(row["PRICE_AMT"].strip())
                vol = float(row["VOL_TXT"].strip())
            except ValueError:
                continue
            if hcpcs not in raw:
                raw[hcpcs] = []
            raw[hcpcs].append((price, vol))

    # Compute weighted median per code
    payer: dict[str, dict] = {}
    for hcpcs, pairs in raw.items():
        pairs.sort(key=lambda x: x[0])
        total_vol = sum(v for _, v in pairs)
        target = total_vol / 2.0
        cumulative = 0.0
        median_price = None
        for price, vol in pairs:
            cumulative += vol
            if cumulative >= target:
                median_price = price
                break

        payer[hcpcs] = {
            "payer_weighted_median": round(median_price, 2) if median_price is not None else None,
            "payer_total_volume": int(total_vol),
            "payer_rate_count": len(pairs),
            "payer_data_year": 2018,
        }

    print(f"  Private payer data: {len(raw):,} unique codes with rate data")
    return payer


# ---------------------------------------------------------------------------
# Step 5: Merge and write JSON
# ---------------------------------------------------------------------------
def build_json(
    fee_schedule: dict[str, dict],
    pama_scope: dict[str, dict],
    adlt_codes: set[str],
    payer_data: dict[str, dict],
) -> list[dict]:
    records = []
    for hcpcs, fs in fee_schedule.items():
        in_scope = hcpcs in pama_scope
        scope = pama_scope.get(hcpcs, {})
        payer = payer_data.get(hcpcs)

        # Use PAMA descriptions where available (richer), fall back to fee schedule
        record = {
            "hcpcs": hcpcs,
            "modifier": fs["modifier"],
            "has_qw_variant": fs["has_qw_variant"],
            "year": fs["year"],
            "eff_date": fs["eff_date"],
            "indicator": fs["indicator"],
            "rate_2026": fs["rate_2026"],
            "short_desc": scope.get("pama_short_desc") or fs["short_desc"],
            "long_desc": scope.get("pama_long_desc") or fs["long_desc"],
            "extended_desc": scope.get("pama_extended_desc") or fs["extended_desc"],
            "in_pama_scope": in_scope,
            "is_adlt": hcpcs in adlt_codes,
            "is_clia_waived": fs["has_qw_variant"],
            "is_locally_priced": fs["indicator"] == "L",
            "payer_data": payer,  # None if no private payer data reported
        }
        records.append(record)

    # Sort by HCPCS code
    records.sort(key=lambda r: r["hcpcs"])
    return records


def main():
    print("CLFS Ingestion Script")
    print("=" * 40)

    print("\nLoading fee schedule...")
    fee_schedule = load_fee_schedule(FEE_SCHEDULE_CSV)

    print("Loading working HCPCS list...")
    pama_scope = load_working_hcpcs(WORKING_HCPCS_TXT)

    print("Loading ADLT exclusion list...")
    adlt_codes = load_adlt_codes(ADLT_DELETIONS_TXT)

    print("Loading private payer rates (this may take a moment)...")
    payer_data = load_private_payer(PRIVATE_PAYER_CSV)

    print("\nMerging records...")
    records = build_json(fee_schedule, pama_scope, adlt_codes, payer_data)

    OUT_DIR.mkdir(exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = OUT_FILE.stat().st_size / 1024
    print(f"\nDone. Wrote {len(records):,} records to {OUT_FILE} ({size_kb:.0f} KB)")
    print("\nSample record:")
    print(json.dumps(records[0], indent=2))


if __name__ == "__main__":
    main()
