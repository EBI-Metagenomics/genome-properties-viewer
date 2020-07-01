import * as d3 from "./d3";

export const createGradient = viewer => {
  const defs = viewer.svg.append("defs");
  const gradient_d = defs
    .append("linearGradient")
    .attr("id", "gradientdown")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");
  gradient_d
    .append("stop")
    .attr("offset", "85%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 1);
  gradient_d
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 0.5);
  const gradient_u = defs
    .append("linearGradient")
    .attr("id", "gradientup")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");
  gradient_u
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 0.7);
  gradient_u
    .append("stop")
    .attr("offset", "35%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 1);
};

export const drawMasks = viewer => {
  const ph = viewer.options.total_panel_height;
  viewer.masks = viewer.svg.append("g").attr("class", "masks");
  viewer.masks
    .append("rect")
    .attr("class", "tree-background background")
    .style("fill", "url(#gradientdown)")
    .attr("x", -viewer.options.margin.left)
    .attr("y", -viewer.options.margin.top)
    .attr(
      "width",
      viewer.options.treeSpace + ph
    )
    .attr("height", viewer.options.height + viewer.options.margin.top);
  viewer.svg
    .insert("rect", ":first-child")
    .attr("class", "event-mask background")
    .style("opacity", 0)
    .attr("x", viewer.options.treeSpace)
    .attr("y", 0)
    .attr(
      "width",
      viewer.options.width - viewer.options.treeSpace
    )
    .attr("height", viewer.options.height - viewer.options.margin.bottom - ph);
  viewer.masks
    .append("rect")
    .attr("class", "total-background background")
    .style("fill", "url(#gradientup)")
    .attr("x", viewer.options.width - ph / 2)
    .attr("y", -viewer.options.margin.top)
    .attr(
      "width", viewer.options.margin.right + ph / 2
    )
    .attr("height", viewer.options.height + viewer.options.margin.top);
};

export const updateMasks = viewer => {
  const ph = viewer.options.total_panel_height;
  viewer.masks
    .select(".total-background")
    .attr("y", -viewer.options.margin.top)
    .attr(
      "width", viewer.options.margin.right + ph / 2
    )
    .attr("height", viewer.options.height + viewer.options.margin.top);
  viewer.svg
    .select(".event-mask background")
    .attr(
      "width",
      viewer.options.width - viewer.options.treeSpace
    )
    .attr("height", viewer.options.height - viewer.options.margin.bottom - ph);
  viewer.masks
    .select(".tree-background")
    .attr("y", -viewer.options.treeSpace)
    .attr(
      "width",
        viewer.options.treeSpace + ph
    )
    .attr("height", viewer.options.height + viewer.options.margin.top);
};

export const drawDragArea = viewer => {
  const offset = 35;
  const zoom_height = 90;
  const g = viewer.svg
    .append("g")
    .attr("class", "height-dragger")
    .attr("transform", `translate(${viewer.options.treeSpace - viewer.options.cell_side}, -${viewer.options.margin.top})`)
    .call(
      d3
        .drag()
        .on("drag", () => {
          viewer.options.margin.dx = Math.min(
            Math.max(-viewer.options.treeSpace + d3.event.x, zoom_height - viewer.options.treeSpace),
            viewer.options.width - viewer.options.treeSpace
          );
          g.attr(
            "transform",
            `translate(${viewer.options.margin.dx + viewer.options.treeSpace}, -${viewer.options.margin.top})`
          );
        })
        .on("end", () => {
          const new_width = viewer.options.treeSpace + viewer.options.margin.dx;
          if (isNaN(new_width)) return;
          viewer.gp_taxonomy.dipatcher.call(
            "changeHeight",
            viewer.gp_taxonomy,
            new_width
          );
          g.attr("transform", `translate(${viewer.options.treeSpace - viewer.options.cell_side}, -${viewer.options.margin.top})`);
          viewer.gp_taxonomy.height = viewer.options.treeSpace;
          viewer.gp_taxonomy.y = -viewer.options.margin.top;
          viewer.gp_taxonomy.update_tree();
        })
    );
  const side = viewer.options.cell_side / 2;
  g.append("rect")
    .attr("y", -side / 2)
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
