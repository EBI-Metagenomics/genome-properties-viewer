import * as d3 from "./d3";

export const drawScrollXBar = viewer => {
  viewer.scrollbar_x_g = viewer.svg
    .append("g")
    .attr("class", "gpv-scrollbar")
    .attr(
      "transform",
      "translate(0," +
        (viewer.options.height - viewer.options.margin.bottom) +
        ")"
    );

  viewer.scrollbar_x_bg = viewer.scrollbar_x_g
    .append("rect")
    .attr("class", "gpv-scrollbar-bg")
    .attr("width", viewer.options.width)
    .attr("height", viewer.options.margin.bottom);

  viewer.scrollbar_x = viewer.scrollbar_x_g
    .append("rect")
    .attr("class", "gpv-scrollbar-handle")
    .attr("width", viewer.options.width)
    .attr("height", viewer.options.margin.bottom)
    .attr("rx", 5)
    .attr("ry", 5)
    .style("cursor", "ew-resize")
    .call(
      d3
        .drag()
        .on("end", () => (viewer.skip_scroll_refreshing = false))
        .on("drag", function() {
          viewer.skip_scroll_refreshing = true;
          d3.event.sourceEvent.stopPropagation();
          const w = Number(viewer.options.width);
          const sw = Number(this.getAttribute("width"));
          const x = Number(this.getAttribute("x"));
          const w1 = viewer.rows.node().getBBox().width;
          const dx = Math.max(
            0,
            Math.min(x + d3.event.dx, viewer.options.width - sw)
          );

          viewer.scrollbar_x.attr("x", dx);

          viewer.current_scroll.x = ((w - sw - dx) * w1) / w;
          transformByScroll(viewer);
        })
    );
};

export const drawScrollYBar = viewer => {
  viewer.skip_scroll_refreshing = false;
  viewer.scrollbar_g = viewer.svg
    .append("g")
    .attr("class", "gpv-scrollbar")
    .attr("transform", "translate(" + (viewer.options.width + 10) + ", 0)");

  viewer.scrollbar_bg = viewer.scrollbar_g
    .append("rect")
    .attr("class", "gpv-scrollbar-bg")
    .attr("width", 10)
    .attr("height", viewer.options.height);

  viewer.scrollbar = viewer.scrollbar_g
    .append("rect")
    .attr("class", "gpv-scrollbar-handle")
    .attr("width", 10)
    .attr("height", viewer.options.height)
    .attr("rx", 5)
    .attr("ry", 5)
    .call(
      d3
        .drag()
        .on("end", () => (viewer.skip_scroll_refreshing = false))
        .on("drag", function() {
          viewer.skip_scroll_refreshing = true;
          d3.event.sourceEvent.stopPropagation();
          const th = viewer.y(viewer.props.length);
          const prevY = parseInt(this.getAttribute("y"));
          const nextY = prevY + d3.event.dy;
          viewer.scrollbar.attr(
            "y",
            Math.max(
              0,
              Math.min(
                nextY,
                viewer.options.height - this.getAttribute("height")
              )
            )
          );
          let dy =
            (-nextY * th) /
            (viewer.options.height - this.getAttribute("height"));
          viewer.current_scroll.y = Math.min(
            0,
            Math.max(dy, -th + viewer.options.height - viewer.options.cell_side)
          );
          transformByScroll(viewer);
        })
    );
};

export const transformByScroll = viewer => {
  viewer.rows.attr(
    "transform",
    () =>
      "translate(" +
      viewer.current_scroll.x +
      ", " +
      viewer.current_scroll.y +
      ")"
  );
  viewer.cols.attr(
    "transform",
    "translate(" + viewer.current_scroll.x + ", 0)"
  );
  viewer.gp_taxonomy.x = viewer.current_scroll.x;
  viewer.update_viewer();
};


export const updateScrollBar = (viewer, visible_rows, current_row) => {
  const total_rows = viewer.props.length;
  viewer.scrollbar_g.attr(
    "transform",
    "translate(" + (viewer.options.width + 10) + ", 0)"
  );
  viewer.scrollbar_x_g.attr(
    "transform",
    "translate(0," + (viewer.options.height - viewer.options.margin.bottom) + ")"
  );

  viewer.scrollbar
    .transition()
    .attr(
      "height",
      viewer.options.height *
      Math.min(1, total_rows !== 0 ? visible_rows / total_rows : 1)
    )
    .attr(
      "y",
      total_rows ? (current_row * viewer.options.height) / total_rows : 0
    );
  viewer.scrollbar_x_bg.attr("width", viewer.options.width);
  viewer.scrollbar_bg.attr("height", viewer.options.height);

  const w1 = viewer.rows.node().getBBox().width;
  const w2 = viewer.options.width;
  const factor = w1 > w2 ? w2 / w1 : 1;
  const pw = Number(viewer.scrollbar_x.attr("width"));
  if (Math.abs(pw - w2 * factor) > 0.2) {
    viewer.current_scroll.x = 0;
    viewer.scrollbar_x.transition().attr("width", w2 * factor);
    viewer.scrollbar_x.attr("x", w2 * (1 - factor));
  }
}
