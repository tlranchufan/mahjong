:root {
  --bg: #f7f4ed;
  --card: #ffffff;
  --ink: #1f2933;
  --muted: #667085;
  --brand: #176b4d;
  --brand-dark: #0f5139;
  --border: #ddd8ce;
  --danger: #b42318;
  --warning: #a15c00;
  --success: #147a4b;
  --shadow: 0 10px 28px rgba(31, 41, 51, 0.08);
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--ink);
  background: var(--bg);
}
header {
  background: var(--brand-dark);
  color: white;
  padding: 1rem;
}
.header-inner {
  max-width: 1050px;
  margin: 0 auto;
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.brand { font-weight: 800; letter-spacing: .01em; font-size: 1.15rem; }
nav { display: flex; gap: .4rem; flex-wrap: wrap; }
nav a {
  color: white;
  text-decoration: none;
  padding: .45rem .7rem;
  border-radius: .45rem;
}
nav a:hover, nav a.active { background: rgba(255,255,255,.16); }
main { max-width: 1050px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
h1 { margin: .25rem 0 .5rem; }
h2 { margin-top: 0; }
p.lead { color: var(--muted); margin-top: 0; }
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: .8rem;
  padding: 1rem;
  margin: 1rem 0;
  box-shadow: var(--shadow);
}
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; }
label { display: block; font-weight: 700; margin-bottom: .25rem; }
input, select, textarea, button {
  font: inherit;
}
input, select, textarea {
  width: 100%;
  padding: .68rem .72rem;
  border: 1px solid #bbb5aa;
  border-radius: .5rem;
  background: white;
}
textarea { min-height: 90px; resize: vertical; }
button, .button {
  display: inline-block;
  border: 0;
  border-radius: .5rem;
  padding: .68rem .9rem;
  background: var(--brand);
  color: white;
  font-weight: 750;
  cursor: pointer;
  text-decoration: none;
}
button:hover, .button:hover { background: var(--brand-dark); }
button.secondary { background: #475467; }
button.danger { background: var(--danger); }
button.warning { background: var(--warning); }
button.small { padding: .42rem .58rem; font-size: .9rem; }
.actions { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; margin-top: 1rem; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: .72rem .55rem; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
th { color: #475467; font-size: .88rem; text-transform: uppercase; letter-spacing: .03em; }
.right { text-align: right; }
.center { text-align: center; }
.positive { color: var(--success); font-weight: 800; }
.negative { color: var(--danger); font-weight: 800; }
.zero { color: var(--muted); font-weight: 700; }
.notice, .error, .success {
  padding: .8rem 1rem;
  border-radius: .55rem;
  margin: .8rem 0;
}
.notice { background: #fff7df; border: 1px solid #eed38a; }
.error { background: #fff0ef; border: 1px solid #f0a8a1; color: #821b12; }
.success { background: #eaf8f0; border: 1px solid #9bd5b6; color: #0e5d39; }
.hidden { display: none !important; }
.stat {
  background: #f4f7f5;
  border-radius: .65rem;
  padding: .8rem;
  text-align: center;
}
.stat strong { display: block; font-size: 1.35rem; }
.muted { color: var(--muted); }
.chip-white { border-left: 6px solid #d6d6d6; }
.chip-red { border-left: 6px solid #d92d20; }
.chip-blue { border-left: 6px solid #1570ef; }
.chip-green { border-left: 6px solid #039855; }
footer { max-width: 1050px; margin: 0 auto; padding: 1rem; color: var(--muted); font-size: .9rem; }
@media (max-width: 720px) {
  .grid, .grid-4 { grid-template-columns: 1fr; }
  th, td { padding: .62rem .4rem; }
}

/* Rules and scoring reference pages */
.rule-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.rule-grid .card { margin: 0; }
.definition-list { margin: 0; }
.definition-list > div { padding: .55rem 0; border-bottom: 1px solid var(--border); }
.definition-list > div:last-child { border-bottom: 0; }
.definition-list dt { font-weight: 800; }
.definition-list dd { margin: .15rem 0 0; color: #475467; }
.reference-image-link { display: block; }
.reference-image {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--border);
  border-radius: .55rem;
  background: white;
}
.notice-card { border-left: 5px solid #e6a700; }
.score-table { max-width: 680px; margin: 0 auto; }
.score-table td, .score-table th { font-size: 1rem; }
.example-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.example-box { background: #f4f7f5; border: 1px solid var(--border); border-radius: .65rem; padding: 1rem; }
.example-box h3 { margin: 0 0 .4rem; }
.section-heading-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
.secondary-link { background: #475467; }
.cheat-sheet-pages { display: grid; gap: 1.25rem; }
.cheat-sheet-pages figure { margin: 0; }
.cheat-sheet-pages figcaption { margin-top: .45rem; color: var(--muted); font-size: .92rem; }
@media (max-width: 720px) {
  .rule-grid, .example-grid { grid-template-columns: 1fr; }
  nav { gap: .2rem; }
  nav a { padding: .42rem .52rem; font-size: .92rem; }
}
