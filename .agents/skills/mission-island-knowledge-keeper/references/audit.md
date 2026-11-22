# Audit mode

Run the audit when asked for a knowledge-base audit, or on a schedule. Report the findings in the skill's table format, grouped by check. Fix what's mechanical, such as a dead link with an archived copy. List the rest as follow-ups.

| Check | How |
| --- | --- |
| **Orphan pages** | Find pages under `docs/` that no other page links to. |
| **Missing entries** | Check that every species id in the catalog, habitat, mechanic and named place in the world has a page. |
| **Stale pages** | Flag pages whose last-tended date is older than about six months. Regulations, guidelines and species status go stale faster. |
| **Unsourced real claims** | Count `unsourced` tags, and claims with no source, on each page. Report the pages that rest only on tier 3–4 sources. |
| **Unopened sources** | List entries in `sources.yaml` with `opened: false`. |
| **Broken internal links** | Run `node scripts/check-doc-links.mjs`, which checks relative links and heading anchors across the docs and skills. |
| **Quote matches** | Run `node scripts/check-source-quotes.mjs --write`. It records `quote-match: exact`, `not-found` or `unfetchable` under each quote. A `not-found` needs a person; `unfetchable` usually means a blocked site or a PDF. It never marks a claim checked. |
| **Dead links** | Check external links. Replace a dead one with its archived copy, or flag it. |
| **Planned work that has landed** | Check pages marked *planned* or *open question* whose linked issue has closed. |
| **Status drift** | Check that no page claims a higher status than the feature it describes. For example, a page marked playable can't describe a mechanic that is still planned. |
| **Tutorial drift** | Check tutorials pinned to a commit before the code they use last changed. Re-run them. |
| **Safety reviews due** | Flag safety entries past their guideline's review date. |
| **Reference photos** | Check that every model with a reference table has a reference for each species, and that the photo links still resolve. |
