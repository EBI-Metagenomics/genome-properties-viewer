import * as d3 from './d3';

export const updateStepToggler = (viewer, gp, element, side) => {
  const xScale = viewer.x;

  const onClick = (id) => {
    viewer.data[id].isShowingSteps = !viewer.data[id].isShowingSteps;
    viewer.update_viewer();
    // console.log(id, arr,element);
  };
  const toggler = d3
    .select(element)
    .selectAll(".step-toggler")
    .data([gp.property], d => d);

  toggler
    .enter()
    .append("rect")
    .attr("class", "step-toggler")
    .attr("x", (d, i) => xScale(i)-side+2)
    .attr("height", side-4)
    .attr("width", side-4)
    .attr("fill", "rgba(30,60,90,0.2)")
    .on("click", onClick);

};