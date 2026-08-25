# I.F.E.S. Electrical Services — records site

Served by GitHub Pages.

| Path | What |
|---|---|
| `/` | landing page with a link to each |
| `/app/` | the electricians' records app |
| `/dashboard/` | the office / client dashboard |

Both require a sign-in. Names, PINs and roles live in the **Techs** tab of the
Google Sheet behind it — not in these files.

Built from the sources in the parent folder with `node build-deploy.js`.
Do not edit the files here by hand; they are overwritten on the next build.
