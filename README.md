# Mahjong League Starter Site

A static GitHub Pages website connected to Supabase for:

- a net-chip leaderboard;
- player-submitted match results;
- administrator approval or rejection;
- four chip types (white 1, red 5, blue 10, green 25);
- a modifiable default allocation (initially five of each);
- settlement calculations and leaderboard resets;
- approved match and reset history;
- rules and scoring reference pages.

## Part 1 — Create the Supabase database

1. Create a project at Supabase.
2. Open **SQL Editor**.
3. Choose **New query**.
4. Open `supabase/setup.sql` from this folder, copy the entire file, paste it into the SQL editor, and click **Run**.
5. In the Supabase dashboard, open **Project Settings / API** or the project's **Connect** dialog.
6. Copy the **Project URL** and the **publishable key**.
7. Open `js/config.js` and paste those two values. You may also change `leagueName`.

The publishable key may be used in a browser. Never put a Supabase secret key or service-role key in this repository.

## Part 2 — Create the first administrator

1. Open `admin.html` through your published website (or locally after configuration).
2. Enter your email and a password, then click **Create first account**.
3. Confirm the email if Supabase asks you to.
4. In Supabase, open **SQL Editor**, create a query, and run this after replacing the email:

```sql
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'YOUR_EMAIL@example.com');
```

5. Return to the Admin page and sign in.
6. Add all league players.

Do not run the promotion command for ordinary players.

## Part 3 — Publish on GitHub Pages

1. Create a GitHub repository named `mahjong-league`.
2. Upload every file and folder from this starter package to the repository root.
3. Open the repository's **Settings**.
4. Select **Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch **main** and folder **/(root)**, then save.
7. GitHub will show the published address, normally:

```text
https://YOUR-GITHUB-USERNAME.github.io/mahjong-league/
```

## Normal league workflow

1. A player opens **Submit Result** and enters their own result.
2. The result remains pending.
3. An administrator opens **Admin** and approves, edits, or rejects it.
4. Approved results change the leaderboard.
5. Before a reset, the administrator clears every pending result.
6. Open **Reset**, verify balances total zero, review suggested payments, and finalize.
7. The settlement is saved to History and the current leaderboard returns to zero.

## Important accounting rule

For a complete match, the net changes submitted by all players should add to zero. If the Reset page reports a non-zero total, a player result is probably missing or incorrect.

## Editing the site later

- League name and Supabase connection: `js/config.js`
- Page appearance: `css/styles.css`
- Database permissions and tables: `supabase/setup.sql`
- Public pages: the `.html` files in the repository root
- Rule and scoring reference files: `assets/`

## Local preview

Opening `index.html` directly may work, but authentication behaves more reliably through a local web server. With Python installed, run this in the project folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.


## Rules and scoring pages

- `rules.html` contains a quick rules summary and the supplied overview diagram.
- `scoring.html` contains the fan-to-points table, worked payment examples, and the supplied two-page scoring cheat sheet.
- Keep the `assets/` folder when uploading to GitHub. The Rules and Scoring pages depend on these images and the reference PDF.
- The supplied scoring sheet uses “discarder pays all.” Confirm your league's minimum fan, dealer rules, maximum fan, and permitted special hands before relying on it.
