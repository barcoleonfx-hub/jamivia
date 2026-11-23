# Jamivia

Website, waitlist, orders and admin dashboard for Jamivia Restore, a daily gut formula.

| Path | What it is |
|---|---|
| `index.html`, `img/` | The website (single page, no build step) |
| `server/` | Node backend: waitlist, analytics, Stripe checkout, email sequences, `/admin` dashboard |
| `emails/` | 10 email templates, built by `tools/emails/build.py`, gallery at `/emails/` |
| `render.yaml` | One-click hosting on Render, same setup as Preston Hill |
| `NOTES.md` | Decisions, formula figures (spec JMV02), claims rules, open items |
| `PROMPTS.md` | AI image prompt pack |

## Run locally
```
npm install
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=choose-one npm run dev
```
Open http://localhost:3000. The admin is at http://localhost:3000/admin.
Without SMTP settings, emails are saved to `data/outbox/` instead of being sent.

## Host it
Render → New → Blueprint → this repository. Fill in the values it asks for (admin email/password, site URL; SMTP and Stripe can wait).
GitHub Pages keeps serving a static preview: its forms run in preview mode and save nothing.
