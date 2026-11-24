import { tsvParseRows, select } from "./d3";

const ASSIGNMENT_VALUES = new Set(["YES", "PARTIAL", "NO"]);
const IPR_RE = /^IPR\d{6}$/;
const MD5_RE = /^[A-Fa-f0-9]{32}$/;
const GENPROP_RE = /^GenProp\d{4}$/;

const firstDataLine = (text) => {
  const body = String(text || "").replace(/^\uFEFF/, "");
  for (const raw of body.split(/\r?\n/)) {
    if (raw && raw[0] !== "#") return raw;
  }
  return "";
};

export const classifyUpload = (filename, text) => {
  const name = String(filename || "").toLowerCase();
  if (name.endsWith(".gz")) return "assign";
  const trimmed = String(text || "")
    .replace(/^\uFEFF/, "")
    .trim();
  if (!trimmed) return "unknown";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  const cols = firstDataLine(text).split("\t");
  if (cols[0] === "Accession" && cols[1] === "Name") return "assign";
  if (
    cols.length >= 11 &&
    (MD5_RE.test(cols[1] || "") ||
      (/^\d+$/.test(cols[2] || "") &&
        /^\d+$/.test(cols[6] || "") &&
        /^\d+$/.test(cols[7] || "")))
  ) {
    return "assign";
  }
  if (IPR_RE.test(cols[0] || "")) return "assign";
  const value = String(cols[2] || "").toUpperCase();
  if (
    ASSIGNMENT_VALUES.has(value) &&
    (GENPROP_RE.test(cols[0] || "") || cols.length >= 3)
  ) {
    return "summary";
  }
  return "unknown";
};

const isSummaryLine = (line) =>
  Array.isArray(line) &&
  line.length >= 3 &&
  ASSIGNMENT_VALUES.has(String(line[2] || "").toUpperCase());

const mergeObjectToData = (data, obj) => {
  for (const gp of Object.keys(obj || {})) {
    if (data[gp]) {
      for (const newOrg of Object.keys((obj[gp] && obj[gp].values) || {})) {
        if (newOrg !== "TOTAL")
          data[gp].values[newOrg] = obj[gp].values[newOrg];
      }
      const stepsObj = ((obj[gp] && obj[gp].steps) || []).reduce((agg, v) => {
        agg[String(v.step)] = v;
        return agg;
      }, {});
      for (const step of data[gp].steps || []) {
        const stepData = stepsObj[String(step.step)];
        if (stepData && stepData.values) {
          for (const newOrg of Object.keys(stepData.values)) {
            step.values[newOrg] = stepData.values[newOrg];
          }
        }
      }
    }
  }
};

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
      if (!d || (d.length === 1 && !d[0])) return;
      if (!isSummaryLine(d)) {
        if (i === 0 && (d[0] === "Accession" || d[0] === "property")) return;
        allLinesAreOK = false;
        errorLines.push([i, d]);
        return;
      }
      const value = String(d[2]).toUpperCase();
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
      viewer.data[d[0]].values[tax_id] = value;
      viewer.data[d[0]].values.TOTAL[value]++;
      viewer.organism_totals[tax_id][value]++;
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

export const preloadSpecies = (viewer, data) => {
  viewer.data = data;
  Object.values(viewer.data).forEach((gp) => {
    gp.parent_top_properties = viewer.gp_hierarchy.get_top_level_gp_by_id(
      gp.property
    );
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
  viewer.update_viewer(500);
};

function concat(arrays) {
  let i = 0;
  let n = 0;
  for (const a of arrays) n += a.length;
  const newArray = new Uint8Array(n);
  for (const a of arrays) {
    newArray.set(a, i);
    i += a.length;
  }
  return newArray.buffer;
}
export class FileGetter {
  constructor({ element = "body", viewer }) {
    this.base = select(element);
    this.files = {};
    this.isActive = false;
    this.viewer = viewer;
    this.activeGauge = 0;
    this.activeGauges = [];
    this.progressTimer = setInterval(() => {
      const n = this.activeGauges.length;
      if (n) this.activeGauge = (this.activeGauge + 1) % n;
    }, 3000);
  }

  destroy() {
    this.isActive = false;
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  getJSON(path) {
    return this.getText(path, true);
  }

  async getText(path, shouldParseAsJSON = false) {
    if (this.files[path]) return this.files[path].request;
    this.files[path] = {
      loading: true,
      path,
    };
    const { modal } = this.viewer;
    if (!this.isActive) this.createProgressContent(modal);
    // this.activeGauge = path;
    const response = await fetch(path);
    if (this.viewer.destroyed) return null;
    this.files[path].request = response;
    const total = response.headers.get("content-length");
    const reader = response.body && response.body.getReader();
    const values = [];
    let loaded = 0;
    let responseAsArrayBuffer = null;
    if (!reader) {
      responseAsArrayBuffer = await response.arrayBuffer();
      loaded = responseAsArrayBuffer.byteLength;
      this.files[path].progress = 1;
    } else {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const { done, value } = await reader.read();
        if (done) break;
        if (this.viewer.destroyed) return null;
        loaded += value.length;
        this.files[path].progress = total ? loaded / total : null;
        this.files[path].event = {
          total,
          loaded,
        };
        this.updateProgress();
        values.push(value);
      }
      responseAsArrayBuffer = concat(values);
    }
    const codeUnits = new Uint8Array(responseAsArrayBuffer);
    let text = "";
    for (let i = 0; i < codeUnits.length; i++) {
      text += String.fromCharCode(codeUnits[i]);
    }
    this.files[path].loading = false;
    this.files[path].data = shouldParseAsJSON ? JSON.parse(text) : text;

    if (Object.values(this.files).every((file) => !file.loading)) {
      modal.setVisibility(false);
      this.isActive = false;
    }

    return this.files[path].data;
  }

  createProgressContent(modal) {
    modal.showContent("", true);
    this.progressContent = modal.getContentElement();
    this.progressContent.append("h1").text("Loading Assets");
    const pp = this.progressContent
      .append("div")
      .attr("class", "progress-panel");
    this.gaugeDiv = pp.append("div").attr("class", "gauges-panel");
    this.gaugeSVG = this.gaugeDiv
      .append("svg")
      .attr("width", "10vw")
      .attr("height", "10vw")
      .attr("class", "gauges");
    this.gaugeLabel = this.gaugeDiv
      .append("div")
      .attr("class", "gauge-label")
      .text("...");
    this.requestsList = pp.append("div").attr("class", "requests-list");
    this.isActive = true;
  }

  updateProgress() {
    if (!this.isActive) return;

    const files = Object.values(this.files);
    const total = {
      path: "TOTAL",
      progress:
        files.reduce((agg, v) => agg + (v.progress || 0), 0) / files.length,
    };
    this.activeGauges = files
      .concat(total)
      .filter((f) => f.progress === null || f.progress < 1);
    this.gaugeLabel.text(
      this.activeGauges[this.activeGauge]
        ? this.activeGauges[this.activeGauge].path
        : ""
    );

    const requestDiv = this.requestsList
      .selectAll("div.request")
      .data(files, (d) => d.path);
    requestDiv
      .enter()
      .append("div")
      .attr("class", "request")
      .merge(requestDiv)
      .text(
        (d) => `${d.path}: 
        ${d.progress ? (d.progress * 100).toFixed(1) : " ? "}% 
        - ${d.event ? d.event.loaded : "_"}/${(d.event && d.event.total) || "?"}
       `
      );

    const gaugeNode = this.gaugeSVG && this.gaugeSVG.node();
    if (!gaugeNode) return;
    const w = gaugeNode.getBoundingClientRect().width || 0;
    if (w <= 0) return;

    const gauges = this.gaugeSVG.selectAll("g.gauge").data(this.activeGauges);
    const current = Number.isFinite(this.activeGauge) ? this.activeGauge : 0;

    const gauge = gauges
      .enter()
      .append("g")
      .attr("class", "gauge")
      .attr("transform", (d, i) => `translate(0,${w * (i - current)})`);

    const r = Math.max(0, w / 2 - 10);

    const circunferencia = 2 * Math.PI * r;
    gauge
      .append("circle")
      .attr("class", "gauge-bg")
      .attr("r", r)
      .attr("cx", w / 2)
      .attr("cy", w / 2);
    gauge
      .append("circle")
      .attr("class", "gauge-val")
      .attr("stroke-linecap", "round")
      .attr("stroke-dasharray", circunferencia)
      .attr("stroke-dashoffset", circunferencia)
      .attr("r", r)
      .attr("transform", `rotate(90,${w / 2},${w / 2})`)
      .attr("cx", w / 2)
      .attr("cy", w / 2);

    gauge
      .append("text")
      .attr("class", "percentage")
      .attr("x", w / 2)
      .attr("y", w / 2);

    gauges
      .transition()
      .attr("transform", (d, i) => `translate(0,${w * (i - current)})`);
    gauges
      .select(".percentage")
      .text((d) => (d.progress ? `${(d.progress * 100).toFixed(1)}%` : "?"));
    gauges
      .select(".gauge-val")
      .classed("uncertain", (d) => d.progress === null)
      .attr("stroke-dashoffset", (d) =>
        d.progress === null
          ? circunferencia / 2
          : circunferencia * (1 - d.progress)
      );
  }
}
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

function assignErrorMessage(status, body) {
  try {
    const parsed = JSON.parse(body);
    const detail = parsed && parsed.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length) {
      return detail
        .map((item) => (item && (item.msg || item.message)) || "")
        .filter(Boolean)
        .join(" ");
    }
  } catch (_error) {
    // keep the HTTP status fallback
  }
  return `Could not calculate Genome Properties (${status}).`;
}

async function isGzipFile(file) {
  if (/\.gz$/i.test(file.name || "")) return true;
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  return head[0] === 0x1f && head[1] === 0x8b;
}

function sendToAssign(viewer, fileToRead, showError) {
  if (!viewer.options.gp_server) {
    showError("Genome Properties assignment is not configured.");
    return Promise.resolve();
  }
  viewer.modal.showContent(
    "<h3><div class='loading'>◉</div>Calculating Genome Properties from InterPro data</h3>",
    true
  );
  const body = new FormData();
  body.append("file", fileToRead);
  body.append("ipproname", fileToRead.name);
  return fetch(viewer.options.gp_server, {
    method: "POST",
    body,
  })
    .then(async (response) => {
      const text = await response.text();
      if (!response.ok)
        throw new Error(assignErrorMessage(response.status, text));
      return text;
    })
    .then((x) => {
      viewer.loadGenomePropertiesText(fileToRead.name, x);
      viewer.modal.setVisibility(false);
    })
    .catch((error) => {
      showError(
        error.message || "Could not calculate Genome Properties from this file"
      );
    });
}

export const uploadLocalGPFile = (viewer, fileToRead) => {
  if (!viewer || !fileToRead) return;
  const showError = (message) => {
    if (viewer.modal && viewer.modal.showContent) {
      viewer.modal.showContent(
        `<h3><div class='error'>${message}</div></h3>`,
        false
      );
    }
  };
  const run = async () => {
    if (await isGzipFile(fileToRead)) {
      await sendToAssign(viewer, fileToRead, showError);
      return;
    }
    const text = await fileToRead.text();
    const kind = classifyUpload(fileToRead.name, text);
    if (kind === "assign") {
      await sendToAssign(viewer, fileToRead, showError);
      return;
    }
    if (kind === "unknown") {
      showError(
        "This is not an InterProScan TSV, an InterPro entry export, or a Genome Properties summary file."
      );
      return;
    }
    viewer.loadGenomePropertiesText(fileToRead.name, text);
  };
  run().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    showError(error.message || "Could not load the selected file");
  });
};
