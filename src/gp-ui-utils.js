import * as d3 from "./d3";
/**
 * Appends a `defs` element in the main group of the viewer.
 * It contains the definitions of the gradients used in th masks around the heatmap
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 */
export const createGradient = (viewer) => {
  const uid = `gpv-${Math.random().toString(36).slice(2, 8)}`;
  viewer.heatmapClipId = `${uid}-heatmap`;
  viewer.treeClipId = `${uid}-tree`;
  const defs = viewer.mainGroup.append("defs");
  const gradient_left = defs
    .append("linearGradient")
    .attr("id", "gradientleft")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");
  gradient_left
    .append("stop")
    .attr("offset", "85%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 1);
  gradient_left
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 0.5);
  const gradient_top = defs
    .append("linearGradient")
    .attr("id", "gradienttop")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");
  gradient_top
    .append("stop")
    .attr("offset", "85%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 1);
  gradient_top
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 0.5);
  const gradient_right = defs
    .append("linearGradient")
    .attr("id", "gradientright")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");
  gradient_right
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 0);
  gradient_right
    .append("stop")
    .attr("offset", "15%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 0.5);
  gradient_right
    .append("stop")
    .attr("offset", "35%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 1);
  const gradient_bottom = defs
    .append("linearGradient")
    .attr("id", "gradientbottom")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");
  gradient_bottom
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 0);
  gradient_bottom
    .append("stop")
    .attr("offset", "15%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 0.5);
  gradient_bottom
    .append("stop")
    .attr("offset", "35%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 1);

  viewer.heatmapClipPath = defs
    .append("clipPath")
    .attr("id", viewer.heatmapClipId);
  viewer.heatmapClipPath
    .append("rect")
    .attr("x", viewer.heatmapLeft)
    .attr("y", viewer.treeHeight)
    .attr("width", Math.max(1, viewer.heatmapWidth()))
    .attr("height", Math.max(1, viewer.heatmapHeight()));
  viewer.treeClipPath = defs.append("clipPath").attr("id", viewer.treeClipId);
  viewer.treeClipPath
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", Math.max(1, viewer.options.width))
    .attr("height", Math.max(1, viewer.treeHeight));
};

/**
 * Appends a new group element into the mainGroup of the viewer.
 * The group contains masks as rectangles to give the effect of fading around the heatmap
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 */
export const drawMasks = (viewer) => {
  viewer.masks = viewer.mainGroup.append("g").attr("class", "masks");
  viewer.masks
    .append("rect")
    .attr("class", "tree-background background")
    .style("fill", "url(#gradienttop)")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", viewer.options.width)
    .attr("height", viewer.treeHeight);
  viewer.masks
    .append("rect")
    .attr("class", "label-background background")
    .style("fill", "url(#gradientleft)")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", viewer.labelWidth)
    .attr("height", viewer.options.height);
  viewer.masks
    .append("rect")
    .attr("class", "total-background background")
    .style("fill", "url(#gradientright)")
    .attr(
      "x",
      viewer.options.width - viewer.options.dimensions.total.short_side * 1.2
    )
    .attr("y", 0)
    .attr("width", viewer.options.dimensions.total.short_side * 1.2)
    .attr("height", viewer.options.height);
  viewer.masks
    .append("rect")
    .attr("class", "bottom-background background")
    .style("fill", "url(#gradientbottom)")
    .attr("x", 0)
    .attr(
      "y",
      viewer.options.height - viewer.options.dimensions.total.short_side * 1.2
    )
    .attr("width", viewer.options.width)
    .attr("height", viewer.options.dimensions.total.short_side * 1.2);
};

/**
 * Update the size and position of the masks
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 */
export const updateMasks = (viewer) => {
  viewer.masks
    .select(".tree-background")
    .attr("width", viewer.options.width)
    .attr("height", viewer.treeHeight);
  viewer.masks
    .select(".label-background")
    .attr("width", viewer.heatmapAnchor)
    .attr("height", viewer.options.height);
  viewer.masks
    .select(".total-background")
    .attr(
      "x",
      viewer.options.width - viewer.options.dimensions.total.short_side * 1.2
    )
    .attr("width", viewer.options.dimensions.total.short_side * 1.2)
    .attr("height", viewer.options.height);
  viewer.masks
    .select(".bottom-background")
    .attr(
      "y",
      viewer.options.height - viewer.options.dimensions.total.short_side * 1.2
    )
    .attr("width", viewer.options.width)
    .attr("height", viewer.options.dimensions.total.short_side * 1.2);
  if (viewer.heatmapClipPath) {
    viewer.heatmapClipPath
      .select("rect")
      .attr("x", viewer.heatmapLeft)
      .attr("y", viewer.heatmapTop)
      .attr("width", viewer.heatmapWidth())
      .attr("height", viewer.heatmapHeight());
  }
  if (viewer.treeClipPath) {
    viewer.treeClipPath
      .select("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", viewer.options.width)
      .attr("height", viewer.treeHeight);
  }
  viewer.mainGroup
    .select(".height-dragger")
    .attr("transform", `translate(0, ${viewer.treeHeight})`);
  viewer.mainGroup.select(".height-sizer").attr("x2", viewer.options.width);
};

/**
 * Draws a draggable area to redefine the height assigned to the taxonomy tree.
 * @param {GernomeProperiesViewer} viewer - The instance of the genome properites viewer
 */
export const drawDragArea = (viewer) => {
  const yLimit = 80;
  let dy = 0;
  const g = viewer.mainGroup
    .append("g")
    .attr("class", "height-dragger")
    .attr("transform", `translate(0, ${viewer.treeHeight})`)
    .call(
      d3
        .drag()
        .on("drag", (event) => {
          const treeSpace = viewer.options.dimensions.tree.width;
          dy = Math.min(
            Math.max(-treeSpace + event.y, yLimit - treeSpace),
            viewer.options.height - treeSpace - 80
          );
          g.attr("transform", `translate(0, ${dy + treeSpace})`);
        })
        .on("end", () => {
          const treeSpace = viewer.options.dimensions.tree.width;
          const new_height = treeSpace + dy;
          if (Number.isNaN(new_height)) return;
          viewer.gp_taxonomy.dipatcher.call(
            "changeWidth",
            viewer.gp_taxonomy,
            new_height
          );
          g.attr("transform", `translate(0, ${new_height})`);
          viewer.gp_taxonomy.height = new_height;
          viewer.gp_taxonomy.update_tree();
        })
    );
  const side = viewer.options.cell_side / 2;
  g.append("rect")
    .attr("x", 0)
    .attr("y", -side / 2)
    .attr("width", side * 2)
    .attr("height", side)
    .style("fill", "transparent");
  for (let index = -1; index < 2; index++) {
    g.append("line")
      .attr("x1", 0)
      .attr("x2", side * 2)
      .attr("y1", (index * side) / 2)
      .attr("y2", (index * side) / 2)
      .style("stroke", "#333");
  }
  g.append("line")
    .attr("class", "height-sizer")
    .attr("x2", viewer.options.width);
};
