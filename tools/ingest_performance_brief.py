#!/usr/bin/env python3
"""Ingest the Ministry organisational performance brief into Pulse data.

Source of truth for Wave 1 automation of the fortnightly pack:
  مستوى تقدم الأداء للوحدات التنظيمية (July 2026 · Meeting 5)

Usage:
  python3 tools/ingest_performance_brief.py
  python3 tools/ingest_performance_brief.py "/path/to/تقدم الوزارة في الأداء.pdf"

What it does:
  1. Loads curated public/data/brief.json (transcribed from the pack).
  2. If a PDF path is given, extracts text for audit and records the file name
     (Arabic PDF text is OCR-noisy - structured fields stay curated until
     connectors replace this pack).
  3. Syncs public/data/series.json cur.fdi / cur.gfcf from brief headlines
     (Pulse live values).
  4. Writes public/data/brief.meta.json with ingest stamp.

Later platform step: replace brief.json with API connectors (GASTAT, SAMA, …).
Views already load via js/data/index.js - no UI change needed.
"""
from __future__ import annotations

import json
import pathlib
import sys
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
BRIEF_PATH = DATA / "brief.json"
SERIES_PATH = DATA / "series.json"
META_PATH = DATA / "brief.meta.json"


def load_json(path: pathlib.Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def save_json(path: pathlib.Path, obj):
    with path.open("w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def extract_pdf_text(pdf: pathlib.Path) -> str:
    """Best-effort text extract for audit; not used as primary parser yet."""
    try:
        from pypdf import PdfReader  # type: ignore
        reader = PdfReader(str(pdf))
        return "\n".join((p.extract_text() or "") for p in reader.pages)
    except Exception:
        pass
    # macOS / poppler
    import subprocess
    try:
        out = subprocess.check_output(
            ["pdftotext", "-layout", str(pdf), "-"],
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return out
    except Exception as e:
        print(f"warn: could not extract PDF text ({e}); using curated brief.json only")
        return ""


def sync_series(brief: dict):
    series = load_json(SERIES_PATH)
    fdi = brief["headlines"]["fdi"]["pulseValue"]
    gfcf = brief["headlines"]["gfcf"]["pulseValue"]
    series["cur"] = {
        "p": "2026 Q1",
        "y": 2026,
        "q": 1,
        "fdi": fdi,
        "gfcf": gfcf,
    }
    save_json(SERIES_PATH, series)
    return series["cur"]


def validate(brief: dict):
    assert "headlines" in brief and "signals" in brief
    assert set(brief["headlines"]) >= {"fdi", "gfcf"}
    n = len(brief["signals"])
    if n != 20:
        print(f"warn: expected 20 leading signals (plan slide 21), found {n}")
    for h in ("fdi", "gfcf"):
        assert "pulseValue" in brief["headlines"][h]
        assert "yearTarget" in brief["headlines"][h]


def main():
    pdf = pathlib.Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else None
    if not BRIEF_PATH.exists():
        sys.exit(f"missing curated brief: {BRIEF_PATH}")

    brief = load_json(BRIEF_PATH)
    validate(brief)

    meta = {
        "ingestedAt": datetime.now(timezone.utc).isoformat(),
        "briefPath": str(BRIEF_PATH.relative_to(ROOT)),
        "pdf": None,
        "pdfChars": 0,
        "signalCount": len(brief["signals"]),
        "headlines": {
            "fdi": brief["headlines"]["fdi"]["pulseValue"],
            "gfcf": brief["headlines"]["gfcf"]["pulseValue"],
        },
    }

    if pdf:
        if not pdf.exists():
            sys.exit(f"PDF not found: {pdf}")
        text = extract_pdf_text(pdf)
        meta["pdf"] = str(pdf)
        meta["pdfChars"] = len(text)
        brief["source"]["file"] = pdf.name
        brief["source"]["ingestedAt"] = meta["ingestedAt"][:10]
        save_json(BRIEF_PATH, brief)
        # Keep a text audit next to data for humans / future parsers
        audit = DATA / "brief.pdf.txt"
        audit.write_text(text or "(no extractable text)", encoding="utf-8")
        print(f"audited PDF text → {audit.relative_to(ROOT)} ({meta['pdfChars']} chars)")

    cur = sync_series(brief)
    save_json(META_PATH, meta)

    print("ingested organisational performance brief")
    print(f"  FDI pulse  {cur['fdi']}  (net Q1 from pack)")
    print(f"  GFCF pulse {cur['gfcf']}  (EA Q1 forecast from pack)")
    print(f"  signals    {meta['signalCount']}")
    print(f"  meta       {META_PATH.relative_to(ROOT)}")
    print("Pulse loads this via public/data/brief.json - refresh the browser.")


if __name__ == "__main__":
    main()
