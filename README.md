# Notula

Personal note-taking workspace with flexible scheduling, reminders, dynamic properties, sharing and export. Private project.

## Documentation

Start here, in order:

1. [`docs/md/01_PRD.md`](docs/md/01_PRD.md) — what the product does, and why.
2. [`docs/md/02_Product_Architecture.md`](docs/md/02_Product_Architecture.md) — module boundaries.
3. [`docs/md/03_Technical_Architecture.md`](docs/md/03_Technical_Architecture.md) — stack and system design.
4. [`docs/md/04_Data_Model_and_ERD.md`](docs/md/04_Data_Model_and_ERD.md) — entities and relationships.
5. [`docs/md/05_UX_Interaction_Specification.md`](docs/md/05_UX_Interaction_Specification.md) — screens and interaction rules.
6. [`docs/md/06_Development_Roadmap.md`](docs/md/06_Development_Roadmap.md) — phases and acceptance criteria.
7. [`docs/CODING_STANDARDS.md`](docs/CODING_STANDARDS.md) — how code here is written and structured.
8. [`docs/adr/`](docs/adr/README.md) — why each significant decision was made.
9. [`docs/CHECKLIST.md`](docs/CHECKLIST.md) — current build task list.
10. [`docs/WORKLOG.md`](docs/WORKLOG.md) — dated log of work done.

## Stack

Next.js (TypeScript) · Prisma · PostgreSQL (Neon) · Redis/cron (Upstash) · Vercel. See [ADR-0007](docs/adr/0007-technology-stack.md).

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
