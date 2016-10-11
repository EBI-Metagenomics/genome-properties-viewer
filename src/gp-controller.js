"use strict";

import * as d3 from "./d3";
import "js-autocomplete-tremby";

export default class GenomePropertiesController {
    constructor({
        gp_element_selector=null,
        legends_element_selector=null,
        tooltip_selector=".info-tooltip",
        gp_text_filter_selector=null,
        gp_viewer=null,
        gp_taxonomy=null,
        gp_label_selector=null,
        tax_label_selector=null,
        tax_search_selector=null,
        hierarchy_contorller=null,
        width=400
    }){
        this.gp_viewer = gp_viewer;
        this.hierarchy_contorller = hierarchy_contorller;
        this.gp_taxonomy = gp_taxonomy;
        this.width = width;
        this.dipatcher = d3.dispatch(
            "textFilterChanged",
            "legendFilterChanged"
        );

        if (gp_element_selector) {
            this.gp_component = d3.select(gp_element_selector);

            if (this.hierarchy_contorller.root)
                this.draw_hierarchy_selector();
            else
                this.hierarchy_contorller.on("hierarchyLoaded", ()=>this.draw_hierarchy_selector());
        }

        if(legends_element_selector) {
            this.legends_component = d3.select(legends_element_selector).append("ul");
            this.draw_legends();
        }

        if (tooltip_selector){
            this.tooltip_selector = tooltip_selector;
            this.draw_tooltip(null, true);
        }

        this.text_filter="";
        if (gp_text_filter_selector) {
            d3.select(gp_text_filter_selector).on("keyup", (d,i,c)=>{
                this.text_filter = c[i].value.length>2?c[i].value:"";
                this.gp_viewer.filter_gp(this.text_filter);
            });
        }
        if (gp_label_selector){
            d3.select(gp_label_selector).on("change", (d,i,c)=>{
                this.gp_viewer.change_gp_label(c[i].value);
            });
        }
        if (tax_label_selector && gp_taxonomy){
            d3.select(tax_label_selector).on("change", (d,i,c)=>{
                this.gp_taxonomy.change_tax_label(c[i].value);
            });
        }
        if (tax_search_selector && gp_taxonomy) {
            this.search_options=[]
            this.ac = new autoComplete({
                selector: tax_search_selector,
                minChars: 2,
                source: (term, suggest) => {
                    term = term.toLowerCase();
                    suggest(this.search_options.filter(d=>d.toLowerCase().indexOf(term) != -1));
                },
                onSelect: (event, term, item)=> {
                    const tax = term.substr(0,term.indexOf(":"));
                    this.gp_taxonomy.dipatcher.call("spaciesRequested",this.gp_taxonomy, tax);
                    d3.select(tax_search_selector).node().value=""
                }
            });
        }
    }

    loadSearchOptions(){
        this.search_options = this.gp_taxonomy.organisms.map(e=>e+": "+this.gp_taxonomy.nodes[e].species)
        // this.search_options.splice(0,0,...this.search_options.map(e=>this.gp_taxonomy.nodes[e].species))
        // this.search_options = this.search_options.map(String);
    }
    draw_tooltip(items=null, first_time=false, header=null){
        const parent =d3.select(this.tooltip_selector);

        if (header) parent.insert("header", ":first-child").text(header);
        else parent.select("header").remove();

        if (first_time)
            this.tooltip_component = parent.append("ul");


        parent.style("visibility", items==null?"hidden":"visible");
        const info_item = this.tooltip_component.selectAll("li")
            .data(d3.entries(items), d=>d.key);
        info_item.exit().remove();
        const li_e = info_item.enter().append("li");
        li_e.append("div")
            .attr("class", "label")
            .text(d=>d.key.toLowerCase());
        li_e.append("div")
            .attr("class", "content")
            .text(d=>d.value);

        if(d3.event) {
            const h =parent.node().getBoundingClientRect().height;
            let top =10 + d3.event.y,
                left = Math.max(d3.event.x - this.width/2,0);
            if (top+h>this.gp_viewer.options.height+this.gp_viewer.options.margin.top)
                top = d3.event.y - h -10;
            if (left+this.width>this.gp_viewer.options.width+this.gp_viewer.options.margin.left)
                left=this.gp_viewer.options.width+this.gp_viewer.options.margin.left-this.width;

            parent
                .style("width", this.width + "px")
                .style("top", top + "px")
                .style("left", left + "px");
            // to adjust the position of the arrow I will need to modify its left value by
            // 100*(d3.event.x-left)/this.width
            // however this doesn't seem possible via d3 manipulation.
            // Arrows were created as in http://www.w3schools.com/css/css_tooltip.asp
        }

    }
    draw_legends(total={YES: 0, NO: 0, PARTIAL: 0}) {
        const legend_item = this.legends_component.selectAll("li")
            .data(d3.entries(total).sort((a,b)=>a.key>b.key?-1:1), d=>d.key);

        const legends_filter={YES: "", NO: "", PARTIAL: ""},
            filter_symbols = ["", "∀", "∃", "∄"];


        legend_item.select(".color>div").html(d=>d.value>0?d.value:"&nbsp;");

        const li_e = legend_item.enter().append("li");

        li_e.append("label").text(d=>d.key.toLowerCase());
        li_e.append("div")
            .attr("class", "color")
            .style("background", d => this.gp_viewer.c[d.key])
            .style("color", d => d.key=="NO"?"rgb(49, 130, 189)":"rgb(230,230,230)")
            .style("cursor", "pointer")
            .attr("type", "")
            .on("click",(d,i,c)=>{
                const e = d3.select(c[i]), //Element
                    cu = filter_symbols.indexOf(e.attr("type")), //Current
                    n = (cu+1)%filter_symbols.length; //Next

                e   .classed("filter", filter_symbols[n]!="")
                    .attr("type", filter_symbols[n]);
                legends_filter[d.key]=filter_symbols[n];
                this.dipatcher.call("legendFilterChanged", this, legends_filter);
            })
            .on("mouseover", d=>this.draw_tooltip({
                    "∀": `All the species in the row have the value (${d.key})`,
                    "∃": `There is at least one species in each row with the value (${d.key})`,
                    "∄": `There is not a single species in each row with the value (${d.key})`
                }, false, "Click in this area to apply one of the following filters"))
            .on("mouseout", d=>this.draw_tooltip())
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
    on(typename, callback){
        this.dipatcher.on(typename, callback);
        return this;
    }

}
