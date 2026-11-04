import * as d3 from "./d3";
/**
 * Updates this and other components as if a scroll event happened.
 * It became the de-facto refresh of the whole viewer, as it groups the minimum necesary changes to trigger a full update.
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 */
export const transformByScroll = (viewer) => {
  viewer.newRows.attr(
    "transform",
    () => `translate(${viewer.current_scroll.x}, ${viewer.current_scroll.y})`
  );
  viewer.newCols.attr(
    "transform",
    `translate(${viewer.current_scroll.x}, ${viewer.current_scroll.y})`
  );
  if (viewer.labelGroup) {
    viewer.labelGroup.attr(
      "transform",
      `translate(0, ${viewer.current_scroll.y})`
    );
  }
  viewer.options.dimensions.total.short_side = viewer.options.cell_side;
  viewer.update_viewer();
};

/**
 * Append a group into the viewer's mainGroup.
 * It contains the elements to draw a simple horizontal srollbar, and attach the dragging events to them.
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 */
export const drawScrollXBar = (viewer) => {
  const scrollerShortSide = viewer.options.dimensions.scroller.short_side;
  viewer.scrollbar_x_g = viewer.mainGroup
    .append("g")
    .attr("class", "gpv-scrollbar gpv-scrollbar-x")
    .attr("opacity", 0);

  viewer.scrollbar_x_bg = viewer.scrollbar_x_g
    .append("rect")
    .attr("class", "gpv-scrollbar-bg")
    .attr("height", scrollerShortSide);

  let selectedXBar = null;
  viewer.scrollbar_x = viewer.scrollbar_x_g
    .append("rect")
    .attr("class", "gpv-scrollbar-handle")
    .attr("height", scrollerShortSide - 2)
    .attr("y", 1)
    .attr("rx", scrollerShortSide / 2)
    .attr("ry", scrollerShortSide / 2)
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
          const speciesWidth =
            (viewer.organisms?.length || 0) * viewer.options.cell_side;
          const prevX = Number(selectedXBar.getAttribute("x"));
          let nextX = prevX + event.dx;
          const available_x = viewer.heatmapWidth();

          nextX = Math.max(
            0,
            Math.min(nextX, available_x - selectedXBar.getAttribute("width"))
          );

          viewer.scrollbar_x.attr("x", nextX);
          const dx = (-nextX * speciesWidth) / available_x;
          viewer.current_scroll.x = Math.min(0, dx);
          transformByScroll(viewer);
        })
    );

  viewer.scrollbar_y_g = viewer.mainGroup
    .append("g")
    .attr("class", "gpv-scrollbar gpv-scrollbar-y")
    .attr("opacity", 0);

  viewer.scrollbar_y_bg = viewer.scrollbar_y_g
    .append("rect")
    .attr("class", "gpv-scrollbar-bg")
    .attr("width", scrollerShortSide);

  let selectedYBar = null;
  viewer.scrollbar_y = viewer.scrollbar_y_g
    .append("rect")
    .attr("class", "gpv-scrollbar-handle")
    .attr("width", scrollerShortSide - 2)
    .attr("x", 1)
    .attr("rx", scrollerShortSide / 2)
    .attr("ry", scrollerShortSide / 2)
    .style("cursor", "ns-resize")
    .call(
      d3
        .drag()
        .on("start", (event) => (selectedYBar = event.sourceEvent.target))
        .on("end", () => {
          viewer.skip_scroll_refreshing = false;
          selectedYBar = null;
        })
        .on("drag", (event) => {
          viewer.skip_scroll_refreshing = true;
          event.sourceEvent.stopPropagation();
          const propsHeight = viewer.y(viewer.props?.length || 0) || 0;
          const prevY = Number(selectedYBar.getAttribute("y"));
          let nextY = prevY + event.dy;
          const available_y = viewer.heatmapHeight();

          nextY = Math.max(
            0,
            Math.min(nextY, available_y - selectedYBar.getAttribute("height"))
          );

          viewer.scrollbar_y.attr("y", nextY);
          const dy = (-nextY * propsHeight) / available_y;
          viewer.current_scroll.y = Math.min(0, dy);
          transformByScroll(viewer);
        })
    );
};

const updateScrollBarX = (viewer, visible_cols, current_col) => {
  const total_cols = viewer.organisms.length;
  const available_x = viewer.heatmapWidth();
  viewer.scrollbar_x_g
    .attr(
      "transform",
      `translate(${viewer.heatmapLeft}, ${
        viewer.options.height - viewer.options.dimensions.scroller.short_side
      })`
    )
    .attr("opacity", total_cols > 0 ? 1 : 0);

  viewer.scrollbar_x
    .transition()
    .attr(
      "width",
      available_x *
        Math.min(1, total_cols !== 0 ? visible_cols / Math.max(total_cols, 1) : 1)
    )
    .attr("x", total_cols ? (current_col * available_x) / total_cols : 0);
  viewer.scrollbar_x_bg.attr("width", available_x);
};

const updateScrollBarY = (viewer, visible_rows, current_row) => {
  const total_rows = viewer.props.length;
  const available_y = viewer.heatmapHeight();
  viewer.scrollbar_y_g
    .attr(
      "transform",
      `translate(${
        viewer.options.width - viewer.options.dimensions.scroller.short_side
      }, ${viewer.heatmapTop})`
    )
    .attr("opacity", total_rows > 0 ? 1 : 0);

  viewer.scrollbar_y
    .transition()
    .attr(
      "height",
      available_y *
        Math.min(1, total_rows !== 0 ? visible_rows / Math.max(total_rows, 1) : 1)
    )
    .attr("y", total_rows ? (current_row * available_y) / total_rows : 0);
  viewer.scrollbar_y_bg.attr("height", available_y);
};

/**
 * A single method to trigger the update of all the scroll bars of the viewer.
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 * @param {Number} visible_rows - Visible property rows in the heatmap.
 * @param {Number} current_row - Index of the first visible property.
 */
export const updateScrollBars = (viewer, visible_rows, current_row) => {
  const visible_cols = Math.min(
    viewer.organisms.length,
    Math.ceil(viewer.heatmapWidth() / viewer.options.cell_side)
  );
  const current_col = Math.round(
    Math.abs(viewer.current_scroll.x) / viewer.options.cell_side
  );
  updateScrollBarX(viewer, visible_cols, current_col);
  updateScrollBarY(viewer, visible_rows, current_row);
};
