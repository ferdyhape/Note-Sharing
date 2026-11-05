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

Open the URL printed by Next.js (usually [http://localhost:3000](http://localhost:3000)). Keep one Next dev server per working tree: dev and production builds share `.next`, so running `next build` while the dev server is open can leave its routes stale. Stop the old dev process from its own terminal with Ctrl+C, then start `npm run dev` again.

## Local testing

1. Copy `.env.example` to `.env` and set the local Neon, Auth.js, and Upstash values. For Push, all three are required: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`. Set a private `CRON_SECRET` too if testing the due scan. Never commit `.env` or print secret values.
2. Run `npm install`, then `npm run dev`; use the URL it prints. The browser must use `localhost` or HTTPS for Service Worker and Web Push support.
3. Register/sign in, open Settings → Browser notifications → Enable this browser, and allow the browser permission prompt. Create a test Note and Reminder with a trigger in the past, then invoke the protected scanner:

   ```bash
   node -e "require('dotenv').config(); fetch('http://localhost:3000/api/cron/reminders',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(async r=>console.log(JSON.stringify({status:r.status,...await r.json()})))"
   ```

   Change `3000` to the port Next.js printed. The command uses the secret in memory and prints only the response. A successful scan creates an in-app notification; Push additionally requires permission and a registered browser device.

4. Open Reminders to verify in-app notifications. In Settings, verify the browser appears under Registered devices; Revoke removes it. If permission was denied, reset Notifications for localhost in the browser's site settings before trying again.

The Note editor is TipTap with StarterKit rich-text formatting and autosave. On a Note, expand **Note tools** for Properties, Schedule, Reminders, Sharing, export, and the Owner-only Delete Note action. Delete is a soft delete that removes the Note from the active workspace. Sharing currently grants access only to already registered Notula accounts; it does not send an email invitation to an unregistered address.
