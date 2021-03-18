/**
 * Merges multiple byteArrays into a single Array.
 * This is a utility function to be able to get the progress of a request.
 * @param {Array} arrays - Array of ByteArrays.
 * @return {Uint8Array} Single merged array.
 */
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

/**
 * The file getter allows to fetch files and use a Gauge visualization to report its progress
 */
class FileGetter {
  /**
   * Initializes the the FileGetter
   * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
   */
  constructor({ viewer }) {
    /**
     * Hashmap object from filename to data and download metadata.
     * @type {Object}
     * */
    this.files = {};
    /**
     * indicates if the modal dialog showing FileGetter si currently active
     * @type {Boolean}
     * */
    this.isActive = false;
    /**
     * The instance of the genome properites viewer
     * @type {GernomeProperiesViewer}
     * */
    this.viewer = viewer;
    /**
     * Index of the Gauge that is currently in display.
     * @type {Number}
     * */
    this.activeGauge = 0;
    /**
     * All the gauges. One per file to download.
     * @type {Array}
     * */
    this.activeGauges = [];
    setInterval(
      (_this) => {
        _this.activeGauge =
          (_this.activeGauge + 1) % Object.values(_this.activeGauges).length;
      },
      3000,
      this
    );
  }

  /**
   * Alias over the method `getText()` indicating that it should parse it as JSON
   * @param {String} path - URL to the file to upload
   * @return {Object} JSON object with the content of the file.
   */
  getJSON(path) {
    return this.getText(path, true);
  }

  /**
   * Triggers the fetch for the file in the `path` and updates the progress in the gauges
   * @param {String} path - URL to the file to upload
   * @param {Boolean} shouldParseAsJSON - Indicates if it should attent to parse is as JSON.
   * @return {(String|Object)} Text content of the file or JSON object.
   */
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

  /**
   * Creates the Dialog components to display thr FileGetter
   * @param {D3Selector} modal - D3 Selector of the modal component were the gauge will be displayed.
   */
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

  /**
   * Goes through `this.files` and updates the graphical components to reflect the progress of each downloaded file.
   */
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

    const w = this.gaugeSVG.node().getBoundingClientRect().width;

    const gauges = this.gaugeSVG.selectAll("g.gauge").data(this.activeGauges);
    const current = this.activeGauge;

    const gauge = gauges
      .enter()
      .append("g")
      .attr("class", "gauge")
      .attr("transform", (d, i) => `translate(0,${w * (i - current)})`);

    const r = w / 2 - 10;

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

export default FileGetter;
