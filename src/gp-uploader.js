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

const mergeObjectToData = (data, obj) => {
  for (const gp of Object.keys(data)){
    for (const newOrg of Object.keys(obj[gp] && obj[gp].values || {})){
      if (newOrg!=="TOTAL")
        data[gp].values[newOrg] = obj[gp].values[newOrg];
    }
    const stepsObj = (obj[gp] && obj[gp].steps || []).reduce((agg,v)=>{agg[v.step]=v; return agg;}, {})
    for (const step of data[gp].steps){
      for (const newOrg of Object.keys(stepsObj[step.step].values)){
        step.values[newOrg] = stepsObj[step.step].values[newOrg];
      }
    }
  }
};
export const loadGenomePropertiesText = (viewer, label, text, isFromFile=false) => {
  try {
    const obj = JSON.parse(text);
    mergeObjectToData(viewer.data, obj);
    // Object.values(viewer.data).forEach(gp => {
    //   gp.parent_top_properties = viewer.gp_hierarchy.get_top_level_gp_by_id(gp.property);
    //   gp.isShowingSteps = false;
    // });
    const objOrgs = Object.keys(Object.values(obj)[0].values)
      .filter(x => x!=="TOTAL");
    for (const org of objOrgs){
      enableSpeciesFromPreLoaded(viewer, org, isFromFile);

    }
    // viewer.organisms
    //   .forEach(tax_id => viewer.gp_taxonomy.set_organisms_loaded(tax_id));
    // if (!viewer.propsOrder) viewer.propsOrder = Object.keys(viewer.data).sort();
    // viewer.update_viewer(false, 500);
    console.log(viewer.data);
  } catch (e) {
    console.log("File is not JSON. Trying to parse it as TSV now.")
    const wl = viewer.whitelist;
    let tax_id = Number(label);
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

export const enableSpeciesFromPreLoaded = (viewer, taxId, isFromFile=false) => {
  let tax_id = Number(taxId);
  viewer.gp_taxonomy.set_organisms_loaded(tax_id,  isFromFile);
  viewer.organisms.push(tax_id);
  viewer.organism_totals[tax_id] = {YES: 0, NO: 0, PARTIAL: 0};
  viewer.update_viewer(false, 500);
};

export const preloadSpecies = (viewer, data) => {
  viewer.data = data;
  Object.values(viewer.data).forEach(gp => {
    gp.parent_top_properties = viewer.gp_hierarchy.get_top_level_gp_by_id(gp.property);
    gp.isShowingSteps = false;
  });

};

export const removeGenomePropertiesFile = (viewer, id) => {
  let tax_id = Number(id);
  const isFromFile = Number.isNaN(tax_id);
  if (isFromFile) tax_id = id;
  delete viewer.organism_totals[tax_id];
  const i = viewer.organisms.indexOf(tax_id);
  viewer.organisms.splice(i, 1);
  viewer.gp_taxonomy.remove_organism_loaded(tax_id, isFromFile);
  // if (viewer.organisms.length === 0) {
  //   viewer.data = {};
  // }
  // for (const gp of Object.keys(viewer.data)) {
  //   viewer.data[gp].values["TOTAL"][viewer.data[gp].values[tax_id]]--;
  //   if (viewer.data[gp].values[tax_id]) delete viewer.data[gp].values[tax_id];
  // }
  viewer.update_viewer(false, 500);
};

export class FileGetter {
  constructor({
    element="body",
    viewer,
  }){
    this.base = d3.select(element);
    this.files = {};
    this.isActive = false;
    this.viewer =viewer;
    this.activeGauge=0;
    setInterval((_this)=>{
      _this.activeGauge = (_this.activeGauge +1) % (Object.values(_this.activeGauges).length);
    },3000, this)
  }

  getJSON(path){
    if (this.files[path]) return this.files[path].request;
    this.files[path] = {
      loading: true,
      path,
    };
    const modal = this.viewer.modal;
    if (!this.isActive)
      this.createProgressContent(modal);
    // this.activeGauge = path;
    return this.files[path].request = d3.json(path)
      .on("progress", evt => this.updateProgress(path, evt))
      .on("load.inner", (error, data)=>{
        this.files[path].loading = false;
        this.files[path].data = data;
        if (Object.values(this.files).every(file => !file.loading)){
          modal.setVisibility(false);
          this.isActive = false;
        }

      });
  }

  createProgressContent(modal){
    modal.showContent('', true);
    this.progressContent= modal.getContentElement();
    this.progressContent.append('h1').text("Loading Assets");
    const pp = this.progressContent.append('div')
      .attr("class", "progress-panel");
    this.gaugeDiv = pp
      .append("div")
      .attr("class", "gauges-panel");
    this.gaugeSVG = this.gaugeDiv
      .append("svg")
      .attr("width", "10vw")
      .attr("height", "10vw")
      .attr("class", "gauges");
    this.gaugeLabel = this.gaugeDiv
      .append("div")
      .attr("class", "gauge-label")
      .text("...");
    this.requestsList = pp
      .append("div")
      .attr("class", "requests-list");
    this.isActive = true;
  }

  updateProgress(path, event){
    if (!this.isActive) return;
    this.files[path].progress = event.loaded/event.total;
    const files = Object.values(this.files);
    const total = {
      path: "TOTAL",
      progress: files.reduce((agg, v)=>agg+v.progress,0)/files.length,
    };
    this.activeGauges = files.concat(total).filter(f => f.progress < 1);
    this.gaugeLabel.text(
      this.activeGauges[this.activeGauge] ? this.activeGauges[this.activeGauge].path : ''
    );

    const requestDiv = this.requestsList
      .selectAll("div.request")
      .data(files, d=>d.path);
    requestDiv
      .enter()
      .append("div")
      .attr("class", "request")
      .merge(requestDiv)
      .text(d=>`${d.path}: ${(d.progress*100).toFixed(1)}%`);

    const w = this.gaugeSVG.node().getBoundingClientRect().width;

    const gauges = this.gaugeSVG
      .selectAll("g.gauge")
      .data(this.activeGauges);
    const current = this.activeGauge;

    const gauge = gauges.enter()
      .append("g")
      .attr("class", "gauge")
      .attr("transform", (d,i) => `translate(0,${w*(i-current)})`);

    const r = w/2 -10;

    const circunferencia =  2 * Math.PI * r;
    gauge.append("circle")
      .attr("class", "gauge-bg")
      .attr("r", r)
      .attr("cx", w/2)
      .attr("cy", w/2);
    gauge.append("circle")
      .attr("class", "gauge-val")
      .attr("stroke-linecap", "round")
      .attr("stroke-dasharray", circunferencia)
      .attr("stroke-dashoffset", circunferencia)
      .attr("r", r)
      .attr("transform", `rotate(90,${w/2},${w/2})`)
      .attr("cx", w/2)
      .attr("cy", w/2);

    gauge.append("text")
      .attr("class", "percentage")
      .attr("x", w/2)
      .attr("y", w/2);

    // gauge.append("text")
    //   .attr("class", "label")
    //   .attr("x", w/2)
    //   .attr("y", w - 8)
    //   .text(d=>d.path);

    gauges
      .transition()
      .attr("transform", (d,i) => `translate(0,${w*(i-current)})`);
    gauges.select(".percentage")
      .text(d=>`${(d.progress*100).toFixed(1)}%`);
    gauges.select(".gauge-val")
      .attr("stroke-dashoffset", d => circunferencia * (1 - d.progress));


  }
}

