# LinkedIn search patterns

How the skill talks to LinkedIn via the `mcp__claude-in-chrome__*` tools.

## URL template

```
https://www.linkedin.com/jobs/search/?keywords=<URL-encoded keywords>&location=<URL-encoded location>&f_WT=2&f_TPR=r<seconds>
```

| Param | Meaning | When to set |
|---|---|---|
| `keywords` | Free-text search | Always |
| `location` | Location label LinkedIn understands ("European Union", "United States", "France", "Germany", country names, city names) | Always |
| `f_WT=2` | Remote-only filter | When `remote: true` (default) |
| `f_TPR=r<seconds>` | Posted within N seconds | `posted_within_days * 86400` |
| `f_E=2,3,4` | Experience: 2=mid, 3=senior, 4=director | Optional, comma-separated |
| `f_JT=F,C` | Job type: F=full-time (CDI), C=contract/freelance, P=part-time, T=temporary, I=internship | When `contract_types` set, comma-separated |
| `f_SB2=N` | Salary bucket: 1=$40K, 2=$60K, 3=$80K, 4=$100K, 5=$120K, 6=$140K, 7=$160K, 8=$180K, 9=$200K, 10=$220K | When `salary_min_k` set; map to closest bucket per criteria-yaml-schema.md |

### Examples

- Senior full-stack EU, last 7 days, remote:
  `https://www.linkedin.com/jobs/search/?keywords=Senior%20Full%20Stack%20Angular%20Java&location=European%20Union&f_WT=2&f_TPR=r604800`
- AI engineer US, last 7 days, remote, mid+senior:
  `https://www.linkedin.com/jobs/search/?keywords=AI%20Engineer%20LLM&location=United%20States&f_WT=2&f_TPR=r604800&f_E=2,3`

## Pre-flight: confirm logged in

Before any search, navigate to `https://www.linkedin.com/feed/` and check that the page loaded a feed (not a login wall). LinkedIn's class names change frequently, so detection is text-based:

```javascript
new Promise(r => setTimeout(r, 1500)).then(() => {
  const url = location.href;
  const onLogin = url.includes('/login') || url.includes('/uas/login') || url.includes('/checkpoint/');
  // Logged-in feed shows the user's left-rail nav: "Accueil / Home", "Mon réseau / My Network", "Emplois / Jobs", "Messagerie / Messaging"
  const body = (document.body.innerText || '').slice(0, 400);
  const navWords = ['Home', 'Accueil', 'Jobs', 'Emplois', 'My Network', 'Mon réseau'];
  const hasNav = navWords.filter(w => body.includes(w)).length >= 2;
  return JSON.stringify({ loggedIn: !onLogin && hasNav, url });
})
```

If logged out, abort with: "LinkedIn session not authenticated. Please log in to LinkedIn in the Chrome browser, then re-run."

## Drive the browser

Use `browser_batch` to do navigate + extract in one round-trip per query. Use the existing claude-in-chrome tab group.

## DOM extraction

LinkedIn renders search results into the main scaffold. The reliable selector across language settings is anchor tags pointing to `/jobs/view/<id>`. Each anchor is wrapped by a card containing the title, company, and location text.

Run this in the search results page (works language-agnostically):

```javascript
Array.from(document.querySelectorAll('a[href*="/jobs/view/"]')).map(a => {
  let row = a.closest('li, div.base-card, div.job-card-container') || a.parentElement;
  while (row && !row.innerText) row = row.parentElement;
  const lines = (row ? row.innerText : a.innerText)
    .trim().split('\n').map(s => s.trim()).filter(Boolean);
  const id = a.href.split('?')[0]
    .replace('https://www.linkedin.com/jobs/view/', '').replace('/', '');
  return {
    id,
    url: 'https://www.linkedin.com/jobs/view/' + id + '/',
    title: lines[0] || '',
    company: lines[2] || '',
    location: lines[3] || '',
  };
})
```

Notes:
- `lines[1]` is usually a duplicate of the title with " with verification" suffix; skip it.
- `lines[2]` is the company; `lines[3]` is the location with `(Remote)` suffix in the user's UI language.
- Free LinkedIn accounts (logged in or out) typically expose only ~7 actual job cards per page even though the page claims "500+ results". The remaining `.scaffold-layout__list-item` elements are placeholders for premium-only content.
- To get more results per query, paginate via `&start=N` (N = 0, 25, 50, ...). Each page yields a fresh ~7 jobs. Stop paginating when a page returns a duplicate ID (you've looped) or returns 0 jobs.
- If the array is empty, the page hasn't finished hydrating. Wait 1.5–3 seconds and retry once before giving up.

## Pagination loop

Recommended: paginate up to `start=50` (3 pages, ~21 jobs per query) by default. More than that hits diminishing returns and rate-limits.

```
For each search in criteria.yaml:
  for start in [0, 25, 50]:
    navigate to URL with &start=<start>
    wait, extract jobs
    if zero jobs returned -> break (end of results)
    if all returned IDs already seen this query -> break (loop / no new)
    accumulate
```

Persist accumulated results in `sessionStorage` (not `window.__var`) — every navigate wipes window globals, but sessionStorage survives same-origin navigations. Example:

```javascript
const prev = JSON.parse(sessionStorage.getItem('jobhunt_acc') || '[]');
sessionStorage.setItem('jobhunt_acc', JSON.stringify(prev.concat(newJobs)));
```

## De-duplication

The `id` field is the LinkedIn job ID. It is stable across:
- Different keyword queries
- Different language settings
- Reposts from the same employer (LinkedIn assigns a new ID for true reposts — those should be treated as new jobs intentionally)

Dedup is exact-string match on `id`. Do not normalize, lowercase, or trim — IDs are numeric strings.

## Per-job detail (rarely needed)

If the user asks for full job descriptions, navigate to the job URL and pull `.show-more-less-html__markup` or `article .description__text` for the body. Most workflows don't need this — title + company + location is enough for the tracker. Only fetch details on demand.

## Rate limiting

Run searches sequentially with a small pause between (the `browser_batch` already serializes). LinkedIn will throttle the logged-in session if hammered. If a search returns zero results unexpectedly, wait 30 seconds before the next query and try again — most "zero results" outcomes are transient.
