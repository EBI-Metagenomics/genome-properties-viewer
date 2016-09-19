"use strict";

import * as d3 from "./d3";

export default class GenomePropertiesHierarchy {

    constructor(){
        this.nodes = {};
        this.root = null;
        this.color = null;
        this.hierarchy_switch = [];
    }

    load_hierarchy_from_path(path, callback=null){
        d3.text(path).get( (error, text) => {
            if (error) throw error;
            d3.tsvParseRows(text, (d) => {
                if (!(d[0] in this.nodes))
                    this.nodes[d[0]] = this.create_node(d[0], d[1]);
                if (!(d[2] in this.nodes))
                    this.nodes[d[2]] = this.create_node(d[2], d[3]);

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
            if (callback)
                callback();
        });
    }

    create_node(id, name){
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

}