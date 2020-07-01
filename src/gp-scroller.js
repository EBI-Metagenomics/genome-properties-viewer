import * as d3 from "./d3";

export const drawScrollXBar = viewer => {
  viewer.scrollbar_x_g = viewer.svg
    .append("g")
    .attr("class", "gpv-scrollbar")
    .attr(
      "transform",
      "translate(" + viewer.options.treeSpace + ", " +
        (viewer.options.height - viewer.options.margin.bottom) +
        ")"
    );

  viewer.scrollbar_x_bg = viewer.scrollbar_x_g
    .append("rect")
    .attr("class", "gpv-scrollbar-bg")
    .attr("width", viewer.options.width - viewer.options.treeSpace)
    .attr("height", viewer.options.margin.bottom);

  viewer.scrollbar_x = viewer.scrollbar_x_g
    .append("rect")
    .attr("class", "gpv-scrollbar-handle")
    .attr("width", viewer.options.width - viewer.options.treeSpace)
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
          // const w = Number(viewer.options.width);
          // const sw = Number(this.getAttribute("width"));
          // const x = Number(this.getAttribute("x"));
          // // const w1 = viewer.rows.node().getBBox().width;
          // const w1 = viewer.newRows.node().getBBox().width;
          // const dx = Math.max(
          //   0,
          //   Math.min(x + d3.event.dx, viewer.options.width - sw)
          // );
          //
          // viewer.scrollbar_x.attr("x", dx);
          //
          // viewer.current_scroll.x = ((w - sw - dx) * w1) / w;
          // transformByScroll(viewer);

            const tw = viewer.x(viewer.props.length);
            const prevX = Number(this.getAttribute("x"));
            const nextX = prevX + d3.event.dx;

            viewer.scrollbar_x.attr(
                "x",
                Math.max(
                    0,
                    Math.min(
                        nextX,
                        viewer.options.width - viewer.options.treeSpace - this.getAttribute("width")
                    )
                )
            );
            let dx =
                (-nextX * tw) /
                (viewer.options.width - viewer.options.treeSpace - this.getAttribute("width"));
            viewer.current_scroll.x = Math.min(
                0,
                Math.max(dx, -tw + viewer.options.width - viewer.options.treeSpace)
            );
            transformByScroll(viewer);
        })
    );
};

export const drawScrollYBar = viewer => {
  viewer.skip_scroll_refreshing = false;
  viewer.scrollbar_g = viewer.svg
    .append("g")
    .attr("class", "gpv-scrollbar")
    // .attr("transform", "translate(" + (viewer.options.width + 10) + ", 0)");
    .attr("transform", "translate(" + (viewer.options.width + 10) + ", " + (-viewer.options.margin.top) + ")");

  viewer.scrollbar_bg = viewer.scrollbar_g
    .append("rect")
    .attr("class", "gpv-scrollbar-bg")
    .attr("width", 10)
    .attr("height", viewer.options.height);
    // .attr("height", viewer.options.height + viewer.options.margin.top);

  viewer.scrollbar = viewer.scrollbar_g
    .append("rect")
    .attr("class", "gpv-scrollbar-handle")
    .attr("width", 10)
    .attr("height", viewer.options.height)
    // .attr("height", viewer.options.height + viewer.options.margin.top)
    .attr("rx", 5)
    .attr("ry", 5)
    .call(
      d3
        .drag()
        .on("end", () => (viewer.skip_scroll_refreshing = false))
        .on("drag", function() {
            const h = Number(viewer.options.height);
            // const h = Number(viewer.options.height + viewer.options.margin.top);
            const sh = Number(this.getAttribute("height"));
            const y = Number(this.getAttribute("y"));
            const h1 = viewer.newCols.node().getBBox().height;
            const dy = Math.max(
              0,
              Math.min(y + d3.event.dy, viewer.options.height - sh)
              // Math.min(y + d3.event.dy, viewer.options.height + viewer.options.margin.top - sh)
            );

            viewer.scrollbar.attr("y", dy);

            viewer.current_scroll.y = ((h - sh - dy) * h1) / h;
            transformByScroll(viewer);

          // if (viewer.props.length === 0)
          //   return;
          // viewer.skip_scroll_refreshing = true;
          // d3.event.sourceEvent.stopPropagation();
          // const th = viewer.y(viewer.props.length);
          // const prevY = parseInt(this.getAttribute("y"));
          // const nextY = prevY + d3.event.dy;
          // viewer.scrollbar.attr(
          //   "y",
          //   Math.max(
          //     0,
          //     Math.min(
          //       nextY,
          //       viewer.options.height - this.getAttribute("height")
          //     )
          //   )
          // );
          // let dy =
          //   (-nextY * th) /
          //   (viewer.options.height - this.getAttribute("height"));
          // viewer.current_scroll.y = Math.min(
          //   0,
          //   Math.max(dy, -th + viewer.options.height - viewer.options.cell_side)
          // );
          // transformByScroll(viewer);
        })
    );
};

export const transformByScroll = viewer => {
  viewer.newRows.attr(
    "transform",
    () =>
      "translate(" +
      viewer.current_scroll.x +
      ", " +
      viewer.current_scroll.y +
      ")"
  );
  viewer.newCols.attr(
    "transform",
    "translate(" + viewer.current_scroll.x + ", 0)"
  );
  viewer.gp_taxonomy.y = viewer.current_scroll.y - viewer.options.margin.top;
  viewer.update_viewer();
};


export const updateScrollBar = (viewer, visible_cols, current_col) => {
  const total_cols = viewer.props.length;
  viewer.scrollbar_g.attr(
    "transform",
      // "translate(" + (viewer.options.width + 10) + ", 0)"
      "translate(" + (viewer.options.width + 10) + ", " + (-viewer.options.margin.top) + ")"
);
  viewer.scrollbar_x_g.attr(
    "transform",
    "translate("+ viewer.options.treeSpace + ", " + (viewer.options.height - viewer.options.margin.bottom) + ")"
  );

  viewer.scrollbar_x
    .transition()
    .attr(
      "width",
        (viewer.options.width - viewer.options.treeSpace) *
      Math.min(1, total_cols !== 0 ? visible_cols / total_cols : 1)
    )
    .attr(
      "x",
      total_cols ? (current_col * (viewer.options.width - viewer.options.treeSpace)) / total_cols : 0
    );
  viewer.scrollbar_x_bg.attr("width", viewer.options.width - viewer.options.treeSpace);
  viewer.scrollbar_bg.attr("height", viewer.options.height);
  // viewer.scrollbar_bg.attr("height", viewer.options.height + viewer.options.margin.top);

  const sh = Number(viewer.scrollbar.node().getBBox().height);
  const h1 = viewer.newCols.node().getBBox().height;
  const h = viewer.options.height;
  // const h = viewer.options.height + viewer.options.margin.top;
  const factor = h1 > h ? h / h1 : 1;
  const ph = Number(viewer.scrollbar.attr("height"));

  viewer.scrollbar
    .transition().attr("y", h - sh - viewer.current_scroll.y * h/h1);

  if (Math.abs(ph - h * factor) > 0.2) {
    viewer.current_scroll.y = 0;
    viewer.scrollbar.transition().attr("height", h * factor);
    viewer.scrollbar.attr("y", h * (1 - factor));
  }
};
