"use strict";

import * as d3 from "./d3";

export default class TaxonomyNodeManager {
    constructor(tax_component){
        this.tree_g = null;
        this.main = tax_component;
    }
    draw_nodes(visible_nodes, t){
        const node = this.tree_g.selectAll(".node")
            .data(visible_nodes, d=>d.id);

        node
            .attr("class", d => {
                return "node " + (d.children ? " node--internal" : " node--leaf")+ (d.data.loaded ? " loaded" : "")
            })
            .transition(t)
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")");

        node.exit().remove();
        const node_e = node
            .enter().append("g")
            .attr("class", d => "node " + (d.children ? " node--internal" : " node--leaf")+ (d.data.loaded ? " loaded" : "") )
            .on("mouseover", (d,i,c) => {
                d3.select("#info_organism").text(`${d.label}${(d.data.taxId)?" - "+d.data.taxId:""}`);
                d3.select(c[i]).selectAll("circle").transition(300).attr("r", 8);
            })
            .on("mouseout", (d,i,c) => {
                d3.select("#info_organism").text("");
                d3.select(c[i]).selectAll("circle").transition(300).attr("r", 4);
            })
            .on("dblclick", d=>{
                if(d.data.taxId){ //Only leaves have taxId attached
                    this.main.dipatcher.call("spaciesRequested",this.main, d.data.taxId);
                }
                if (d.parent) {
                    d.data.expanded = !d.data.expanded;
                    this.main.update_tree(500);
                }
            })
            .call(d3.drag()
                .subject((d, i, c)=>{
                    const g = d3.select(c[i]),
                        t = g.attr("transform").match(/translate\((.*),(.*)\)/);
                    return {
                        x:Number(t[1]) + Number(g.attr("x")),
                        y:Number(t[2]) + Number(g.attr("y")),
                    };
                })
                .on("drag", (d, i, c)=> {
                    // d3.event.sourceEvent.stopPropagation();
                    if (d.has_loaded_leaves)
                        d3.select(c[i]).attr("transform",
                            d => "translate(" + d3.event.x + "," + d.y + ")"
                        );
                })
                .on("end", (d, i, c) => {
                    if (d.has_loaded_leaves) {
                        const w = this.main.cell_side,
                            dx = (d3.event.x - d.x);// - w/2,
                        let d_col = Math.round(dx / w);
                        move_tree(d, d_col);
                        var t = d3.transition().duration(500);
                        d3.select(c[i]).transition(t).attr("transform",
                            d => "translate(" + d.x + "," + d.y + ")");
                    }
                })
            );

        const move_tree = (d, d_col) => {
            if (!d.children) {
                move_leaf(d,d_col);
            } else {
                d.children.sort((a,b)=>d_col>0?b.x-a.x:a.x-b.x);
                for (let child of d.children)
                    move_tree(child,d_col);
            }

        };
        const move_leaf = (d, d_col) => {
            const current_i = this.main.organisms.indexOf(d.data.id),
                current_o = this.main.current_order.indexOf(current_i);
            d_col = current_o+d_col<0?-current_o:d_col;
            if (d_col != 0) {
                const e = this.main.current_order.splice(current_o, 1);
                this.main.current_order.splice(current_o+d_col, 0, e[0]);
                this.main.update_tree(1000);
                this.main.dipatcher.call("changeOrder",this.main, this.main.current_order)
            }
        };

        node_e.append("circle")
            .attr("r", 4);
        node_e.transition(t)
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")" );

        const text_to_node = (d, i ,context, full=false) => {
            let text = (d.data.taxId ? "* " : "+ ");
            text += (d.data.number_of_leaves > 1 ? ` (${d.data.number_of_leaves}) ` : "");
            let name =  ((d.data.expanded && !d.data.taxId) ? "" : d.label);
            text += (full?name:name.slice(0,5)+"...");
            return text;
        };
        node_e.append("text")
            .attr("dy", 3)
            .attr("x", d =>  d.children ? (d.parent ? -8 : 0) : 8)
            .style("text-anchor", d => d.parent ? this.main.collapse_tree?"start":"end" : "middle")
            .style("transform", d=> {
                if (this.main.collapse_tree)
                    return d.children?
                        (d.parent?"rotate(-90deg) translate(10px, -6px)":"translate(0px, -8px)"):
                        "rotate(-90deg) translate(0, 6px)"

            })
            .text(text_to_node)
            .on("mouseover", (d,i,c)=>d3.select(c[i]).text(text_to_node(d,i,c,true)))
            .on("mouseout", (d,i,c)=>d3.select(c[i]).text(text_to_node(d,i,c,false)));


    }
}