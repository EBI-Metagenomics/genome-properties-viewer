"use strict";

import * as d3 from "./d3";

export default class GenomePropertiesController {
    constructor({
        gp_element_selector=null,
        legends_element_selector=null,
        gp_viewer=null,
        hierarchy_contorller=null
    }){
        this.gp_viewer = gp_viewer;
        this.hierarchy_contorller = hierarchy_contorller;
        if (gp_element_selector) {
            this.gp_component = d3.select(gp_element_selector);

            if (this.hierarchy_contorller.root)
                this.draw_hierarchy_selector();
            else
                this.hierarchy_contorller.on("hierarchyLoaded", ()=>this.draw_hierarchy_selector());
        }
        if(legends_element_selector) {
            this.legends_component = d3.select(legends_element_selector).append("ul");;
            this.draw_legends();
        }
    }
    draw_legends(total={YES: 0, NO: 0, PARTIAL: 0}) {

        const legend_item = this.legends_component.selectAll("li")
            .data(d3.entries(total).sort((a,b)=>a.key>b.key?-1:1), d=>d.key);

        legend_item.select(".color>div").html(d=>d.value>0?d.value:"&nbsp;");

        const li_e = legend_item.enter().append("li");

        li_e.append("label").text(d=>d.key.toLowerCase())
        li_e.append("div")
            .attr("class", "color")
            .style("background", d => this.gp_viewer.c[d.key])
            .style("color", d => d.key=="NO"?"rgb(49, 130, 189)":"rgb(230,230,230)")
            .append("div")
            .style("margin", "0 auto")
            .style("padding", "2px");

    }
    draw_hierarchy_selector(){
        this.gp_component.html(`
            <div class='current_status'>All</div>
            <div class='options'>
                <a class="all">All</a> | <a class="none">None</a><br/><ul></ul>
            </div>`);


        this.gp_component.select(".options .all")
            .on("click", ()=> this.update("ALL"));
        this.gp_component.select(".options .none")
            .on("click", ()=> this.update("NONE"));

        const tll = this.gp_component.select(".options ul").selectAll(".top-level-option")
            .data(this.hierarchy_contorller.hierarchy_switch, d=>d.id);

        const li = tll.enter().append("li")
            .attr("class", "top-level-option");
        li.append("div")
            .style("width","0.8em")
            .style("height","0.8em")
            .style("margin-right","5px")
            .style("display","inline-block")
            .style("background", d=> this.hierarchy_contorller.color(d.id))
            .style("border", d=> "2px solid "+this.hierarchy_contorller.color(d.id))
            .style("border-radius", "50%")
            .on("click", d=>this.update(d));

        li.append("a").text(d=>this.hierarchy_contorller.nodes[d.id].name)
            .on("click", d=>this.update(d));

    }

    update(d){
        let selected = [];
        if (d=="ALL" || d=="NONE" ){
            this.hierarchy_contorller.hierarchy_switch.forEach(e=>e.enable=(d=="ALL"));
            // this.hierarchy_contorller.update_top_level_legend();
            this.hierarchy_contorller.dipatcher.call("siwtchChanged",this, this.hierarchy_switch);
            this.gp_component.select(".current_status").html(d.toLowerCase());
        }else {
            this.hierarchy_contorller.toggle_switch(d);
            this.gp_component.select(".current_status").text("");
            selected = this.hierarchy_contorller.hierarchy_switch.filter(e=>e.enable);
            if(selected.length==0)
                this.gp_component.select(".current_status").text("none");
            else if(selected.length==this.hierarchy_contorller.hierarchy_switch.length)
                this.gp_component.select(".current_status").text("all");
            else{
                const samples = this.gp_component.select(".current_status").selectAll("div.sample")
                    .data(selected, d=>d.id);
                samples.enter().append("div")
                    .attr("class", "sample")
                    .style("width","0.8em")
                    .style("height","0.8em")
                    .style("margin-left","2px")
                    .style("display","inline-block")
                    .style("background", d=> this.hierarchy_contorller.color(d.id))
                    .style("border-radius", "50%");
                samples.exit().remove();
            }
        }
        this.gp_component.select(".options ul").selectAll(".top-level-option div")
            .style("background", d=> d.enable?this.hierarchy_contorller.color(d.id):"#e3e3e3");
    }

}
