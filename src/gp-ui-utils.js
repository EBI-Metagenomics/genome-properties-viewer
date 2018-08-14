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
      viewer.options.width +
        viewer.options.margin.left +
        viewer.options.margin.right
    )
    .attr("height", viewer.options.margin.top);
  viewer.svg
    .insert("rect", ":first-child")
    .attr("class", "event-mask background")
    .style("opacity", 0)
    .attr("x", -viewer.options.margin.left)
    .attr("y", 0)
    .attr(
      "width",
      viewer.options.width +
        viewer.options.margin.left +
        viewer.options.margin.right
    )
    .attr("height", viewer.options.height - viewer.options.margin.bottom - ph);
  viewer.masks
    .append("rect")
    .attr("class", "total-background background")
    .style("fill", "url(#gradientup)")
    .attr("x", -viewer.options.margin.left)
    .attr("y", viewer.options.height - viewer.options.margin.bottom - ph)
    .attr(
      "width",
      viewer.options.width +
        viewer.options.margin.left +
        viewer.options.margin.right
    )
    .attr("height", ph * 2);
};

export const updateMasks = viewer => {
  const ph = viewer.options.total_panel_height;
  viewer.masks
    .select(".total-background")
    .attr("y", viewer.options.height - viewer.options.margin.bottom - ph)
    .attr(
      "width",
      viewer.options.width +
        viewer.options.margin.left +
        viewer.options.margin.right
    )
    .attr("height", ph * 2);
  viewer.svg
    .select(".event-mask background")
    .attr(
      "width",
      viewer.options.width +
        viewer.options.margin.left +
        viewer.options.margin.right
    )
    .attr("height", viewer.options.height - viewer.options.margin.bottom - ph);
  viewer.masks
    .select(".tree-background")
    .attr("y", -viewer.options.margin.top)
    .attr(
      "width",
      viewer.options.width +
        viewer.options.margin.left +
        viewer.options.margin.right
    )
    .attr("height", viewer.options.margin.top);
};

export const drawDragArea = viewer => {
  const offset = 35;
  const zoom_height = 90;
  const g = viewer.svg
    .append("g")
    .attr("class", "height-dragger")
    .attr("transform", `translate(${-offset}, 0)`)
    .call(
      d3
        .drag()
        .on("drag", () => {
          viewer.options.margin.dy = Math.min(
            Math.max(d3.event.y, zoom_height - viewer.options.margin.top),
            viewer.options.height - viewer.options.margin.bottom
          );
          g.attr(
            "transform",
            `translate(${-offset}, ${viewer.options.margin.dy})`
          );
        })
        .on("end", () => {
          const new_height =
            viewer.options.margin.top + viewer.options.margin.dy;
          if (isNaN(new_height)) return;
          viewer.gp_taxonomy.dipatcher.call(
            "changeHeight",
            viewer.gp_taxonomy,
            new_height
          );
          g.attr("transform", `translate(${-offset}, 0)`);
          viewer.gp_taxonomy.height = viewer.options.margin.top;
          viewer.gp_taxonomy.y = -viewer.gp_taxonomy.height;
          viewer.gp_taxonomy.update_tree();
        })
    );
  const side = viewer.options.cell_side / 2;
  g.append("rect")
    .attr("y", -side / 2)
    .attr("width", side * 2)
    .attr("height", side)
    .style("fill", "transparent");
  for (let index = -1; index < 2; index++) {
    g.append("line")
      .attr("x1", side * 2)
      .attr("y1", (index * side) / 2)
      .attr("y2", (index * side) / 2)
      .style("stroke", "#333");
  }
  g.append("line")
    .attr("class", "height-sizer")
    .attr("x1", viewer.options.width);
};
