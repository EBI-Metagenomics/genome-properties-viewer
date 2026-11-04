import * as d3 from "./d3";

export const drawTotalPerOrganismPanel = (viewer) => {
  viewer.total_g = viewer.mainGroup
    .append("g")
    .attr("class", "total-group")
    .attr("transform", "translate(0,0)");
};

export const drawRowTotalPanel = (viewer) => {
  viewer.row_total_g = viewer.mainGroup
    .append("g")
    .attr("class", "row-total-group");
};

export const refreshGPTotals = (viewer) => {
  for (const prop of viewer.props) {
    const total = {
      NO: 0,
      YES: 0,
      PARTIAL: 0,
    };
    for (const org of viewer.organisms) {
      total[prop.values[org]]++;
    }
    prop.values.TOTAL = total;
  }
};

const refreshOrganismTotals = (viewer) => {
  for (const o of Object.keys(viewer.organism_totals))
    viewer.organism_totals[o] = { YES: 0, NO: 0, PARTIAL: 0 };
  viewer.props.forEach((e) => {
    for (const v of Object.keys(viewer.organism_totals))
      viewer.organism_totals[v][e.values[v]]++;
  });
};

export const updateTotalPerOrganismPanel = (viewer) => {
  viewer.options.total_panel_height = viewer.options.cell_side;
  const ph = viewer.options.total_panel_height;
  const heatmapBottom =
    viewer.heatmapTop +
    Math.min(
      viewer.heatmapHeight(),
      viewer.y(viewer.props?.length || 0) || viewer.heatmapHeight()
    );

  viewer.total_g.attr(
    "transform",
    `translate(${
      viewer.heatmapAnchor + viewer.current_scroll.x
    }, ${heatmapBottom})`
  );

  const arc_f = d3
    .arc()
    .outerRadius(ph * 0.4)
    .innerRadius(0);

  const pie_f = d3.pie().value((d) => d.value);

  refreshOrganismTotals(viewer);

  const cells_t = viewer.total_g.selectAll(".total_cell_org").data(
    d3
      .entries(viewer.organism_totals)
      .sort(
        (a, b) =>
          viewer.organisms.indexOf(a.key) - viewer.organisms.indexOf(b.key)
      ),
    (d) => d.key
  );

  const newX = d3
    .scaleBand()
    .range([0, viewer.organisms.length * viewer.options.cell_side])
    .domain(viewer.current_order || []);

  cells_t.attr(
    "transform",
    (d, i) =>
      `translate(${newX(i) + viewer.options.cell_side / 2}, ${
        viewer.options.cell_side / 2
      })`
  );
  cells_t.exit().remove();

  const g_e = cells_t
    .enter()
    .append("g")
    .attr("class", "total_cell_org")
    .attr(
      "transform",
      (d, i) =>
        `translate(${newX(i) + viewer.options.cell_side / 2}, ${
          viewer.options.cell_side / 2
        })`
    )
    .on("mouseover", (event, p) => {
      d3.selectAll(".node--leaf text").classed(
        "active",
        () => viewer.textContent === p.key
      );
      viewer.controller.draw_tooltip(event, {
        Organism: p.key,
      });
      viewer.controller.draw_legends(p.value);
    })
    .on("mouseout", () => {
      viewer.controller.draw_legends();
      viewer.controller.draw_tooltip();
      d3.selectAll(".node--leaf text").classed("active", false);
    });

  const group = g_e.size() ? g_e : cells_t;
  const arcs = group.selectAll(".arc").data((d) => pie_f(d3.entries(d.value)));

  arcs.attr("d", arc_f).attr("transform", "scale(1)");

  arcs
    .enter()
    .append("path")
    .attr("class", "arc")
    .attr("d", arc_f)
    .style("fill", (d) => viewer.c[d.data.key]);
};

export const updateRowTotalPanel = (viewer) => {
  if (!viewer.row_total_g) return;
  const side = viewer.options.cell_side;
  const dataWidth = (viewer.organisms?.length || 0) * side;
  const pieOffset = viewer.organisms?.length
    ? Math.min(dataWidth, viewer.heatmapWidth())
    : 0;

  viewer.row_total_g.attr(
    "transform",
    `translate(${viewer.heatmapAnchor + pieOffset + side * 0.5}, ${
      viewer.current_scroll.y
    })`
  );

  const header = viewer.row_total_g
    .selectAll("text.total_title")
    .data(viewer.organisms?.length ? ["TOTAL"] : []);
  header.exit().remove();
  header
    .enter()
    .append("text")
    .attr("class", "total_title")
    .merge(header)
    .attr("transform", `translate(0, ${viewer.heatmapTop - 6}) rotate(-70)`)
    .attr("text-anchor", "start")
    .text("TOTAL");

  const props = viewer.current_props || [];
  const dy = props.length ? Math.max(0, viewer.props.indexOf(props[0])) : 0;
  const localY = (d, i) => viewer.heatmapTop + viewer.y(i + dy) + side * 0.5;

  const cells_t = viewer.row_total_g
    .selectAll(".total_cell")
    .data(props, (d) => d.property);

  cells_t.exit().remove();
  cells_t.attr("transform", (d, i) => `translate(0, ${localY(d, i)})`);

  const mouseover = (event, gp) => {
    viewer.controller.draw_legends(gp.values.TOTAL);
    viewer.controller.draw_tooltip(event, {
      Property: gp.property,
      Name: gp.name,
      Organism: "All",
      Value: `TOTAL: {YES: ${gp.values.TOTAL.YES}, PARTIAL: ${gp.values.TOTAL.PARTIAL}, NO: ${gp.values.TOTAL.NO}}`,
    });
  };
  const mouseout = () => {
    viewer.controller.draw_legends();
    viewer.controller.draw_tooltip();
  };

  const entered = cells_t
    .enter()
    .append("g")
    .attr("class", "total_cell")
    .attr("transform", (d, i) => `translate(0, ${localY(d, i)})`)
    .on("mouseover", mouseover)
    .on("mouseout", mouseout);

  const arc_f = d3
    .arc()
    .outerRadius(side * 0.4)
    .innerRadius(0);
  const pie_f = d3.pie().value((d) => d.value);

  const group = entered.merge(cells_t);
  const arcs = group.selectAll(".arc").data(
    (d) => pie_f(d3.entries(d.values.TOTAL)),
    (d) => d.data.key
  );

  arcs.attr("d", arc_f);
  arcs
    .enter()
    .append("path")
    .attr("class", "arc")
    .attr("d", arc_f)
    .style("fill", (d) => viewer.c[d.data.key]);
};
