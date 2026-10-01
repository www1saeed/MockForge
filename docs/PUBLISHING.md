# Publish the independent project on GitHub

## Repository boundary

Publish the contents of `mockforge-studio/` as the root of a new repository. MockForge Studio is an open-source project licensed under MIT. The parent workspace is not part of this project. Do not copy its history, configuration, dependency directories or organizational assets.

The repository is [www1saeed/MockForge](https://github.com/www1saeed/MockForge). Its clone URL is `https://github.com/www1saeed/MockForge.git`. The application name remains MockForge Studio.

Repository description: “Open-source form prototyping for product owners and developers to agree on requirements before implementation. Bilingual previews, validation and specification exports.”

## Prepare

### Move beside the original workspace

Open a new workspace/session at the moved directory. Run npm ci there and regenerate .angular caches if they contain old paths. Source/build paths are relative and do not need changing. Keep this directory's .npmrc, package-lock.json, .github workflow and documentation. Do not copy the original workspace's Git history or private configuration.

If the browser origin changes, export/import transfers the local draft. Moving the filesystem directory does not migrate LocalStorage between origins.

### Create the independent repository

Use the project directory. Review the MIT license and repository ownership, run `npm ci`, then the checks documented in README.md. Work on a feature branch and point `origin` to `https://github.com/www1saeed/MockForge.git`. Review the initial commits before merging into the default branch `main`.

### GitHub branding

Use `src/assets/brand/github-avatar.png` for the repository owner's avatar where appropriate, and `src/assets/brand/github-social.png` as the repository social preview in GitHub settings. The README and application header use the same mark. See [brand assets](BRANDING.md) for file sizes and usage.

## GitHub Actions

The included workflow installs public dependencies, checks lint, tests, translations, builds the app, installs Chromium and runs Playwright/axe. It uploads the static build as a Pages artifact. Pull requests and pushes perform checks only. Run the workflow manually with `deploy=true` to publish to Pages after enabling GitHub Pages with GitHub Actions in repository settings.

### First Pages deployment

1. Push the reviewed project and workflow to `main`. A push runs verification and builds the Pages artifact, but does not deploy it.
2. In the repository, open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source. Keep Actions enabled for the repository.
3. Open **Actions → Verify and optionally deploy → Run workflow**. Select `main`, enable **Publish the verified build to GitHub Pages** (`deploy=true`) and run the workflow.
4. Wait for both `verify` and `deploy` to succeed. Follow the URL reported by the deployment job.

Without a custom domain, the expected project URL is `https://www1saeed.github.io/MockForge/`. Its presentation is at `/MockForge/assets/presentation.html`. These are expected deployment locations, not confirmation that a site is already live. The relative build base URL supports the repository path without a source change. Renaming a repository changes its project-site URL and does not redirect the old Pages address.

Future pushes still verify only. Repeat the manual deployment step when you want to publish an update. See GitHub's [publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [repository-renaming guidance](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository).

Use `main` as the default branch, review before merging and keep generated build/test artifacts ignored. The application has no credentials or private package registry configuration. Dependency license notices remain in the build output.

## Before announcing

Verify the deployed project URL, DE/EN/FA switching, Persian RTL layout and font delivery, native dialog, import/export, reload restore and mobile view. Confirm that the IranSans license permits redistribution before publishing its files. Link to the presentation from the demo. Use screenshots of fictional examples. Describe inspired presets accurately and present the review as a local acknowledgement rather than authenticated sign-off.

Lead the release message with the owner's benefit: agree detailed requirements before production development and reduce avoidable changes caused by misunderstandings. Link the commercial examples and readable brief as evidence. Use docs/SALES_DEMO.md for the repository description, portfolio paragraph and customer invitation. Replace any placeholder URLs only after the real repository/demo exists.
