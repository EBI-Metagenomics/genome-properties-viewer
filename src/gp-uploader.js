import { tsvParseRows } from "./d3";
/**
 * Quick check if a line from a TSV file is as expected
 * @param {String} line - Line to text
 * @return {Boolean} Is OK `true` or not `false`
 */
const isLineOK = (line) => line.length === 3;

/**
 * Data structure that contains all the genome properties, and the values of matching several species.
 * @typedef {Object} GenomePropertiesMatches
 * @example <caption>Genome properties matching data for a single property with a single step on a single species</caption>
 * {
 *    "GenPropXXXX":{
 *      property: "GenPropXXXX",
 *      name: "Name of GenPropXXXX",
 *      steps: [
 *        {
 *          step: "1",
 *          step_name: "Lonely Step",
 *          required: 1,
 *          values: { 833330: 1 },
 *        },
 *      ],
 *      values: { 833330: "YES", TOTAL: { PARTIAL: 0, NO: 0, YES: 1 } },
 *    }
 * }
 *
 */

/**
 * Merges the data of the genome properties of a single species into a data structure of multiple species
 * @param {GenomePropertiesMatches} data - Genome Properties matching multiple species
 * @param {GenomePropertiesMatches} obj - Genome Properties matching a single species
 */
const mergeObjectToData = (data, obj) => {
  for (const gp of Object.keys(data)) {
    for (const newOrg of Object.keys((obj[gp] && obj[gp].values) || {})) {
      if (newOrg !== "TOTAL") data[gp].values[newOrg] = obj[gp].values[newOrg];
    }
    const stepsObj = ((obj[gp] && obj[gp].steps) || []).reduce((agg, v) => {
      agg[v.step] = v;
      return agg;
    }, {});
    for (const step of data[gp].steps) {
      for (const newOrg of Object.keys(stepsObj[step.step].values)) {
        step.values[newOrg] = stepsObj[step.step].values[newOrg];
      }
    }
  }
};
/**
 * Assuming the matches for the species with the given `taxid` are already loaded. This funcions sets it as selected in the tree and trigger a refresh, so the heatmap is updated.
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 * @param {String} taxId - Taxonomy ID to be dsiplayed.
 * @param {Boolean} isFromFile - Indicates if the file to be enabled comes from a file uploaded by the user.
 * @param {Boolean} shouldUpdate - Indicates if an update of the viewer is necesary after enabling the taxId.
 */
export const enableSpeciesFromPreLoaded = (
  viewer,
  taxId,
  isFromFile = false,
  shouldUpdate = true
) => {
  let tax_id = Number(taxId);
  if (Number.isNaN(tax_id)) tax_id = taxId;
  viewer.gp_taxonomy.set_organisms_loaded(tax_id, isFromFile);
  viewer.organisms.push(tax_id);
  viewer.organism_totals[tax_id] = { YES: 0, NO: 0, PARTIAL: 0 };
  if (shouldUpdate) viewer.update_viewer(500);
};
/**
 * Takes the information of the GP matches of a species, given as a text file, parses it as JSON and loads it in the viewer.
 * If the text is not a valid JSON it tries to process it as a TSV.
 * *NOTE:* The step information from a TSV file is randomly generated.
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 * @param {String} label - Taxonomy ID or file name to be displayed.
 * @param {String} text - P matches of a species as a String, either in JSON or TSV format.
 * @param {Boolean} isFromFile - Indicates if the file to be enabled comes from a file uploaded by the user.
 */
export const loadGenomePropertiesText = (
  viewer,
  label,
  text,
  isFromFile = false
) => {
  try {
    const obj = JSON.parse(text);
    mergeObjectToData(viewer.data, obj);
    const objOrgs = Object.keys(Object.values(obj)[0].values).filter(
      (x) => x !== "TOTAL"
    );
    for (const org of objOrgs) {
      enableSpeciesFromPreLoaded(viewer, org, isFromFile);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("File is not JSON. Trying to parse it as TSV now.");
    const wl = viewer.whitelist;
    let tax_id = Number(label);
    if (isFromFile) tax_id = label;
    viewer.organisms.push(tax_id);
    viewer.organism_totals[tax_id] = { YES: 0, NO: 0, PARTIAL: 0 };
    let allLinesAreOK = true;
    const errorLines = [];
    tsvParseRows(text, (d, i) => {
      if (!isLineOK(d)) {
        allLinesAreOK = false;
        errorLines.push([i, d]);
      }
      if (wl && wl.indexOf(d[0]) === -1) return;
      if (!(d[0] in viewer.data))
        viewer.data[d[0]] = {
          property: d[0],
          name: d[1],
          values: { TOTAL: { YES: 0, NO: 0, PARTIAL: 0 } },
          parent_top_properties: viewer.gp_hierarchy.get_top_level_gp_by_id(
            d[0]
          ),
          // TODO: Replace for actual steps information
          steps: d[0]
            .slice(7)
            .split("")
            .filter((x) => x !== "0")
            .reduce((agg) => {
              agg.push({
                step: agg.length + 1,
                values: {},
              });
              return agg;
            }, []),
          isShowingSteps: false,
        };
      if (tax_id in viewer.data[d[0]].values) return;
      viewer.data[d[0]].values[tax_id] = d[2];
      viewer.data[d[0]].values.TOTAL[d[2]]++;
      viewer.organism_totals[tax_id][d[2]]++;
      // TODO: Replace for actual steps information
      viewer.data[d[0]].steps.forEach(
        (step) => (step.values[tax_id] = Math.random() > 0.5)
      );
    });
    if (allLinesAreOK) {
      viewer.gp_taxonomy.set_organisms_loaded(tax_id, isFromFile);
      if (!viewer.propsOrder)
        viewer.propsOrder = Object.keys(viewer.data).sort();
      viewer.update_viewer(500);
    } else {
      delete viewer.organisms[tax_id];
      delete viewer.organism_totals[tax_id];
      throw new Error(
        `File didn't load. The following lines have errors:${errorLines
          .map((l) => l.join(": "))
          .join("\n")}`
      );
    }
  }
};

/**
 * Preloads a data structure with data for multiple species.
 * Useful to preload all data and this way make the viewer more performant, instead of making a call per species.
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 */
export const preloadSpecies = (viewer, data) => {
  viewer.data = data;
  Object.values(viewer.data).forEach((gp) => {
    gp.parent_top_properties = viewer.gp_hierarchy.get_top_level_gp_by_id(
      gp.property
    );
    gp.isShowingSteps = false;
  });
};

/**
 * Removes a species from the GP viewer. it removes its prescence from  `viewer.organism_totals`, `viewer.organisms`, `viewer.gp_taxonomy` and then updates the viewer.
 * The data won't be removed from `viewer.data` so it is still available in the client in case the users add the species back.
 * Useful to preload all data and this way make the viewer more performant, instead of making a call per species.
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 */
export const removeGenomePropertiesFile = (viewer, id) => {
  let tax_id = Number(id);
  const isFromFile = Number.isNaN(tax_id);
  if (isFromFile) tax_id = id;
  delete viewer.organism_totals[tax_id];
  const i = viewer.organisms.indexOf(tax_id);
  viewer.organisms.splice(i, 1);
  viewer.gp_taxonomy.remove_organism_loaded(tax_id, isFromFile);
  viewer.update_viewer(500);
};

/**
 * Loads a genome property file for a single species. If the fetch requests is succesfull it loads it in the viewer via `loadGenomePropertiesText`.
 * The source is the server sert in the options of the initializaation of the viewer. Defaults to the github files.
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 * @param {String} tax_id - Taxonomy ID to be requested.
 * @return {ReturnValueDataTypeHere} Brief description of the returning value here.
 */
export const loadGenomePropertiesFile = (viewer, tax_id) => {
  if (viewer.organisms.indexOf(Number(tax_id)) !== -1) return;
  fetch(viewer.options.server.replace("{}", tax_id))
    .then((response) => {
      if (!response.ok)
        throw new Error(`${response.status} ${response.statusText}`);
      return response.text();
    })
    .then((text) => {
      loadGenomePropertiesText(viewer, tax_id, text);
      viewer.update_viewer(500);
    });
};

/**
 * Quick check if a line follows the TSV InterProScan format
 * @param {String} line - Line to test
 * @return {Boolean} Is OK `true` or not `false`
 */
function isIpproLine(line) {
  const parts = line.split("\t");
  return !(parts.length < 11 || parts[1].length !== 32);
}
/**
 * Reads a local file from the users machine.
 * If it follows the InterProScan format it calls the genome properties server to get the  of the genome properties on the given protein matches.
 * Otherwise it tries to use the file as if it is already in the Genomeproperties format and loades it in the viewer using  `loadGenomePropertiesText`.
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 * @param {Blob} fileToRead - The Blob or File from which to read.
 */
export const uploadLocalGPFile = (viewer, fileToRead) => {
  const reader = new FileReader();
  reader.fileToRead = fileToRead;
  reader.onload = (evt) => {
    try {
      const firstline = evt.target.result.split("\n")[0];
      if (isIpproLine(firstline)) {
        viewer.modal.showContent(
          "<h3><div class='loading'>◉</div>Calculation Genome Properties from InterProScan Data</h3>",
          true
        );

        fetch(viewer.options.gp_server, {
          method: "POST",
          body: `ipproname=${reader.fileToRead.name}&ipprotsv=${evt.target.result}`,
          headers: new Headers({
            "Content-Type": "application/x-www-form-urlencoded",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "X-PINGOTHER, Content-Type",
          }),
        })
          .then((response) => response.text())
          .then((x) => {
            viewer.loadGenomePropertiesText(reader.fileToRead.name, x);
            viewer.modal.setVisibility(false);
          })
          .catch(() => {
            viewer.modal.showContent(
              "<h3><div class='error'>Server Error processing the file</div></h3>",
              false
            );
          });
      } else {
        viewer.loadGenomePropertiesText(
          reader.fileToRead.name,
          evt.target.result
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    document.getElementById("newfile").value = null;
  };
  reader.readAsText(fileToRead);
};
