# Seed data — global knowledge for the eval-layer / RAG

Plain `.txt` (or `.pdf`) files in this directory get ingested into ChromaDB under `kind=global` metadata when you run:

```bash
cd backend
./venv/bin/python scripts/seed_knowledge.py
```

The script chunks each file (~300 words per chunk, ~40-word overlap), embeds with Gemini, and upserts into the `abroadly_knowledge` collection. Re-running the script re-upserts with fresh UUIDs (it doesn't dedupe yet — TODO).

## Authoring guidelines

- One topic per file — easier to debug retrieval results.
- Plain prose works best (the chunker splits on whitespace). Headings and bullets are fine; they're tokenised as normal text.
- Be specific (numbers, dates, country names, university names). The eval layer's grounding check measures token overlap between query and retrieved chunks — vague platitudes get refused as `LOW_CONFIDENCE`.
- Include the obvious search terms students will type: "IELTS score for Canada", "scholarship eligibility", "visa requirements after Class 12".
- Cite sources at the bottom of the file if drawn from official material — useful for auditing.

## Current files

- `australia-study-after-12.txt` — undergrad pathways, costs, visa, work rights for Nepali Class 12 graduates
- `uk-study-after-12.txt` — undergrad pathways, UCAS process, costs, Graduate Route visa for Nepali Class 12 graduates

## What to add next

Tier 0 expansions for the knowledge base (in priority order):

1. Canada after Class 12
2. United States after Class 12
3. Germany after Class 12 (cheap option Nepali students often miss)
4. IELTS/TOEFL/PTE comparison and prep strategy
5. Scholarship database (Erasmus+, MEXT, Australia Awards, Chevening Master's, etc.)
6. Document attestation flow at MoE Nepal
7. Bank loan vs self-funding for study abroad (Nepalese banks: NIC Asia, Nabil, etc.)
8. Common Statement of Purpose mistakes
