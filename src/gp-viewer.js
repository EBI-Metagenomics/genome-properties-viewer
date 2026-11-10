import GenomePropertiesHierarchy from "./gp-hierarchy";
import GenomePropertiesTaxonomy from "./gp-taxonomy";
import ZoomPanel from "./zoomer";
import TaxonomySortButton from "./gp-taxonomy-sorter";
import GenomePropertiesController from "./gp-controller";
import { updateStepToggler, updateSteps } from "./gp-steps";
import "regenerator-runtime/runtime";

import {
  drawScrollXBar,
  // drawScrollYBar,
  transformByScroll,
  updateScrollBars,
} from "./gp-scroller";
import {
  createGradient,
  drawMasks,
  updateMasks,
  drawDragArea,
} from "./gp-ui-utils";

import {
  FileGetter,
  preloadSpecies,
  enableSpeciesFromPreLoaded,
  loadGenomePropertiesFile,
  loadGenomePropertiesText,
  removeGenomePropertiesFile,
} from "./gp-uploader";

import { filterByLegend, filterByHierarchy, filterByText } from "./gp-filters";

import {
  drawTotalPerOrganismPanel,
  updateTotalPerOrganismPanel,
  drawRowTotalPanel,
  updateRowTotalPanel,
  refreshGPTotals,
} from "./gp-totals";

import GPModal from "./modal";

import * as d3 from "./d3";

export default class GenomePropertiesViewer {
  constructor({
    width = null,
    height = null,
    element_selector = "body",
    cell_side = 20,
    total_panel_height = cell_side,
    server = "https://raw.githubusercontent.com/rdfinn/genome-properties/master/flatfiles/gp_assignments/SUMMARY_FILE_{}.gp",
    server_tax = "https://raw.githubusercontent.com/rdfinn/genome-properties/master/flatfiles/taxonomy.json",
    hierarchy_path = "../test-files/hierarchy.json",
    model_species_path = "../test-files/JSON_MERGED",
    whitelist_path = null,
    controller_element_selector = "#gp-selector",
    legends_element_selector = ".gp-legends",
    gp_text_filter_selector = "#gp-filter",
    gp_label_selector = "#gp_label",
    tax_label_selector = "#tax_label",
    tax_search_selector = "#tax-search",
    template_link_to_GP_page = "https://wwwdev.ebi.ac.uk/interpro/genomeproperties/#{}",
    gp_server = "http://wwwdev.ebi.ac.uk/interpro/genomeproperties/cgi-bin/test.pl",
    dimensions = {
      tree: { width: 160 },
      labels: { width: 220 },
      total: { short_side: cell_side },
      step_expander: { short_side: cell_side },
      scroller: { short_side: 12 },
    },
  }) {
    this.destroyed = false;
    this.data = {};
    this.preloaded = {};
    this.organisms = [];
    this.organism_names = {};
    this.organism_totals = {};
    this.filter_text = "";
    this.whitelist = null;
    this.fixedHeight = height !== null;
    this.propsOrder = null;

    this.modal = new GPModal(element_selector);

    this.fileGetter = new FileGetter({
      element: ".gp-modal-content",
      viewer: this,
    });
    if (width === null) {
      const rect = d3.select(element_selector).node().getBoundingClientRect();
      width = rect.width;
    }

    if (!this.fixedHeight) {
      let rect = d3.select(element_selector).node().getBoundingClientRect();
      if (rect.height < 1) {
        d3.select(element_selector).style("flex", "1");
        rect = d3.select(element_selector).node().getBoundingClientRect();
      }
      height = rect.height;
    }

    this.options = {
      width,
      height,
      element_selector,
      cell_side,
      server,
      gp_server,
      server_tax,
      total_panel_height,
      hierarchy_path,
      template_link_to_GP_page,
      dimensions,
    };
    this.column_total_width = cell_side;
    this.x = d3.scaleBand().range([0, cell_side]);
    this.y = d3.scaleLinear().range([0, cell_side]);
    this.gp_values = ["YES", "PARTIAL", "NO"];
    this.c = {
      YES: "rgb(49, 130, 189)",
      PARTIAL: "rgb(107, 174, 214)",
      NO: "rgb(210,210,210)",
    };
    this.current_order = null;

    if (whitelist_path) {
      fetch(whitelist_path)
        .then((response) => {
          if (!response.ok)
            throw new Error(`${response.status} ${response.statusText}`);
          return response.json;
        })
        .then((data) => {
          this.whitelist = data;
        });
    }
    this.svg = d3
      .select(element_selector)
      .append("svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("class", "gp-viewer")
      .attr("tabindex", "0")
      .attr("width", width)
      .attr("height", height)
      .on("wheel", (event) => {
        if (this?.props?.length) {
          event.stopPropagation();
          this.moveScroll({ dx: -event.deltaX, dy: -event.deltaY });
        }
      });

    this.mainGroup = this.svg.append("g");

    d3.select(element_selector)
      .on("keydown", (event) => {
        this.step = this.step || 1;
        switch (event.key) {
          case "ArrowUp":
            this.moveScroll({ dy: this.options.cell_side * this.step });
            break;
          case "ArrowDown":
            this.moveScroll({ dy: -this.options.cell_side * this.step });
            break;
          case "ArrowLeft":
            this.moveScroll({ dx: this.options.cell_side * this.step });
            break;
          case "ArrowRight":
            this.moveScroll({ dx: -this.options.cell_side * this.step });
            break;
          default:
            break;
        }
        this.step += 0.5;
      })
      .on("keyup", () => {
        this.step = 1;
      });
    this.mainGroup.x = 0;
    this.mainGroup.y = 0;
    createGradient(this);

    this.gp_taxonomy = new GenomePropertiesTaxonomy({
      path: server_tax,
      x: 0,
      y: 20,
      height: this.options.dimensions.tree.width,
      width: Math.max(
        cell_side,
        width -
          this.options.dimensions.labels.width -
          this.options.dimensions.total.short_side
      ),
    })
      .on("changeOrder", (order) => {
        this.current_order = order;
        this.order_organisms_current_order();
      })
      .on("spaciesRequested", (taxId) => {
        // loadGenomePropertiesFile(this, taxId);
        enableSpeciesFromPreLoaded(this, taxId);
      })
      .on("multipleSpaciesRequested", (taxa) => {
        for (const taxId of taxa) {
          enableSpeciesFromPreLoaded(this, taxId, false, false);
        }
        this.update_viewer(500);
      })
      .on("removeSpacies", (event, taxId) => {
        event.stopPropagation();
        removeGenomePropertiesFile(this, taxId);
      })
      .on("changeWidth", (h) => {
        this.options.dimensions.tree.width = Math.max(80, h);
        this.gp_taxonomy.height = this.options.dimensions.tree.width;
        this.update_viewer();
      });

    this.gp_hierarchy = new GenomePropertiesHierarchy()
      // .load_hierarchy_from_path(this.options.hierarchy_path)
      .on("siwtchChanged", () => {
        this.mainGroup.y = 0;
        this.update_viewer(500);
        updateTotalPerOrganismPanel(this);
      });
    this.sorter = new TaxonomySortButton({
      container: this.mainGroup,
      x: 0,
      y: 0,
      function_sort: (mode) => this.gp_taxonomy.sortBy(mode),
    });
    this.buttonHeight = 25;
    this.zoomer = new ZoomPanel({
      x: 0,
      y: this.buttonHeight,
      domain: [20, 200],
      container: this.mainGroup,
      function_plus: () => (this.cell_side = this.options.cell_side + 10),
      function_less: () => (this.cell_side = this.options.cell_side - 10),
      function_slide: (event) => {
        const newY = Math.max(
          this.zoomer.slider(this.zoomer.domain[1]),
          Math.min(event.y, this.zoomer.slider(this.zoomer.domain[0]))
        );
        this.cell_side = Math.round(this.zoomer.slider.invert(newY));
      },
    });

    // this.legends_filter = { YES: "", NO: "", PARTIAL: "" };
    this.gp_label_type = "name";

    this.controller = new GenomePropertiesController({
      gp_element_selector: controller_element_selector,
      legends_element_selector,
      gp_text_filter_selector,
      gp_label_selector,
      tax_label_selector,
      tax_search_selector,
      gp_viewer: this,
      gp_taxonomy: this.gp_taxonomy,
      hierarchy_contorller: this.gp_hierarchy,
    }).on("legendFilterChanged", (filters) => {
      this.legend_filters = filters;
      this.update_viewer();
    });
    this.gp_taxonomy.on("taxonomyLoaded", () =>
      this.controller.loadSearchOptions()
    );

    this.current_scroll = { x: 0, y: 0 };
    this.draw_heatmap_panel();
    drawMasks(this);
    this.draw_labels_panel();
    drawRowTotalPanel(this);
    this.gp_taxonomy.draw_tree_panel(this.mainGroup, this.treeClipId);
    this.zoomer.draw_panel();
    this.sorter.draw();
    drawTotalPerOrganismPanel(this);
    drawScrollXBar(this);
    drawDragArea(this);
    updateMasks(this);
    this._onResize = () => this.refresh_size();
    window.addEventListener("resize", this._onResize);

    this.fileGetter.getJSON(server_tax).then((data) => {
      if (this.destroyed) return;
      this.gp_taxonomy.load_taxonomy_obj(data);
      this.update_viewer();
    });
    this.fileGetter.getJSON(hierarchy_path).then((data) => {
      if (this.destroyed) return;
      this.gp_hierarchy.load_hierarchy_from_data(data);
      this.fileGetter.getJSON(model_species_path).then((dataSpecies) => {
        if (this.destroyed) return;
        preloadSpecies(this, dataSpecies);
      });
    });
  }

  destroy() {
    this.destroyed = true;
    if (this._onResize) {
      window.removeEventListener("resize", this._onResize);
    }
    if (this.fileGetter && this.fileGetter.destroy) {
      this.fileGetter.destroy();
    }
    if (this.controller && this.controller.destroy) {
      this.controller.destroy();
    }
    d3.select(this.options.element_selector).selectAll("*").remove();
  }

  get labelWidth() {
    return this.options.dimensions.labels.width;
  }

  get treeHeight() {
    if (this.gp_taxonomy && !this.gp_taxonomy.show_tree) {
      return Math.max(70, this.options.cell_side * 3);
    }
    return this.options.dimensions.tree.width;
  }

  get heatmapLeft() {
    return this.labelWidth;
  }

  get dataWidth() {
    return (this.organisms?.length || 0) * this.options.cell_side;
  }

  get dataOffsetX() {
    return Math.max(0, this.heatmapWidth() - this.dataWidth);
  }

  get heatmapAnchor() {
    return this.heatmapLeft + this.dataOffsetX;
  }

  get heatmapTop() {
    return this.treeHeight;
  }

  heatmapWidth() {
    return Math.max(
      this.options.cell_side,
      this.options.width -
        this.labelWidth -
        this.options.dimensions.total.short_side -
        this.options.dimensions.scroller.short_side
    );
  }

  heatmapHeight() {
    return Math.max(
      this.options.cell_side,
      this.options.height -
        this.treeHeight -
        this.options.dimensions.total.short_side -
        this.options.dimensions.scroller.short_side
    );
  }

  refresh_size() {
    const rect = d3
      .select(this.options.element_selector)
      .node()
      .getBoundingClientRect();
    this.options.width = rect.width;
    if (!this.fixedHeight) this.options.height = rect.height;
    d3.select(this.options.element_selector)
      .select("svg")
      .attr("width", rect.width)
      .attr("height", this.options.height);
    this.update_viewer();
  }

  set cell_side(value) {
    const p = this.options.cell_side;
    this.options.cell_side = Math.max(20, Math.min(200, value));
    if (p !== this.options.cell_side) {
      const ratio = this.options.cell_side / p;
      this.current_scroll.x *= ratio;
      this.current_scroll.y *= ratio;
      this.zoomer.zoomBar.attr("y", this.zoomer.slider(this.options.cell_side));
      this.refresh(this);
    }
  }

  moveScroll({ dx = 0, dy = 0 }) {
    const speciesWidth = (this.organisms?.length || 0) * this.options.cell_side;
    const propsHeight = this.y ? this.y(this.props?.length || 0) : 0;
    const maxX = Math.max(0, speciesWidth - this.heatmapWidth());
    const maxY = Math.max(0, propsHeight - this.heatmapHeight());
    this.current_scroll.x = Math.max(
      -maxX,
      Math.min(0, this.current_scroll.x + dx)
    );
    this.current_scroll.y = Math.max(
      -maxY,
      Math.min(0, this.current_scroll.y + dy)
    );
    this.refresh(this);
  }

  _adjustYScaleBasedOnSteps() {
    if (!this.props) return this.y;
    const side = this.options.cell_side;
    const marks = {
      0: 0,
      1: side,
    };

    const newY = d3.scaleLinear().domain([0, 1]).range([0, side]);
    this.props.forEach((prop, i) => {
      if (prop.isShowingSteps) {
        const prevY = newY(i);

        if (!marks[i]) marks[i] = prevY;
        marks[i + 1] = marks[i] + Math.max(2, prop.steps.length + 1) * side;
        marks[i + 2] = marks[i + 1] + side;
        const domain = Object.keys(marks)
          .map(Number)
          .sort((a, b) => a - b);
        const range = domain.map((x) => marks[x]).map(Number);
        newY.range(range).domain(domain);
      }
    });
    this.y = newY;
    return this.y;
  }

  draw_heatmap_panel() {
    this.heatmapLayer = this.mainGroup
      .append("g")
      .attr("class", "heatmap-layer")
      .attr("clip-path", `url(#${this.heatmapClipId})`);
    this.newCols = this.heatmapLayer
      .append("g")
      .attr("class", "gpv-new-cols-group");
    this.newRows = this.heatmapLayer
      .append("g")
      .attr("class", "gpv-new-rows-group");
  }

  draw_labels_panel() {
    this.labelGroup = this.mainGroup
      .append("g")
      .attr("class", "gpv-label-group");
  }

  move_row(prop, delta) {
    const pos = this.propsOrder.indexOf(prop);
    if (pos !== -1) {
      const tmp = this.propsOrder.splice(pos, 1);
      const newPos = Math.max(0, pos + delta);
      this.propsOrder = this.propsOrder
        .slice(0, newPos)
        .concat(tmp)
        .concat(this.propsOrder.slice(newPos));
      this.refresh();
    }
  }

  sort_props() {
    if (this.propsOrder) {
      this.props = this.props.sort(
        (a, b) =>
          this.propsOrder.indexOf(a.property) -
          this.propsOrder.indexOf(b.property)
      );
    }
  }

  propertyLabel(d) {
    if (this.gp_label_type === "name") return d.name;
    if (this.gp_label_type === "id") return d.property;
    return `${d.property}:${d.name}`;
  }

  update_viewer(time = 0) {
    this.props = this.organisms.length ? Object.values(this.data) : [];
    refreshGPTotals(this);
    filterByHierarchy(this);
    filterByText(this);
    filterByLegend(this);
    this.sort_props();
    this._adjustYScaleBasedOnSteps();

    this.column_total_width = this.options.cell_side;
    this.gp_taxonomy.width = this.heatmapWidth();
    this.gp_taxonomy.height = this.treeHeight;
    this.gp_taxonomy.x = this.heatmapLeft + this.current_scroll.x;
    this.gp_taxonomy.y = 16;
    this.gp_taxonomy.update_tree(time, this.options.cell_side);
    this.current_order = this.gp_taxonomy.current_order;
    this.organisms = this.gp_taxonomy.get_tax_list();
    this.x
      .domain(this.current_order)
      .range([0, this.organisms.length * this.options.cell_side]);

    const heatmapH = this.heatmapHeight();
    this.current_props = this.props.filter((gp, i) => {
      const y0 = this.y(i) + this.current_scroll.y;
      const y1 = this.y(i + 1) + this.current_scroll.y;
      return y1 >= 0 && y0 < heatmapH;
    });
    const dy = Math.max(0, this.props.indexOf(this.current_props[0]));
    const visible_rows = this.current_props.length;

    const rowY = (d, i) => this.heatmapTop + this.y(i + dy);
    const heatmapX = this.heatmapAnchor;

    const rows = this.newRows
      .selectAll(".column")
      .data(this.current_props, (d) => d.property);

    rows
      .attr("transform", (d, i) => `translate(${heatmapX}, ${rowY(d, i)})`)
      .each((d, i, c) => this.update_col(d, i, c));

    rows.exit().remove();

    const newRow = rows
      .enter()
      .append("g")
      .attr("id", (d) => `col_${d.property}`)
      .attr("class", "column")
      .attr("transform", (d, i) => `translate(${heatmapX}, ${rowY(d, i)})`)
      .each((d, i, c) => this.update_col(d, i, c));

    newRow.append("line").attr("class", "puff").attr("x2", 0);

    d3.selectAll("g.column line.puff").attr(
      "x1",
      this.organisms.length * this.options.cell_side
    );

    const side = this.options.cell_side;
    const template = this.options.template_link_to_GP_page;
    const labels = this.labelGroup
      .selectAll(".row-label")
      .data(this.current_props, (d) => d.property);

    labels.exit().remove();
    labels.attr("transform", (d, i) => `translate(${heatmapX}, ${rowY(d, i)})`);

    const newLabel = labels
      .enter()
      .append("g")
      .attr("class", "row-label")
      .attr("transform", (d, i) => `translate(${heatmapX}, ${rowY(d, i)})`);

    newLabel
      .append("a")
      .attr("xlink:href", (d) => template.replace("{}", d.property))
      .attr("target", "_blank")
      .style("cursor", "pointer")
      .append("text")
      .attr("class", "row_title")
      .attr("text-anchor", "end");

    this.labelGroup
      .selectAll(".row-label text.row_title")
      .attr("x", -side - 6)
      .attr("y", side * 0.7)
      .text((d) => this.propertyLabel(d));

    this.labelGroup.selectAll(".row-label").each((d, i, nodes) => {
      const g = d3.select(nodes[i]);
      const sampleText = d3.select("text").node();
      const textHeight = sampleText ? sampleText.getBBox().height : 12;
      let radius = (side - textHeight) / 2 - 4;
      if (radius < 2) radius = 2;
      if (radius > 6) radius = 6;
      const dots = g
        .selectAll(".top_level_gp")
        .data(d.parent_top_properties || [], (p) => p);
      dots
        .attr("cy", side * 0.5)
        .attr("cx", -side * 0.35)
        .attr("r", radius);
      dots
        .enter()
        .append("circle")
        .attr("class", "top_level_gp")
        .attr("cy", side * 0.5)
        .attr("cx", -side * 0.35)
        .attr("r", radius)
        .style("fill", (p) => this.gp_hierarchy.color(p));
      dots.exit().remove();
      updateStepToggler(this, d, nodes[i], side);
    });

    updateRowTotalPanel(this);

    const orgLines = this.newCols
      .selectAll(".row")
      .data(this.organisms, (p) => p);
    orgLines.attr(
      "transform",
      (d, i) => `translate(${heatmapX + this.x(i)}, ${this.heatmapTop})`
    );
    orgLines.exit().remove();
    orgLines
      .enter()
      .append("g")
      .attr("class", "row")
      .attr(
        "transform",
        (d, i) => `translate(${heatmapX + this.x(i)}, ${this.heatmapTop})`
      )
      .append("line")
      .attr("y2", 0);
    this.newCols
      .selectAll(".row line")
      .attr("y2", this.y(this.props.length) || 0);

    updateTotalPerOrganismPanel(this);
    updateMasks(this);
    this.sorter.y = 0;
    this.zoomer.y = this.buttonHeight;
    this.sorter.refresh();
    this.zoomer.refresh();
    if (!this.skip_scroll_refreshing) updateScrollBars(this, visible_rows, dy);
  }

  update_col(gp, i, c) {
    const cell_height =
      this.options.cell_side *
      (gp.isShowingSteps ? Math.max(2, gp.steps.length + 1) : 1);
    const side = this.options.cell_side;

    const newX = d3
      .scaleBand()
      .range([0, this.organisms.length * this.options.cell_side])
      .domain(this.current_order);

    const cells = d3
      .select(c[i])
      .selectAll(".cell")
      .data(this.organisms, (d) => d);

    cells
      .transition()
      .attr("x", (d, j) => newX(j))
      .attr("width", newX.bandwidth())
      .attr("height", cell_height);

    cells.exit().remove();

    const mouseover = (event, p) => {
      d3.select(event.currentTarget.parentNode)
        .select("text")
        .classed("active", true);
      d3.selectAll(".node--leaf text").classed("active", (d) => d.label === p);
      const data = d3.select(event.currentTarget.parentNode).data();
      if (data.length < 1) return;

      const info = {
        Property: data[0].property,
        Name: data[0].name,
        Organism: `${this.getOrganismNameFromTaxId(p)} (${p})`,
        Value: data[0].values[p],
      };
      this.controller.draw_tooltip(event, info);
    };
    const mouseout = () => {
      d3.selectAll("text").classed("active", false);
      d3.selectAll(".gpv-name").remove();
      this.controller.draw_tooltip();
    };

    cells
      .enter()
      .insert("rect", ":first-child")
      .attr("class", "cell")
      .attr("x", (d, j) => newX(j))
      .attr("width", newX.bandwidth())
      .attr("height", cell_height)
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .style("fill", (d) => (d in gp.values ? this.c[gp.values[d]] : null));

    updateSteps(this, gp, c[i], side, newX);
  }

  order_organisms(value) {
    this.current_order = this.gp_taxonomy.orders[value];
    this.order_organisms_current_order();
  }

  order_organisms_current_order() {
    this.x.domain(this.current_order);
    updateTotalPerOrganismPanel(this);
    this.refresh();
  }

  change_gp_label(type) {
    this.gp_label_type = type;
    this.refresh();
  }

  loadGenomePropertiesText(name, text) {
    loadGenomePropertiesText(this, name, text, true);
  }

  loadGenomePropertiesFile() {
    loadGenomePropertiesFile(this);
  }

  getOrganismNameFromTaxId(taxId) {
    return (
      this.gp_taxonomy &&
      this.gp_taxonomy.nodes &&
      this.gp_taxonomy.nodes[taxId] &&
      this.gp_taxonomy.nodes[taxId].name
    );
  }

  refreshSVGHeight(newHeight) {
    if (newHeight > this.svg.attr("height")) {
      this.svg.attr("height", newHeight);
      this.options.height = newHeight;
      this.update_viewer();
    }
  }

  refresh() {
    transformByScroll(this);
  }
}
