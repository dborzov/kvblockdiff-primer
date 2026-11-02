# Deployment

`.github/workflows/deploy.yml` runs on every push to `main` (or by hand from the Actions tab): `npm ci`,
`STRICT=1 npm run build`, then publishes `_site/` to the `gh-pages` branch, which GitHub Pages serves at
https://www.borzov.ca/kvblockdiff-primer/ (the account's user site has the custom domain, so the project
appears under its path).

To publish by hand: `STRICT=1 npm run build` and commit the contents of `_site/` to `gh-pages`.

Caveats:

- A push from a session whose GitHub token lacks the `workflow` scope is rejected if any commit in it
  touches `.github/workflows/deploy.yml`. Agents therefore do not edit the workflow; propose the change in
  the report instead.
- The retired-word check (`npm run check:words`) is not part of the workflow for that reason. Run it
  locally before every commit that touches `content/` or `data/`; a strict build does not run it.
- The strict build fails on any linker error, so a page that references a page not yet written blocks
  the deploy. Partial builds (`docs/site/build.md`) are for work in progress; `main` must always build
  strict.
