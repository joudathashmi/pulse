#!/usr/bin/env python3
"""Regenerate public/data/inventory.json from the Ministry's master data sheet.

Usage:  python3 tools/extract_inventory.py "/path/to/20250908_Data indicators.xlsx"

Reads the 'Master data sheet' tab, header on row 8, and emits one record per metric.
Field names are shortened for transport; see docs/ARCHITECTURE.md for the mapping.
"""
import json, sys, pathlib
import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else "20250908_Data indicators.xlsx"
OUT = pathlib.Path(__file__).resolve().parents[1] / "public" / "data" / "inventory.json"

HEADER_ROW = 7  # zero-indexed
FIELDS = {
    "c":  "Category",
    "s":  "Sub-Category (use case)",
    "m":  "Data Metric",
    "o":  "Responsible Entity (Owner Internal/External)",
    "a":  "Data availability",
    "f":  "Frequency available",
    "w":  "Whitespace area",
    "q":  "Quality challenges",
    "sh": "Sharing mechanism",
}

def norm(v):
    return "" if v in (None, "None") else str(v).strip()

def main():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    rows = list(wb["Master data sheet"].iter_rows(values_only=True))
    header = [norm(c) for c in rows[HEADER_ROW]]
    idx = {k: header.index(v) for k, v in FIELDS.items() if v in header}
    out = []
    for r in rows[HEADER_ROW + 1:]:
        if not r[idx["m"]]:
            continue
        rec = {k: norm(r[i]).replace("\n", " ") for k, i in idx.items()}
        rec["a"] = rec["a"].title()
        rec["w"] = rec["w"] or "None"
        rec["m"] = rec["m"][:120]
        rec["o"] = rec["o"][:90]
        rec["q"] = rec["q"][:110]
        out.append(rec)
    OUT.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    gaps = {}
    for r in out:
        gaps[r["w"]] = gaps.get(r["w"], 0) + 1
    print(f"wrote {len(out)} metrics → {OUT}")
    for k, v in sorted(gaps.items(), key=lambda x: -x[1]):
        print(f"  {v:4d}  {k}")

if __name__ == "__main__":
    main()
