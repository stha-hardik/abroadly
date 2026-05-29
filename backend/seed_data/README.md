# Seed data — global knowledge for the eval-layer / RAG

Plain `.md`, `.txt`, or `.pdf` files in this directory get ingested into ChromaDB under `kind=global` metadata when you run:

```bash
cd backend
./venv/bin/python scripts/seed_knowledge.py
```

Country folders are preferred:

```bash
cd backend
./venv/bin/python scripts/seed_knowledge.py --country australia --dry-run
./venv/bin/python scripts/seed_knowledge.py --reset --country australia
```

The script chunks markdown at heading boundaries, embeds with Gemini, and upserts into the `abroadly_knowledge` collection. Chunk IDs are deterministic, so re-running the same corpus upserts in place. Use `--reset --country <country>` when replacing old content.

## Authoring guidelines

- One topic per file — easier to debug retrieval results.
- Plain prose works best (the chunker splits on whitespace). Headings and bullets are fine; they're tokenised as normal text.
- Be specific (numbers, dates, country names, university names). The eval layer's grounding check measures token overlap between query and retrieved chunks — vague platitudes get refused as `LOW_CONFIDENCE`.
- Include the obvious search terms students will type: "IELTS score for Canada", "scholarship eligibility", "visa requirements after Class 12".
- Cite sources at the bottom of the file if drawn from official material — useful for auditing.

## Current files

- `australia/` — Australia admissions, documents, finances, Student visa subclass 500, GS, 485, work rights, scholarships, timeline, and FAQ for Nepali students
- `uk/` — structured UK corpus for Nepali students
- `uk-study-after-12.txt` — undergrad pathways, UCAS process, costs, Graduate Route visa for Nepali Class 12 graduates

## What to add next

Knowledge-base expansions to consider next:

1. Canada after Class 12
2. United States after Class 12
3. Germany after Class 12 (cheap option Nepali students often miss)
4. IELTS/TOEFL/PTE comparison and prep strategy
5. Scholarship database (Erasmus+, MEXT, Australia Awards, Chevening Master's, etc.)
6. Document attestation flow at MoE Nepal
7. Bank loan vs self-funding for study abroad (Nepalese banks: NIC Asia, Nabil, etc.)
8. Common Statement of Purpose mistakes
