import * as d3 from "./d3";

export const loadGenomePropertiesFile = (viewer, tax_id) => {
  if (viewer.organisms.indexOf(Number(tax_id)) !== -1) return;
  d3.text(viewer.options.server.replace("{}", tax_id)).get((error, text) => {
    if (error) throw error;
    loadGenomePropertiesText(viewer, tax_id, text);
    viewer.update_viewer(false, 500);
  });
};

const isLineOK = line => line.length === 3;

export const loadGenomePropertiesText = (viewer, label, text) => {
  try {
    viewer.data = JSON.parse(text);
    Object.values(viewer.data).forEach(gp => {
      gp.parent_top_properties = viewer.gp_hierarchy.get_top_level_gp_by_id(gp.property);
      gp.isShowingSteps = false;
    });
    viewer.organisms = Object.keys(Object.values(viewer.data)[0].values)
      .filter(x => x!=="TOTAL");
    viewer.organisms
      .forEach(tax_id => viewer.gp_taxonomy.set_organisms_loaded(tax_id));
    if (!viewer.propsOrder) viewer.propsOrder = Object.keys(viewer.data).sort();
    viewer.update_viewer(false, 500);
  } catch (e) {
    console.log("File is not JSON. Trying to parse it as TSV now.")
    const wl = viewer.whitelist;
    let tax_id = Number(label);
    const isFromFile = Number.isNaN(tax_id);
    if (isFromFile) tax_id = label;
    viewer.organisms.push(tax_id);
    viewer.organism_totals[tax_id] = {YES: 0, NO: 0, PARTIAL: 0};
    let allLinesAreOK = true;
    const errorLines = [];
    d3.tsvParseRows(text, (d, i) => {
      if (!isLineOK(d)) {
        allLinesAreOK = false;
        errorLines.push([i, d]);
      }
      if (wl && wl.indexOf(d[0]) === -1) return;
      if (!(d[0] in viewer.data))
        viewer.data[d[0]] = {
          property: d[0],
          name: d[1],
          values: {TOTAL: {YES: 0, NO: 0, PARTIAL: 0}},
          parent_top_properties: viewer.gp_hierarchy.get_top_level_gp_by_id(d[0]),
          // TODO: Replace for actual steps information
          steps: d[0]
            .slice(7)
            .split("")
            .filter(x => x !== "0")
            .reduce(agg => {
              agg.push({
                step: agg.length + 1,
                values: {}
              });
              return agg;
            }, []),
          isShowingSteps: false
        };
      if (tax_id in viewer.data[d[0]]["values"]) return;
      viewer.data[d[0]]["values"][tax_id] = d[2];
      viewer.data[d[0]]["values"]["TOTAL"][d[2]]++;
      viewer.organism_totals[tax_id][d[2]]++;
      // TODO: Replace for actual steps information
      viewer.data[d[0]].steps.forEach(
        step => (step.values[tax_id] = Math.random() > 0.5)
      );
    });
    if (allLinesAreOK) {
      viewer.gp_taxonomy.set_organisms_loaded(tax_id, isFromFile);
      if (!viewer.propsOrder) viewer.propsOrder = Object.keys(viewer.data).sort();
      viewer.update_viewer(false, 500);
    } else {
      delete viewer.organisms[tax_id];
      delete viewer.organism_totals[tax_id];
      throw new Error(
        "File didn't load. The following lines have errors:" +
        errorLines.map(l => l.join(": ")).join("\n")
      );
    }
  }
};
export const removeGenomePropertiesFile = (viewer, id) => {
  let tax_id = Number(id);
  const isFromFile = Number.isNaN(tax_id);
  if (isFromFile) tax_id = id;
  delete viewer.organism_totals[tax_id];
  const i = viewer.organisms.indexOf(tax_id);
  viewer.organisms.splice(i, 1);
  viewer.gp_taxonomy.remove_organism_loaded(tax_id, isFromFile);
  if (viewer.organisms.length === 0) {
    viewer.data = {};
  }
  for (const gp of Object.keys(viewer.data)) {
    viewer.data[gp].values["TOTAL"][viewer.data[gp].values[tax_id]]--;
    if (viewer.data[gp].values[tax_id]) delete viewer.data[gp].values[tax_id];
  }
  viewer.update_viewer(false, 500);
};

