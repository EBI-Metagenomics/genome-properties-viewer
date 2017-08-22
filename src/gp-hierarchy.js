"use strict";

import * as d3 from "./d3";

export default class GenomePropertiesHierarchy {

    constructor(){
        this.nodes = {};
        this.root = null;
        this.hierarchy_switch = [];
        this.dipatcher = d3.dispatch(
            "siwtchChanged",
            "hierarchyLoaded"
        );
        return this;
    }

    load_hierarchy_from_path(path){
        // d3.text(path).get( (error, text) => {
        //     if (error) throw error;
        //     d3.tsvParseRows(text, (d) => {
        //         if (!(d[0] in this.nodes))
        //             this.nodes[d[0]] = GenomePropertiesHierarchy.create_node(d[0], d[1]);
        //         if (!(d[2] in this.nodes))
        //             this.nodes[d[2]] = GenomePropertiesHierarchy.create_node(d[2], d[3]);
        //         if (this.nodes[d[0]].children.indexOf(this.nodes[d[2]])==-1)
        //             this.nodes[d[0]].children.push(this.nodes[d[2]]);
        //         if (this.nodes[d[2]].parents.indexOf(this.nodes[d[0]])==-1)
        //             this.nodes[d[2]].parents.push(this.nodes[d[0]]);
        //         if (d[1]=="genome properties")
        //             this.root = this.nodes[d[0]]
        //     });
        //     this.color = d3.scaleOrdinal()
        //         .domain(this.root.children.map(d=>d.id))
        //         .range(d3.schemeCategory20b);
        //     this.hierarchy_switch = this.root.children.map(d=>{
        //         return {"id": d.id, "enable": true };
        //     });
        //     this.dipatcher.call("hierarchyLoaded", this, this.root);
        // });
        d3.json(path, (data)=>{
            this.root = data;
            this.nodes = {};
            this.add_node_recursively(this.root);
            this.color = d3.scaleOrdinal()
                .domain(this.root.children.map(d=>d.id))
                .range(d3.schemeCategory20b);
            this.hierarchy_switch = this.root.children.map(d=>{
                return {"id": d.id, "enable": true };
            });
            this.dipatcher.call("hierarchyLoaded", this, this.root);
        });

        return this;
    }
    add_node_recursively(node, parent=null) {
        if (!(node.parents))
            node.parents=[];
        if (parent)
            node.parents.push(parent);
        this.nodes[node.id] = node;
        if (node.children && node.children.length>0)
            for (let child of node.children)
                this.add_node_recursively(child, node);
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
    toggle_switch(d){
        this.hierarchy_switch.forEach(e=>{
            if (e.id==d.id)e.enable = !e.enable;
        });
        this.dipatcher.call("siwtchChanged",this, this.hierarchy_switch);

    }

    on(typename, callback){
        this.dipatcher.on(typename, callback);
        return this;
    }
}