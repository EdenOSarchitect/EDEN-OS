# EDEN OS — GitHub Pages site

Static reference site. Truth-boundary copy only (no global-deploy or multi-trillion claims).

## Deploy (from your machine)

```bash
cd EDEN_PAGES
git init
git add index.html README.md
git commit -m "EDEN OS Pages: Don't recompute it. Verify it."
# create empty repo on GitHub named eden-os-site (or similar)
git branch -M main
git remote add origin https://github.com/<YOU>/eden-os-site.git
git push -u origin main
```

Then: GitHub → repo → Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)` → Save.

Site URL: `https://<YOU>.github.io/eden-os-site/`

Optional custom domain: add a `CNAME` file with the hostname and point DNS.
