import * as d3 from "./d3";

const SCROLLER_WIDTH = 10;

export const transformByScroll = (viewer) => {
  viewer.newRows.attr(
    "transform",
    () => `translate(${viewer.current_scroll.x}, ${viewer.current_scroll.y})`
  );
  viewer.newCols.attr(
    "transform",
    `translate(${viewer.current_scroll.x}, ${viewer.current_scroll.y})`
  );
  viewer.options.dimensions.total.short_side = viewer.options.cell_side;
  viewer.gp_taxonomy.y = viewer.options.dimensions.total.short_side;
  viewer.update_viewer();
};

export const drawScrollXBar = (viewer) => {
  viewer.scrollbar_x_g = viewer.mainGroup
    .append("g")
    .attr("class", "gpv-scrollbar")
    .attr(
      "transform",
      `translate(${
        viewer.options.dimensions.tree.width // at the right of the tree
      }, ${viewer.options.height - SCROLLER_WIDTH})`
    );

  viewer.scrollbar_x_bg = viewer.scrollbar_x_g
    .append("rect")
    .attr("class", "gpv-scrollbar-bg")
    .attr("width", viewer.options.width - viewer.options.dimensions.tree.width)
    .attr("height", SCROLLER_WIDTH);

  let selectedXBar = null;
  viewer.scrollbar_x = viewer.scrollbar_x_g
    .append("rect")
    .attr("class", "gpv-scrollbar-handle")
    .attr("width", viewer.options.width - viewer.options.dimensions.tree.width)
    .attr("height", SCROLLER_WIDTH)
    .attr("rx", SCROLLER_WIDTH / 2)
    .attr("ry", SCROLLER_WIDTH / 2)
    .style("cursor", "ew-resize")
    .call(
      d3
        .drag()
        .on("start", (event) => (selectedXBar = event.sourceEvent.target))
        .on("end", () => {
          viewer.skip_scroll_refreshing = false;
          selectedXBar = null;
        })
        .on("drag", (event) => {
          viewer.skip_scroll_refreshing = true;
          event.sourceEvent.stopPropagation();
          const propertiesWidth = viewer.x(viewer.props.length);
          const prevX = Number(selectedXBar.getAttribute("x"));
          let nextX = prevX + event.dx;
          const available_x =
            viewer.options.width - viewer.options.dimensions.tree.width;

          nextX = Math.max(
            0,
            Math.min(nextX, available_x - selectedXBar.getAttribute("width"))
          );

          viewer.scrollbar_x.attr("x", nextX);
          const dx = (-nextX * propertiesWidth) / available_x;
          viewer.current_scroll.x = Math.min(
            0,
            dx
            // Math.max(dx, -propertiesWidth + available_x)
          );
          transformByScroll(viewer);
        })
    );
};

const updateScrollBarX = (viewer, visible_cols, current_col) => {
  const total_cols = viewer.props.length;
  viewer.scrollbar_x_g.attr(
    "transform",
    `translate(${viewer.options.dimensions.tree.width}, ${
      viewer.options.height - SCROLLER_WIDTH
    })`
  );

  const available_x =
    viewer.options.width -
    viewer.options.dimensions.tree.width -
    viewer.options.dimensions.total.short_side;
  viewer.scrollbar_x
    .transition()
    .attr(
      "width",
      available_x *
        Math.min(1, total_cols !== 0 ? visible_cols / total_cols : 1)
    )
    .attr("x", total_cols ? (current_col * available_x) / total_cols : 0);
  viewer.scrollbar_x_bg.attr("width", available_x);
};

export const updateScrollBars = (viewer, visible_cols, current_col) => {
  updateScrollBarX(viewer, visible_cols, current_col);
  // updateScrollBarY(viewer);
};
