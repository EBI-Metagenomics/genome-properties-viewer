# Genome Properties Viewer

A heatmap-styled web viewer for the Genome Properties project.

The x axis is Genome Properties; the y axis is the selected species. Species can be selected from a taxonomy tree on the left of the screen.

Published on npm as [`@microbiome-informatics/genome-properties-viewer`](https://www.npmjs.com/package/@microbiome-informatics/genome-properties-viewer). This is a new scoped package, not a continuation of the unscoped `genome-properties-viewer` name.

You can see it in action in https://wwwdev.ebi.ac.uk/interpro/genomeproperties/viewer

## Install

```bash
npm install @microbiome-informatics/genome-properties-viewer
```

## Usage

```js
import gpv from "@microbiome-informatics/genome-properties-viewer";
import "@microbiome-informatics/genome-properties-viewer/gp-style.css";

const { d3, GenomePropertiesViewer, uploadLocalGPFile } = gpv;

const viewer = new GenomePropertiesViewer({
  element_selector: "#gp-viewer",
  controller_element_selector: "#gp-selector",
});
```

`index.html` in this repo is a standalone demo that loads the IIFE bundle from `bin/d3.custom.min.js`.

## Releasing

Later versions are published from GitHub Actions when a GitHub Release is created. Trusted publishing (OIDC) is used; there is no npm token in the workflow.

1. Bump `version` in `package.json` and merge to the default branch.
2. Create a GitHub Release whose tag matches that version, for example `v1.0.0-beta.2`.
3. [`.github/workflows/publish.yml`](.github/workflows/publish.yml) publishes `@microbiome-informatics/genome-properties-viewer` to npm.

The first version (`1.0.0-beta.1`) was published locally because npm trusted publishing can only be configured after the package exists. npm 11 requires `--tag` for prerelease versions; that first publish used `--tag latest` so `npm install @microbiome-informatics/genome-properties-viewer` resolves.

## API Reference

The code API reference is under construction and its current state is available in [reference.md](./reference.md)

#### Progress

| File                  | Status |
| --------------------- | ------ |
| gp-controller.js      | ⚠️     |
| gp-filters.js         | ✅     |
| gp-hierarchy.js       | ✅     |
| gp-scroller.js        | ✅     |
| gp-steps.js           | ⚠️     |
| gp-tax-node.js        | ⚠️     |
| gp-taxonomy-sorter.js | ⚠️     |
| gp-taxonomy.js        | ⚠️     |
| gp-totals.js          | ✅     |
| gp-ui-utils.js        | ✅     |
| gp-uploader.js        | ⚠️     |
| gp-viewer.js          | ⚠️     |
| modal.js              | ✅     |
| zoomer.js             | ✅     |
