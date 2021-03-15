import * as d3 from "./d3";

export const createGradient = (viewer) => {
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
};

export const drawMasks = (viewer) => {
  viewer.masks = viewer.mainGroup.append("g").attr("class", "masks");
  viewer.masks
    .append("rect")
    .attr("class", "tree-background background")
    .style("fill", "url(#gradientleft)")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", viewer.options.dimensions.tree.width)
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
};

export const updateMasks = (viewer) => {
  // const ph = viewer.options.total_panel_height;
  viewer.masks
    .select(".total-background")
    .attr(
      "x",
      viewer.options.width - viewer.options.dimensions.total.short_side * 1.2
    )
    .attr("width", viewer.options.dimensions.total.short_side * 1.2)
    .attr("height", viewer.options.height);
  viewer.masks
    .select(".tree-background")
    .attr("y", 0)
    .attr("width", viewer.options.dimensions.tree.width)
    .attr("height", viewer.options.height);
};

export const drawDragArea = (viewer) => {
  const xLimit = 90;
  let dx = 0;
  const g = viewer.mainGroup
    .append("g")
    .attr("class", "height-dragger")
    .attr("transform", `translate(${viewer.options.dimensions.tree.width}, 0)`)
    .call(
      d3
        .drag()
        .on("drag", (event) => {
          const treeSpace = viewer.options.dimensions.tree.width;
          dx = Math.min(
            Math.max(-treeSpace + event.x, xLimit - treeSpace),
            viewer.options.width - treeSpace
          );
          g.attr("transform", `translate(${dx + treeSpace}, 0)`);
        })
        .on("end", () => {
          const treeSpace = viewer.options.dimensions.tree.width;
          const new_width = treeSpace + dx;
          if (Number.isNaN(new_width)) return;
          viewer.gp_taxonomy.dipatcher.call(
            "changeWidth",
            viewer.gp_taxonomy,
            new_width
          );
          g.attr("transform", `translate(${new_width}, 0)`);
          viewer.gp_taxonomy.width = new_width;
          viewer.gp_taxonomy.update_tree();
        })
    );
  const side = viewer.options.cell_side / 2;
  g.append("rect")
    .attr("x", -side / 2)
    .attr("y", 0)
    .attr("width", side)
    .attr("height", side * 2)
    .style("fill", "transparent");
  for (let index = -1; index < 2; index++) {
    g.append("line")
      .attr("y1", side * 2)
      .attr("x1", (index * side) / 2)
      .attr("x2", (index * side) / 2)
      .style("stroke", "#333");
  }
  g.append("line")
    .attr("class", "height-sizer")
    .attr("y1", viewer.options.height);
};
