import * as d3 from "./d3";

export const updateStepToggler = (viewer, gp, element, cellSide) => {
  const xScale = viewer.x;

  const onClick = id => {
    viewer.data[id].isShowingSteps = !viewer.data[id].isShowingSteps;
    viewer.update_viewer();
  };
  const toggler = d3
    .select(element)
    .selectAll(".step-toggler")
    .data([gp.property], d => d);

  const x0 = xScale.range()[0] - cellSide * 0.9;
  const side = cellSide * 0.8;
  const top = cellSide * 0.1;
  const half = side / 2;
  const fifth = side / 5;

  const expand =
    `M${x0 + half},${top + 2 * fifth}L${x0 + side},${top + 2 * fifth}L${x0 +
      half},${top}L${x0},${top + 2 * fifth}L${x0 + half},${top + 2 * fifth}` +
    `L${x0 + half},${top + 3 * fifth}` +
    `L${x0 + side},${top + 3 * fifth}L${x0 + half},${top + side}L${x0},${top +
      3 * fifth}L${x0 + half},${top + 3 * fifth}Z`;

  const collapse =
    `M${x0 + half},${top + 2 * fifth}L${x0 + side},${top}L${x0},${top}L${x0 +
      half},${top + 2 * fifth}` +
    `L${x0 + half},${top + 3 * fifth}` +
    `L${x0 + side},${top + side}L${x0},${top + side}L${x0 + half},${top +
      3 * fifth}Z`;

  toggler
    .enter()
    .append("path")
    .attr("class", "step-toggler")
    .style("cursor", "row-resize")
    .attr("fill", "rgba(30,60,90,0.2)")
    .on("click", onClick)
    .merge(toggler)
    .transition()
    .attr("d", id => (viewer.data[id].isShowingSteps ? collapse : expand))
  ;
};

export const updateSteps = (viewer, gp, element, cellSide) => {
  const xScale = viewer.x;
  const side = cellSide * 0.6;
  const p = cellSide * 0.2;

  const steps = d3
    .select(element)
    .selectAll(".step")
    .data(gp.isShowingSteps ? gp.steps : []);

  steps.exit().remove();

  const step_g = steps
    .enter()
    .append("g")
    .attr("class", "step")
    .merge(steps)
    .attr("transform", (d, i) => `translate(0, ${i * cellSide + p})`);

  const onMouseOver = (p, i, c) => {
    viewer.controller.draw_tooltip({
      Property: gp.property,
      Name: gp.name,
      Step: p.step,
      Passed: p.value ? "YES" : "NO",
      Organism: p.organism,
    });

  };
  const onMouseOut = (p, i, c) => {
    viewer.controller.draw_tooltip();
  };
  const stepPerSpecie = step_g
    .merge(steps)
    .selectAll(".step-per-specie")
    .data(
      (d, i) =>
        viewer.organisms.map(organism => ({
          organism,
          value: gp.steps[i].values[organism],
          step: gp.steps[i].step,
          key: `${organism}__${i}`
        })),
      d => d.key
    );

  stepPerSpecie
    .enter()
    .append("rect")
    .attr("class", "step-per-specie")
    .attr("stroke", "black")
    .on("mouseover", onMouseOver)
    .on("mouseout", onMouseOut)
    .merge(stepPerSpecie)
    .attr("x", (d, i) => xScale(i) + p)
    .transition()
    .attr("width", side)
    .attr("height", side)
    .attr("fill", d => (d.value ? "rgba(100,250,100,0.7)" : "rgba(200,200,200,0.3)"));

};
