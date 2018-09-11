import * as d3 from "./d3";

class GPModal {
  constructor(element) {
    this.fixed = false;
    this.mask = d3.selectAll(element)
      .append("div")
      .attr("class", "gp-modal")
      .on("click",() => !this.fixed && this.setVisibility(false));
    this.popup = d3.selectAll(element).append("div")
      .attr("class", "gp-modal-popup");
    this.content =this.popup.append("div")
      .attr("class", "gp-modal-content");
  }

  setVisibility(visibility) {
    if (!visibility)
      this.fixed = false;
    this.mask.classed("gp-modal-active", visibility);
    this.popup.classed("gp-modal-active", visibility);
    this.content.classed("gp-modal-active", visibility);
  }

  showContent(content, fixed = false) {
    this.fixed = fixed;
    this.content.html(content);
    this.setVisibility(true);
  }
  getContentElement(){
    return this.content;
  }
}

export default GPModal;
