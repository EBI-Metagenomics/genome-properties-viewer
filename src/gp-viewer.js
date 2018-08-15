"use strict";

import GenomePropertiesHierarchy from "./gp-hierarchy";
import GenomePropertiesTaxonomy from "./gp-taxonomy";
import ZoomPanel from "./zoomer";
import GenomePropertiesController from "./gp-controller";
import { updateStepToggler, updateSteps } from "./gp-steps";
import {
  drawScrollXBar,
  drawScrollYBar,
  transformByScroll,
  updateScrollBar
} from "./gp-scroller";
import {
  createGradient,
  drawMasks,
  updateMasks,
  drawDragArea
} from "./gp-ui-utils";

import {
  loadGenomePropertiesFile,
  removeGenomePropertiesFile
} from "./gp-uploader";

import { filterByLegend, filterByHierarchy, filterByText } from "./gp-filters";

import {
  drawTotalPerOrganismPanel,
  updateTotalPerOrganismPanel
} from "./gp-totals";

import * as d3 from "./d3";

export default class GenomePropertiesViewer {
  constructor({
    margin = { top: 180, right: 50, bottom: 10, left: 40 },
    width = null,
    height = null,
    element_selector = "body",
    cell_side = 20,
    total_panel_height = cell_side,
    server = "https://raw.githubusercontent.com/rdfinn/genome-properties/master/flatfiles/gp_assignments/SUMMARY_FILE_{}.gp",
    server_tax = "https://raw.githubusercontent.com/rdfinn/genome-properties/master/flatfiles/taxonomy.json",
    hierarchy_path = "../test-files/hierarchy.json",
    whitelist_path = null,
    controller_element_selector = "#gp-selector",
    legends_element_selector = ".gp-legends",
    gp_text_filter_selector = "#gp-filter",
    gp_label_selector = "#gp_label",
    tax_label_selector = "#tax_label",
    tax_search_selector = "#tax-search",
    template_link_to_GP_page = "https://www.ebi.ac.uk/interpro/genomeproperties/#{}"
  }) {
    this.data = {};
    this.organisms = [];
    this.organism_names = {};
    this.organism_totals = {};
    this.filter_text = "";
    this.whitelist = null;
    this.fixedHeight = height !== null;
    this.propsOrder = null;

    if (width === null) {
      const rect = d3
        .select(element_selector)
        .node()
        .getBoundingClientRect();
      width = rect.width - margin.left - margin.right;
    }

    if (!this.fixedHeight) {
      let rect = d3
        .select(element_selector)
        .node()
        .getBoundingClientRect();
      if (rect.height < 1) {
        d3.select(element_selector).style("flex", "1");
        rect = d3
          .select(element_selector)
          .node()
          .getBoundingClientRect();
      }
      height = rect.height - margin.top - margin.bottom;
    }

    this.options = {
      margin,
      width,
      height,
      element_selector,
      cell_side,
      server,
      server_tax,
      total_panel_height,
      hierarchy_path,
      template_link_to_GP_page
    };
    this.column_total_width = cell_side;
    this.x = d3.scaleBand().range([0, width - this.column_total_width]);
    this.y = d3.scaleLinear().range([0, cell_side]);
    this.gp_values = ["YES", "PARTIAL", "NO"];
    this.c = {
      YES: "rgb(49, 130, 189)",
      PARTIAL: "rgb(107, 174, 214)",
      NO: "rgb(210,210,210)"
    };
    this.current_order = null;

    if (whitelist_path) {
      d3.json(whitelist_path, data => (this.whitelist = data));
    }
    this.svg = d3
      .select(element_selector)
      .append("svg")
      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    this.svg.x = 0;
    this.svg.y = 0;
    createGradient(this);

    this.gp_taxonomy = new GenomePropertiesTaxonomy({
      path: server_tax,
      x: 0,
      y: -this.options.margin.top,
      width: this.options.width,
      height: this.options.margin.top
    })
      .load_taxonomy()
      .on("changeOrder", order => {
        this.current_order = order;
        this.order_organisms_current_order();
      })
      .on("spaciesRequested", taxId => {
        loadGenomePropertiesFile(this, taxId);
      })
      .on("removeSpacies", taxId => {
        d3.event.stopPropagation();
        removeGenomePropertiesFile(this, taxId);
      })
      .on("changeHeight", h => {
        const dh = this.options.margin.top - h;
        this.options.margin.top = h;
        this.options.height += dh;
        // this.y.range([0, this.options.height]);
        this.y.range([0, this.options.cell_side]);
        this.svg.attr(
          "transform",
          "translate(" +
            this.options.margin.left +
            "," +
            this.options.margin.top +
            ")"
        );

        d3.select(".bottom-group").attr(
          "transform",
          "translate(" +
            -this.options.margin.left +
            ", " +
            (this.options.height - this.options.margin.bottom) +
            ")"
        );

        this.update_viewer();
      });

    this.gp_hierarchy = new GenomePropertiesHierarchy()
      .load_hierarchy_from_path(this.options.hierarchy_path)
      .on("siwtchChanged", () => {
        this.svg.y = 0;
        d3.select(".gpv-rows-group").attr(
          "transform",
          "translate(" + this.svg.x + "," + this.svg.y + ")"
        );
        this.update_viewer(false, 500);
        updateTotalPerOrganismPanel(this);
      });
    this.zoomer = new ZoomPanel({
      x: -20,
      y: -this.options.margin.top,
      domain: [20, 200],
      container: this.svg,
      function_plus: () => (this.cell_side = this.options.cell_side + 10),
      function_less: () => (this.cell_side = this.options.cell_side - 10),
      function_slide: () => {
        const newY = Math.max(
          this.zoomer.slider(this.zoomer.domain[1]),
          Math.min(d3.event.y, this.zoomer.slider(this.zoomer.domain[0]))
        );
        this.cell_side = Math.round(this.zoomer.slider.invert(newY));
      }
    });

    this.legends_filter = { YES: "", NO: "", PARTIAL: "" };
    this.gp_label_type = "name";

    this.controller = new GenomePropertiesController({
      gp_element_selector: controller_element_selector,
      legends_element_selector: legends_element_selector,
      gp_text_filter_selector: gp_text_filter_selector,
      gp_label_selector: gp_label_selector,
      tax_label_selector: tax_label_selector,
      tax_search_selector: tax_search_selector,
      gp_viewer: this,
      gp_taxonomy: this.gp_taxonomy,
      hierarchy_contorller: this.gp_hierarchy
    }).on("legendFilterChanged", filters => {
      this.legend_filters = filters;
      this.update_viewer();
    });
    this.gp_taxonomy.on("taxonomyLoaded", () =>
      this.controller.loadSearchOptions()
    );

    this.current_scroll = { x: 0, y: 0 };
    this.draw_rows_panel();
    drawMasks(this);
    this.draw_columns_panel();
    this.gp_taxonomy.draw_tree_panel(this.svg);
    this.zoomer.draw_panel();
    drawTotalPerOrganismPanel(this);
    drawScrollXBar(this);
    drawScrollYBar(this);
    drawDragArea(this);
    window.addEventListener("resize", () => this.refresh_size());
  }
  refresh_size() {
    const margin = this.options.margin;
    d3.select(this.options.element_selector).select("svg");
    const rect = d3
      .select(this.options.element_selector)
      .node()
      .getBoundingClientRect();
    this.options.width =
      rect.width - this.options.margin.left - this.options.margin.right;
    if (!this.fixedHeight)
      this.options.height = rect.height - margin.top - margin.bottom;
    this.gp_taxonomy.width = rect.width - margin.left - margin.right;
    d3.select(this.options.element_selector)
      .select("svg")
      .attr("width", rect.width);
    this.y.range([0, this.options.cell_side]);

    this.update_viewer();
  }
  set cell_side(value) {
    const p = this.options.cell_side;
    this.options.cell_side = Math.max(20, Math.min(200, value));
    if (p !== this.options.cell_side) {
      this.current_scroll.y =
        (this.current_scroll.y * this.options.cell_side) / p;
      this.zoomer.zoomBar.attr("y", this.zoomer.slider(this.options.cell_side));
      this.y.range([0, this.options.cell_side]);
      transformByScroll(this);
    }
  }

  _adjustYScaleBasedOnSteps() {
    if (!this.props) return this.y;
    const side = this.options.cell_side;
    const marks = {
      0: 0,
      1: side
    };

    const newY = d3
      .scaleLinear()
      .domain([0, 1])
      .range([0, side]);
    this.props.forEach((prop, i) => {
      if (prop.isShowingSteps) {
        const prevY = newY(i);

        if (!marks[i]) marks[i] = prevY;
        marks[i + 1] = marks[i] + prop.steps.length * side;
        marks[i + 2] = marks[i + 1] + side;
        const domain = Object.keys(marks)
          .map(Number)
          .sort((a, b) => a - b);
        const range = domain.map(x => marks[x]).map(Number);
        newY.range(range).domain(domain);
      }
    });
    this.y = newY;
  }

  draw_rows_panel() {
    this.rows = this.svg
      .append("g")
      .attr("class", "gpv-rows-group")
      .attr("transform", "translate(0,0)")
      .call(
        d3
          .drag() // Window panning.
          .subject(function() {
            const g = d3.select(this),
              t = g.attr("transform").match(/translate\((.*),(.*)\)/);
            return {
              x: Number(t[1]) + Number(g.attr("x")),
              y: Number(t[2]) + Number(g.attr("y"))
            };
          })
      );
  }

  draw_columns_panel() {
    this.cols = this.svg.append("g").attr("class", "gpv-cols-group");

    this.cols
      .append("text")
      .attr("class", "total_title")
      .attr("x", this.options.width - this.column_total_width * 0.4)
      .attr("y", 3)
      .attr(
        "transform",
        "rotate(-90 " +
          (this.options.width - this.column_total_width / 2) +
          ",0)"
      )
      .attr("opacity", 0)
      .text("TOTAL");
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
      this.update_viewer();
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
  update_viewer(zoom = false, time = 0) {
    this.props = d3.values(this.data);
    filterByHierarchy(this);
    filterByText(this);
    filterByLegend(this);
    this.sort_props();
    this._adjustYScaleBasedOnSteps();

    this.column_total_width = this.options.cell_side;
    this.x.range([
      this.options.width -
        this.column_total_width -
        this.options.cell_side * this.organisms.length,
      this.options.width - this.column_total_width
    ]);

    this.current_props = this.props.filter(
      (gp, i) =>
        this.y(i) + this.current_scroll.y >= 0 &&
        this.y(i) + this.current_scroll.y < this.options.height
    );
    const dy = this.props.indexOf(this.current_props[0]);
    const visible_rows = this.current_props.length;
    this.gp_taxonomy.update_tree(time, this.options.cell_side);
    this.current_order = this.gp_taxonomy.current_order;
    this.organisms = this.gp_taxonomy.get_tax_list();
    this.x.domain(this.current_order);
    const t = d3.transition().duration(time);

    let row_p = this.rows
      .selectAll(".row")
      .data(this.current_props, d => d.property);

    row_p
      .transition(t)
      .attr("transform", (d, i) => "translate(0," + this.y(i + dy) + ")")
      .each((d, i, c) => this.update_row(d, i, c));

    row_p.exit().remove();

    let row = row_p
      .enter()
      .append("g")
      .attr("id", d => "row_" + d.property)
      .attr("class", "row")
      .each((d, i, c) => this.update_row(d, i, c));
    row
      .append("line")
      .attr("class", "puff")
      .attr("x2", this.options.width);
    row
      .attr(
        "transform",
        (d, i) =>
          "translate(0," +
          (this.y(i + dy) +
            ((i > visible_rows / 2 ? 1 : -1) * this.options.height) / 2) +
          ")"
      )
      .transition(t)
      .attr("transform", (d, i) => "translate(0," + this.y(i + dy) + ")");

    d3.selectAll("g.row line")
      .transition()
      .attr("x1", this.x.range()[0]);

    d3.selectAll(".total_title")
      .attr(
        "transform",
        "rotate(-70 " +
          (this.options.width - this.options.cell_side / 2) +
          ",0)"
      )
      .attr("x", this.options.width - this.options.cell_side / 2)
      .attr("opacity", () => (this.organisms.length > 0 ? 1 : 0));

    row_p
      .selectAll(".row_title")
      .attr("x", this.x.range()[0] - 6 - this.options.cell_side)
      .attr("y", this.column_total_width / 2)
      .text(
        d =>
          this.gp_label_type === "name"
            ? d.name
            : this.gp_label_type === "id"
              ? d.property
              : d.property + ":" + d.name
      )
      .call(
        d3
          .drag()
          .on("drag", (d, i, c) => {
            d3.select(c[i]).attr(
              "transform",
              "translate(0, " + d3.event.y + ")"
            );
          })
          .on("end", (d, i, c) => {
            const h = this.options.cell_side;
            let d_row = Math.round(d3.event.y / h);
            d3.select(c[i]).attr("transform", "translate( 0, 0 )");
            this.move_row(d.property, d_row);
          })
      );

    const template = this.options.template_link_to_GP_page;
    row
      .append("a")
      .attr("xlink:href", d => template.replace("{}", d.property))
      .attr("target", "_blank")
      .style("cursor", "pointer")
      .append("text")
      .attr("class", "row_title")
      .attr("x", this.x.range()[0] - 6 - this.options.cell_side)
      .attr("y", this.column_total_width / 2)
      .attr("text-anchor", "end")
      .text(
        d =>
          this.gp_label_type === "name"
            ? d.name
            : this.gp_label_type === "id"
              ? d.property
              : d.property + ":" + d.name
      );

    let column_p = this.cols.selectAll(".column").data(this.organisms, p => p);

    column_p
      .transition()
      .attr("transform", (d, i) => "translate(" + this.x(i) + ")rotate(-90)");

    let column = column_p
      .enter()
      .append("g")
      .attr("class", "column")
      .attr("transform", (d, i) => "translate(" + this.x(i) + ")rotate(-90)");

    column.append("line").attr("x1", -this.options.height);

    updateTotalPerOrganismPanel(this);
    updateMasks(this);
    this.zoomer.zoom_panel.attr(
      "transform",
      "translate(-20," + -this.options.margin.top + ")"
    );
    if (!this.skip_scroll_refreshing) updateScrollBar(this, visible_rows, dy);
  }

  update_row(gp, i, c) {
    const cell_height =
      this.options.cell_side * (gp.isShowingSteps ? gp.steps.length : 1);
    const side = this.options.cell_side;

    const gps = d3
        .select(c[i])
        .selectAll(".top_level_gp")
        .data(gp.parent_top_properties, d => d),
      text_heigth = d3
        .select("text")
        .node()
        .getBBox().height;
    let radius = (side - text_heigth) / 2 - 4;
    if (radius < 2) radius = 2;
    if (radius > 6) radius = 6;

    gps
      .attr(
        "cx",
        (d, i) => this.x.range()[0] - side - 6 - radius - (2 * radius + 2) * i
      )
      .attr("cy", side / 2 + text_heigth / 2 + radius - 2)
      .attr("r", radius);

    gps
      .enter()
      .append("circle")
      .attr("class", "top_level_gp")
      .attr(
        "cx",
        (d, i) => this.x.range()[0] - side - 6 - radius - (2 * radius + 2) * i
      )
      .attr("cy", side / 2 + text_heigth / 2 + radius - 2)
      .attr("r", radius)
      .style("fill", d => this.gp_hierarchy.color(d));

    let cells = d3
      .select(c[i])
      .selectAll(".cell")
      .data(this.organisms, d => d);

    cells
      .transition()
      .attr("x", (d, i) => this.x(i))
      .attr("height", cell_height)
      .attr("width", this.x.bandwidth());

    cells.exit().remove();

    const mouseover = (p, i, c) => {
      d3.select(c[i].parentNode)
        .select("text")
        .classed("active", true);
      d3.selectAll(".node--leaf text").classed("active", d => d.label === p);
      const data = d3.select(c[i].parentNode).data();
      if (data.length < 1) return;

      const info = {
        Property: data[0].property,
        Name: data[0].name,
        Organism: p,
        Value: data[0].values[p]
      };
      if ("TOTAL" === p) {
        this.controller.draw_legends(data[0].values[p]);
        info.Value =
          "TOTAL: {YES: " +
          data[0].values[p]["YES"] +
          ", PARTIAL: " +
          data[0].values[p]["PARTIAL"] +
          ", NO: " +
          data[0].values[p]["NO"] +
          "}";
        info.Organism = "All";
      }
      this.controller.draw_tooltip(info);
    };
    const mouseout = p => {
      d3.selectAll("text").classed("active", false);
      d3.selectAll(".gpv-name").remove();
      this.controller.draw_tooltip();
      if ("TOTAL" === p) this.controller.draw_legends();
    };

    cells
      .enter()
      .insert("rect", ":first-child")
      .attr("class", "cell")
      .attr("x", (d, i) => this.x(i))
      .attr("height", cell_height)
      .attr("width", this.x.bandwidth())
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .style("fill", d => (d in gp.values ? this.c[gp.values[d]] : null));

    const arc_f = d3
      .arc()
      .outerRadius(side * 0.4)
      .innerRadius(0);
    const pie_f = d3.pie().value(d => d.value);

    const cells_t = d3
      .select(c[i])
      .selectAll(".total_cell")
      .data(["TOTAL"], d => d);

    cells_t.attr(
      "transform",
      "translate(" +
        (this.options.width - this.column_total_width / 2) +
        ", " +
        cell_height * 0.5 +
        ")"
    );

    cells_t
      .enter()
      .append("g")
      .attr("class", "total_cell")
      .attr(
        "transform",
        "translate(" +
          (this.options.width - this.column_total_width / 2) +
          ", " +
          cell_height * 0.5 +
          ")"
      )
      .on("mouseover", mouseover)
      .on("mouseout", mouseout);

    const arcs = d3
      .select(c[i])
      .selectAll(".total_cell")
      .selectAll(".arc")
      .data(pie_f(d3.entries(gp.values["TOTAL"])), d => d.data.key);

    arcs.attr("d", arc_f);

    arcs
      .enter()
      .append("path")
      .attr("class", "arc")
      .attr("d", arc_f)
      .style("fill", d => {
        return this.c[d.data.key];
      });
    updateStepToggler(this, gp, c[i], side);
    updateSteps(this, gp, c[i], side);
  }

  order_organisms(value) {
    this.current_order = this.gp_taxonomy.orders[value];
    this.order_organisms_current_order();
  }
  order_organisms_current_order() {
    this.x.domain(this.current_order);
    updateTotalPerOrganismPanel(this, 1000);
    this.update_viewer();
  }

  change_gp_label(type) {
    this.gp_label_type = type;
    this.update_viewer();
  }
}
