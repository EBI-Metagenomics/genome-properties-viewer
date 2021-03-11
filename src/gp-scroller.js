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
  // viewer.gp_taxonomy.y = viewer.current_scroll.y - viewer.options.margin.top;
  viewer.update_viewer();
};

export const drawScrollXBar = (viewer) => {
  viewer.scrollbar_x_g = viewer.svg
    .append("g")
    .attr("class", "gpv-scrollbar")
    .attr(
      "transform",
      `translate(${
        viewer.options.dimensions.tree.width // at the right of the tree
      }, ${
        viewer.options.height - SCROLLER_WIDTH // under everything and taking the space given in margin.bottom
      })`
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

// let selectedYBar = null;
// export const drawScrollYBar = (viewer) => {
//   viewer.skip_scroll_refreshing = false;
//   viewer.scrollbar_y_g = viewer.svg
//     .append("g")
//     .attr("class", "gpv-scrollbar")
//     .attr(
//       "transform",
//       `translate(${viewer.options.width + viewer.cell_side}, ${-viewer.options
//         .margin.top})`
//     );

//   viewer.scrollbar_y_bg = viewer.scrollbar_y_g
//     .append("rect")
//     .attr("class", "gpv-scrollbar-bg")
//     .attr("width", SCROLLER_WIDTH)
//     .attr("height", viewer.options.height + viewer.options.margin.top);

//   viewer.scrollbar_y = viewer.scrollbar_y_g
//     .append("rect")
//     .attr("class", "gpv-scrollbar-handle")
//     .attr("width", SCROLLER_WIDTH)
//     .attr("height", viewer.options.height + viewer.options.margin.top)
//     .attr("rx", SCROLLER_WIDTH / 2)
//     .attr("ry", SCROLLER_WIDTH / 2)
//     .call(
//       d3
//         .drag()
//         .on("start", (event) => (selectedYBar = event.sourceEvent.target))
//         .on("end", () => {
//           viewer.skip_scroll_refreshing = false;
//           selectedYBar = null;
//         })
//         .on("drag", (event) => {
//           if (viewer.newCols.node().getBBox().height === 0) return; // no columns hence no scroller
//           viewer.skip_scroll_refreshing = true;
//           event.sourceEvent.stopPropagation();
//           const heatmapHeight =
//             Math.abs(viewer.newCols.node().getBBox().y) +
//             viewer.newCols.node().getBBox().height;
//           const availableHeight =
//             viewer.options.height + viewer.options.margin.top;
//           const prevY = parseInt(selectedYBar.getAttribute("y"), 10);
//           const nextY = prevY + event.dy;
//           viewer.scrollbar_y.attr(
//             "y",
//             Math.max(
//               0,
//               Math.min(
//                 nextY,
//                 availableHeight - selectedYBar.getAttribute("height")
//               )
//             )
//           );
//           const dy =
//             (-nextY * heatmapHeight) /
//             (availableHeight - selectedYBar.getAttribute("height"));
//           viewer.current_scroll.y = Math.min(
//             0,
//             Math.max(dy, -heatmapHeight + viewer.options.height)
//           );
//           transformByScroll(viewer);
//         })
//     );
// };

const updateScrollBarX = (viewer, visible_cols, current_col) => {
  const total_cols = viewer.props.length;
  viewer.scrollbar_x_g.attr(
    "transform",
    `translate(${viewer.options.dimensions.tree.width}, ${
      viewer.options.height - SCROLLER_WIDTH
    })`
  );

  const available_x =
    viewer.options.width - viewer.options.dimensions.tree.width;
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

// const updateScrollBarY = (viewer) => {
//   viewer.scrollbar_y_g.attr(
//     "transform",
//     // "translate(" + (viewer.options.width + 10) + ", 0)"
//     `translate(${viewer.options.width + SCROLLER_WIDTH}, ${-viewer.options
//       .margin.top})`
//   );

//   const th =
//     viewer.newCols.node().getBBox().y + viewer.newCols.node().getBBox().height;
//   const fh = viewer.options.height + viewer.options.margin.top;
//   viewer.scrollbar_y_bg.attr("height", th);
//   viewer.scrollbar_y
//     .transition()
//     .attr("height", fh * Math.min(1, fh / th))
//     .attr("y", Math.min(0, th ? (viewer.current_scroll.y * fh) / th : 0));
// };

export const updateScrollBars = (viewer, visible_cols, current_col) => {
  updateScrollBarX(viewer, visible_cols, current_col);
  // updateScrollBarY(viewer);
};
