import * as d3 from "./d3";

export const transformByScroll = (viewer) => {
  viewer.newRows.attr(
    "transform",
    () => `translate(${viewer.current_scroll.x}, ${viewer.current_scroll.y})`
  );
  viewer.newCols.attr(
    "transform",
    `translate(${viewer.current_scroll.x}, ${viewer.current_scroll.y})`
  );
  viewer.gp_taxonomy.y = viewer.current_scroll.y - viewer.options.margin.top;
  viewer.update_viewer();
};

export const drawScrollXBar = (viewer) => {
  viewer.scrollbar_x_g = viewer.svg
    .append("g")
    .attr("class", "gpv-scrollbar")
    .attr(
      "transform",
      `translate(${viewer.options.treeSpace}, ${
        // at the right of the tree
        viewer.options.height - viewer.options.margin.bottom // under everything and taking the space given in margin.bottom
      })`
    );

  viewer.scrollbar_x_bg = viewer.scrollbar_x_g
    .append("rect")
    .attr("class", "gpv-scrollbar-bg")
    .attr("width", viewer.options.width - viewer.options.treeSpace)
    .attr("height", viewer.options.margin.bottom);

  let selectedBar = null;
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
        .on("start", (event) => (selectedBar = event.sourceEvent.target))
        .on("end", () => {
          viewer.skip_scroll_refreshing = false;
          selectedBar = null;
        })
        .on("drag", (event) => {
          viewer.skip_scroll_refreshing = true;
          event.sourceEvent.stopPropagation();
          const totalWidth = viewer.x(viewer.props.length);
          const prevX = Number(selectedBar.getAttribute("x"));
          const nextX = prevX + event.dx;

          viewer.scrollbar_x.attr(
            "x",
            Math.max(
              0,
              Math.min(
                nextX,
                viewer.options.width -
                  viewer.options.treeSpace -
                  selectedBar.getAttribute("width")
              )
            )
          );
          const dx =
            (-nextX * totalWidth) /
            (viewer.options.width -
              viewer.options.treeSpace -
              selectedBar.getAttribute("width"));
          viewer.current_scroll.x = Math.min(
            0,
            Math.max(
              dx,
              -totalWidth + viewer.options.width - viewer.options.treeSpace
            )
          );
          transformByScroll(viewer);
        })
    );
};

export const drawScrollYBar = (viewer) => {
  viewer.skip_scroll_refreshing = false;
  viewer.scrollbar_g = viewer.svg
    .append("g")
    .attr("class", "gpv-scrollbar")
    .attr(
      "transform",
      `translate(${viewer.options.width + 10}, ${-viewer.options.margin.top})`
    );

  viewer.scrollbar_bg = viewer.scrollbar_g
    .append("rect")
    .attr("class", "gpv-scrollbar-bg")
    .attr("width", 10)
    .attr("height", viewer.options.height + viewer.options.margin.top);

  viewer.scrollbar = viewer.scrollbar_g
    .append("rect")
    .attr("class", "gpv-scrollbar-handle")
    .attr("width", 10)
    .attr("height", viewer.options.height + viewer.options.margin.top)
    .attr("rx", 5)
    .attr("ry", 5)
    .call(
      d3
        .drag()
        .on("end", () => (viewer.skip_scroll_refreshing = false))
        .on("drag", (event) => {
          if (viewer.newCols.node().getBBox().height === 0) return;
          viewer.skip_scroll_refreshing = true;
          event.sourceEvent.stopPropagation();
          const th =
            viewer.newCols.node().getBBox().y +
            viewer.newCols.node().getBBox().height;
          const fh = viewer.options.height + viewer.options.margin.top;
          const prevY = parseInt(
            event.sourceEvent.target.getAttribute("y"),
            10
          );
          const nextY = prevY + event.dy;
          viewer.scrollbar.attr(
            "y",
            Math.max(
              0,
              Math.min(
                nextY,
                fh - event.sourceEvent.target.getAttribute("height")
              )
            )
          );
          const dy =
            (-nextY * th) /
            (fh - event.sourceEvent.target.getAttribute("height"));
          viewer.current_scroll.y = Math.min(
            0,
            Math.max(dy, -th + viewer.options.height)
          );
          // transformByScroll(viewer);
        })
    );
};

export const updateScrollBar = (viewer, visible_cols, current_col) => {
  const total_cols = viewer.props.length;
  viewer.scrollbar_g.attr(
    "transform",
    // "translate(" + (viewer.options.width + 10) + ", 0)"
    `translate(${viewer.options.width + 10}, ${-viewer.options.margin.top})`
  );
  viewer.scrollbar_x_g.attr(
    "transform",
    `translate(${viewer.options.treeSpace}, ${
      viewer.options.height - viewer.options.margin.bottom
    })`
  );

  viewer.scrollbar_x
    // .transition()
    .attr(
      "width",
      (viewer.options.width - viewer.options.treeSpace) *
        Math.min(1, total_cols !== 0 ? visible_cols / total_cols : 1)
    )
    .attr(
      "x",
      total_cols
        ? (current_col * (viewer.options.width - viewer.options.treeSpace)) /
            total_cols
        : 0
    );
  viewer.scrollbar_x_bg.attr(
    "width",
    viewer.options.width - viewer.options.treeSpace
  );

  const th =
    viewer.newCols.node().getBBox().y + viewer.newCols.node().getBBox().height;
  const fh = viewer.options.height + viewer.options.margin.top;
  viewer.scrollbar_bg.attr("height", th);
  viewer.scrollbar
    // .transition()
    .attr("height", fh * Math.min(1, fh / th))
    .attr("y", Math.min(0, th ? (viewer.current_scroll.y * fh) / th : 0));
};
