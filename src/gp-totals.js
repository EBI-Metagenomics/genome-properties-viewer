import * as d3 from "./d3";

export const drawTotalPerOrganismPanel = viewer => {
  const ph = viewer.options.total_panel_height;
  viewer.total_g = viewer.svg
    .append("g")
    .attr("class", "total-group")
    .attr(
      "transform",
      `translate(${viewer.current_scroll.x -
        viewer.options.margin.left}, ${viewer.options.height -
        viewer.options.margin.bottom -
        ph}
      )`
    );
};

export const refreshGPTotals = viewer => {
  for (const prop of viewer.props){
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

const refreshOrganismTotals = viewer => {
  for (let o of Object.keys(viewer.organism_totals))
    viewer.organism_totals[o] = { YES: 0, NO: 0, PARTIAL: 0 };
  viewer.props.forEach(e => {
    for (let v of Object.keys(viewer.organism_totals))
      viewer.organism_totals[v][e.values[v]]++;
  });
};

export const updateTotalPerOrganismPanel = (viewer, time = 0) => {
  const ph = (viewer.options.total_panel_height = viewer.options.cell_side),
    t = d3.transition().duration(time);
  viewer.total_g.attr(
    "transform",
    "translate(" +
      (viewer.current_scroll.x - viewer.options.margin.left) +
      ", " +
      (viewer.options.height - viewer.options.margin.bottom - ph) +
      ")"
  );

  const arc_f = d3
    .arc()
    .outerRadius(ph * 0.4)
    .innerRadius(0);

  const pie_f = d3.pie().value(d => d.value);

  refreshOrganismTotals(viewer);

  const cells_t = viewer.total_g
    .selectAll(".total_cell_org")
    .data(
      d3
        .entries(viewer.organism_totals)
        .sort(
          (a, b) =>
            viewer.organisms.indexOf(a.key) - viewer.organisms.indexOf(b.key)
        ),
      d => d.key
    );

  cells_t
    .transition(t)
    .attr(
      "transform",
      d =>
        "translate(" +
        (viewer.x(viewer.organisms.indexOf(d.key.toString())) +
          ph / 2 +
          viewer.options.margin.left) +
        ", " +
        ph * 0.5 +
        ")"
    );
  cells_t.exit().remove();

  const g_e = cells_t
    .enter()
    .append("g")
    .attr("class", "total_cell_org")
    .attr(
      "transform",
      d =>
        "translate(" +
        (viewer.x(viewer.organisms.indexOf(d.key.toString())) +
          ph / 2 +
          viewer.options.margin.left) +
        ", " +
        ph * 0.5 +
        ")"
    )
    .on("mouseover", p => {
      d3.selectAll(".node--leaf text").classed("active", function() {
        return viewer.textContent === p.key;
      });
      viewer.controller.draw_tooltip({
        Organism: p.key
      });
      viewer.controller.draw_legends(p.value);
    })
    .on("mouseout", () => {
      viewer.controller.draw_legends();
      viewer.controller.draw_tooltip();
      d3.selectAll(".node--leaf text").classed("active", false);
    });

  const group = g_e.size() ? g_e : cells_t,
    arcs = group.selectAll(".arc").data(d => pie_f(d3.entries(d.value)));

  arcs
    .transition(t)
    .attr("d", arc_f)
    .attr("transform", "scale(1)");

  arcs
    .enter()
    .append("path")
    .attr("class", "arc")
    .attr("d", arc_f)
    .style("fill", d => viewer.c[d.data.key]);
};
