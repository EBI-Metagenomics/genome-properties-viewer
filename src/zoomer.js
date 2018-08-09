"use strict";

import * as d3 from "./d3";

export default class ZoomPanel {
  constructor({
    x = 0,
    y = 0,
    centerX = 17,
    top = 30,
    r = 10,
    padding = 3,
    scrollH = 40,
    scrollW = 10,
    container = null,
    domain = [0, 100],
    function_plus = null,
    function_less = null,
    function_slide = null
  }) {
    this.x = x;
    this.y = y;
    this.centerX = centerX;
    this.top = top;
    this.r = r;
    this.padding = padding;
    this.scrollH = scrollH;
    this.scrollW = scrollW;
    this.container = container;
    this.domain = domain;
    this.function_plus = function_plus;
    this.function_less = function_less;
    this.function_slide = function_slide;
    this.slider = d3
      .scaleLinear()
      .domain(domain)
      .range([top + r + scrollH, top + r + padding]);
  }

  draw_panel() {
    this.zoom_panel = this.container
      .append("g")
      .attr("class", "gpv-zoomer")
      .attr("transform", `translate(${this.x}, ${this.y})`);
    ZoomPanel.add_button(
      this.zoom_panel,
      "+",
      this.centerX,
      this.top,
      this.r
    ).on("click", this.function_plus);
    this.zoom_panel
      .append("line")
      .attr("x1", this.centerX)
      .attr("x2", this.centerX)
      .attr("y1", this.top + this.r + this.padding)
      .attr("y2", this.top + this.r + this.padding + this.scrollH)
      .style("stroke", "lightgrey");
    this.zoomBar = this.zoom_panel
      .append("rect")
      .attr("x", this.centerX - this.scrollW / 2)
      .attr("y", this.slider(this.domain[0]))
      .attr("width", this.scrollW)
      .attr("height", 4)
      .style("cursor", "ns-resize")
      .style("fill", "darkgrey")
      .call(d3.drag().on("drag", this.function_slide));

    ZoomPanel.add_button(
      this.zoom_panel,
      "-",
      this.centerX,
      this.top + 2 * this.r + 2 * this.padding + this.scrollH,
      this.r
    ).on("click", this.function_less);
  }
  static add_button(panel, text, x, y, r) {
    const c = panel
      .append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", r);
    panel
      .append("text")
      .attr("x", x)
      .attr("y", y)
      .text(text);
    return c;
  }
}
