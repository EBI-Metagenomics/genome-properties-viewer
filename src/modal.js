import * as d3 from "./d3";

class GPModal {
  constructor(element) {
    this.mask = d3.selectAll(element)
      .append("div")
      .attr("class", "gp-modal")
      .on("click",() => this.setVisibility(false));
    this.popup = d3.selectAll(element).append("div")
      .attr("class", "gp-modal-popup");
    this.content =this.popup.append("div")
      .attr("class", "gp-modal-content");
  }

  setVisibility(visibility) {
    this.mask.classed("gp-modal-active", visibility);
    this.popup.classed("gp-modal-active", visibility);
    this.content.classed("gp-modal-active", visibility);
  }

  showContent(content) {
    this.content.html(content);
    this.setVisibility(true);
  }
}

export default GPModal;
