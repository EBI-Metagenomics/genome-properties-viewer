"use strict";

import * as d3 from "./d3";

export default class GenomePropertiesHierarchy {

    constructor(x=0, y=0, width=100, height=100){
        this.nodes = {};
        this.root = null;
        this.color = null;
        this.hierarchy_switch = [];
        this.top_level_g = null;
        this.width = width;
        this.height = height;
        this.x=x;
        this.y = y;
        this.dipatcher = d3.dispatch(
            "siwtchChanged"
        );
        return this;
    }

    load_hierarchy_from_path(path){
        d3.text(path).get( (error, text) => {
            if (error) throw error;
            d3.tsvParseRows(text, (d) => {
                if (!(d[0] in this.nodes))
                    this.nodes[d[0]] = GenomePropertiesHierarchy.create_node(d[0], d[1]);
                if (!(d[2] in this.nodes))
                    this.nodes[d[2]] = GenomePropertiesHierarchy.create_node(d[2], d[3]);

                if (this.nodes[d[0]].children.indexOf(this.nodes[d[2]])==-1)
                    this.nodes[d[0]].children.push(this.nodes[d[2]]);
                if (this.nodes[d[2]].parents.indexOf(this.nodes[d[0]])==-1)
                    this.nodes[d[2]].parents.push(this.nodes[d[0]]);
                if (d[1]=="genome properties")
                    this.root = this.nodes[d[0]]
            });
            this.color = d3.scaleOrdinal()
                .domain(this.root.children.map(d=>d.id))
                .range(d3.schemeCategory20b);
            this.hierarchy_switch = this.root.children.map(d=>{
                return {"id": d.id, "enable": true };
            });
            this.update_top_level_legend();
        });
        return this;
    }

    static create_node(id, name){
        return {
            id: id,
            name: name,
            parents: [],
            children: [],
            top_level_gp: null,
        };
    }

    get_top_level_gp_by_id(id){
        if (id in this.nodes)
            return [...this.get_top_level_gp(this.nodes[id])].map(d=>d.id);
        return [];
    }

    get_top_level_gp(node){
        if (node==this.root)
            return null;
        if (node.top_level_gp)
            return node.top_level_gp;
        if (node.parents.indexOf(this.root)!=-1) {
            node.top_level_gp = new Set([node]);
            return node.top_level_gp;
        }
        node.top_level_gp = new Set();
        for (let parent of node.parents){
            node.top_level_gp = new Set([
                ...node.top_level_gp,
                ...this.get_top_level_gp(parent)
            ]);
        }
        return node.top_level_gp;
    }

    draw_controller(container){
        const text_offset=2;

        this.top_level_g = container.append("g")
            .attr("transform", "translate("+this.x+", "+this.y+")");

        this.top_level_g.append("text")
            .attr("id", "top-level-legend-all")
            .attr("x", 0)
            .attr("y", this.height-text_offset)
            .style("cursor", "pointer")
            .style("fill", "#223399")
            .text("All")
            .on("click", d=> {
                this.hierarchy_switch.forEach(e=>e.enable=true);
                this.update_top_level_legend();
                this.dipatcher.call("siwtchChanged",this, this.hierarchy_switch);
            });

        const text_x = this.top_level_g.select("text").node().getBBox().width;
        this.top_level_g.append("text")
            .attr("x", text_x*1.3)
            .attr("y", this.height-text_offset)
            .text("|");

        this.top_level_g.append("text")
            .attr("id", "top-level-legend-none")
            .attr("x", text_x*1.7)
            .attr("y", this.height-text_offset)
            .style("cursor", "pointer")
            .style("fill", "#223399")
            .text("None")
            .on("click", d=> {
                this.hierarchy_switch.forEach(e=>e.enable=false);
                this.update_top_level_legend();
                this.dipatcher.call("siwtchChanged",this, this.hierarchy_switch);
            });


        this.top_level_g.append("text")
            .attr("x", text_x*4)
            .attr("y", this.height-text_offset)
            .text("|");

    }

    update_top_level_legend(){
        const
            x = this.top_level_g.select("text").node().getBBox().width,
            w_tl_g = this.width - 2*this.x  -35 -4.5*x,
            h_tl_g = this.height;

        const tll = this.top_level_g.selectAll(".top-level-legend")
            .data(this.hierarchy_switch, d=>d.id);

        tll
            .style("opacity", d=> d.enable?1:0.5);

        tll.enter().append("circle")
            .attr("class", "top-level-legend")
            .attr("cx", (d,i) => x*4.5+ (0.5+i) * w_tl_g/this.hierarchy_switch.length)
            .attr("cy", 1+h_tl_g/2)
            .attr("r", h_tl_g/2 -1)
            .style("opacity", d=> d.enable?1:0.5)
            .style("cursor", "pointer")
            .style("fill", d=> this.color(d.id))
            .on("mouseover", d => {
                d3.select("#info_top_level_properties").text(this.nodes[d.id].name)
            })
            .on("mouseout", () => {
                d3.select("#info_top_level_properties").text("")
            })
            .on("click", d=> {
                this.hierarchy_switch.forEach(e=>{
                    if (e.id==d.id)e.enable = !e.enable;
                });
                this.update_top_level_legend();
                this.dipatcher.call("siwtchChanged",this, this.hierarchy_switch);
            });
        d3.select(".gpv-rows-group")
            .attr("transform", "translate(0,0)");

    }

    on(typename, callback){
        this.dipatcher.on(typename, callback);
        return this;
    }
}