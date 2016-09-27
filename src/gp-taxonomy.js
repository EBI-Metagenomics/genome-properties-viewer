"use strict";

import * as d3 from "./d3";

export default class GenomePropertiesTaxonomy {
    constructor({path, x=0, y=0, width=600, height=200}){
        this.nodes = null;
        this.nodes_by_tax = null;
        this.root = null;
        this.path=path;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.cell_side = 20;
        this.current_order=[];
        this.organisms=[];
        this.svg=null;
        this.collapse_tree = true;
        this.dipatcher = d3.dispatch("changeOrder", "spaciesRequested");
    }

    load_taxonomy() {
        d3.json(this.path, (error, data) => {
            if (error) throw error;
            this.root = data;
            this.nodes = this.load_nodes(this.root);
            this.root.expanded=true;
            // this.current_order=d3.range(this.root.number_of_leaves);
        });
    }

    load_nodes(node){
        if (this.nodes==null) this.nodes = {};
        if (this.nodes_by_tax==null) this.nodes_by_tax = {};
        if (node.taxId)
            this.nodes_by_tax[node.taxId] = node;
        this.nodes[node.lineage]=node;
        this.nodes[node.lineage].expanded=false;
        if (node.children==null || node.children.length<1)
            this.organisms.push(node.lineage);
        node.children.forEach(child=>{ this.load_nodes(child); });
        return this.nodes;
    }

    draw_tree_panel(svg){
        this.svg=svg;
        this.tree_g = svg.append("g")
            .attr("class", "taxon_tree")
            .attr("transform", `translate(${this.x}, ${this.y})`);
    }

    // Walks the tree and calculates x,y values for each node
    tree(node, deepness=0){
        const ol = this.organisms.length,
            w_leaves = this.cell_side*ol,
            h = this.height-20,
            w_fr = w_leaves/ol,
            w_explore = this.width-w_leaves;
        const heatmap_start =this.width
            - this.cell_side*(ol+1) // 1 for the TOTAL column
            +this.svg.x;

        let avg=0;

        if (node.has_loaded_leaves){
            node.y = h;
            if (node.children) {
                for (let child of node.children) {
                    this.tree(child, deepness + 1);
                    avg += child.x;
                    node.y = child.y < node.y ? child.y : node.y;
                    node.deepness = (!node.deepness || child.deepness > node.deepness) ? child.deepness : node.deepness;
                }
                node.x = avg / node.children.length;
                node.y =(node.depth)*h/node.height;
            } else {
                node.x = heatmap_start+ (w_fr / 2 + w_fr * this.current_order.indexOf(this.organisms.indexOf(node.data.lineage)));
                node.y = h;
                node.deepness = deepness;
            }
        }
    }
    prune_inner_nodes(tree){
        if (!tree.label) tree.label = tree.data.species;
        if (tree.children){
            if (tree.children.length == 1){
                tree.label = tree.children[0].data.species;
                tree.height = tree.children[0].height;
                tree.data = tree.children[0].data;
                tree.children = tree.children[0].children;
                if (tree.children)
                    for (let child of tree.children)
                        child.parent = tree;
                this.prune_inner_nodes(tree);
            }else
                for (let child of tree.children)
                    this.prune_inner_nodes(child);

        }
    }
    mark_branch_for_loaded_leaves(node){
        node.has_loaded_leaves=true;
        if (node.parent)
            this.mark_branch_for_loaded_leaves(node.parent);
    }
    filter_collapsed_nodes(node){
        node.has_loaded_leaves=false;
        if (node.data.expanded) {
            node.children = (node.children) ? node.children : node._children;
            node._children = null;
            if (node.children){
                node.children.sort((a,b)=>a.has_loaded_leaves?1:-1);
                node.children.forEach(
                    n=>this.filter_collapsed_nodes(n)
                );
            }else {
                if (node.data.loaded) this.mark_branch_for_loaded_leaves(node);
            }
        }else {
            node._children = node.children;
            node.children = null;
        }
    }

    update_tree(time=0, cell_side=null){
        if (this.root==null) return;
        if (cell_side!=null) this.cell_side = cell_side;
        const root = d3.hierarchy(this.root);


        if (this.collapse_tree)
            this.prune_inner_nodes(root);
        else
            root.descendants().forEach(e=>e.label=e.data.species);
        this.filter_collapsed_nodes(root);

        const leaves = root.leaves().filter(d=>d.data.loaded),
            ol = leaves.length;
        this.organisms = leaves.map(n=>n.data.lineage);

        // Precompute the orders.
        this.orders = {
            tax_id: d3.range(ol).sort((a, b) => leaves[a].data.taxId - leaves[b].data.taxId),
            org_name: d3.range(ol).sort((a, b) => leaves[a].data.species - leaves[b].data.species),
            tree: d3.range(ol).sort((a, b) => leaves[a].data.lineage - leaves[b].data.lineage),
        };
        if (!this.current_order || this.current_order.length!=leaves.length)
            this.current_order = this.orders.tree;

        const tree = d3.tree()
            .size([this.width-this.cell_side*leaves.length, this.height])
            .separation((a,b)=>(a.parent == b.parent ? 1 : 2) / a.depth);
        tree(root);
        this.tree(root);
        const t = d3.transition().duration(time),
            visible_nodes = root.descendants().filter(d=>(d.data.expanded || d.parent.data.expanded));

        d3.select(".taxon_tree").attr("transform",
            "translate(0 ,"
            +(-this.height+20)
            +")");
        const link = this.tree_g.selectAll(".link")
            .data(root.links(), d=>
                d.source.id>d.target.id?d.source.id+d.target.id:d.target.id+d.source.id);

        link.transition(t).attr("d", (d, i) =>
            "M" + d.target.x + "," + d.target.y +
            "V" + d.source.y +
            "H" + d.source.x
        );

        link.exit().remove();
        link.enter().append("path")
            .attr("class", "link")
            .attr("d", (d, i) =>
                "M" + d.target.x + "," + d.target.y +
                "V" + d.source.y +
                "H" + d.source.x
            );

        const node = this.tree_g.selectAll(".node")
            .data(visible_nodes, d=>d.id);


        node.transition(t)
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")");

        node.exit().remove();
        const node_e = node
            .enter().append("g")
            .attr("class", d => "node "+ d.label + (d.children ? " node--internal" : " node--leaf") )
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")" )
            .on("mouseover", d => d3.select("#info_organism").text(`${d.label}${(d.data.taxId)?" - "+d.data.taxId:""}`))
            .on("mouseout", d => d3.select("#info_organism").text(""))
            .on("dblclick", d=>{
                if(d.data.taxId){ //Only leaves have taxId attached
                    this.dipatcher.call("spaciesRequested",this, d.data.taxId);

                }
                if (d.parent) {
                    d.data.expanded = !d.data.expanded;
                    this.update_tree();
                }
            })
            .call(d3.drag()
                .subject(function(){
                    const g = d3.select(this),
                        t = g.attr("transform").match(/translate\((.*),(.*)\)/);
                    return {
                        x:Number(t[1]) + Number(g.attr("x")),
                        y:Number(t[2]) + Number(g.attr("y")),
                    };
                })
                .on("drag", function(d) {
                    d3.event.sourceEvent.stopPropagation();
                    if (d.has_loaded_leaves)
                        d3.select(this).attr("transform",
                            d => "translate(" + d3.event.x + "," + d.y + ")"
                        );
                })
                .on("end", function(_this) {
                    return function (d) {
                        if (d.has_loaded_leaves) {
                            const w = _this.cell_side,
                                dx = (d3.event.x - d.x);// - w/2,
                            let d_col = Math.round(dx / w);
                            move_tree(_this, d, d_col);
                            var t = d3.transition().duration(500);
                            d3.select(this).transition(t).attr("transform",
                                d => "translate(" + d.x + "," + d.y + ")");
                        }
                    }
                }(this))
            );

        function move_tree(_this,d, d_col) {
            if (!d.children) {
                move_leaf(_this,d,d_col);
            } else {
                d.children.sort((a,b)=>d_col>0?b.x-a.x:a.x-b.x);
                for (let child of d.children)
                    move_tree(_this,child,d_col);
            }

        }
        function move_leaf(_this,d, d_col){
            const current_i = _this.organisms.indexOf(d.data.lineage),
                current_o = _this.current_order.indexOf(current_i);
            d_col = current_o+d_col<0?-current_o:d_col;
            if (d_col != 0) {
                const e = _this.current_order.splice(current_o, 1);
                _this.current_order.splice(current_o+d_col, 0, e[0]);
                _this.update_tree(1000);
                _this.dipatcher.call("changeOrder",_this, _this.current_order)
            }
        }


        node_e.append("circle")
            .attr("r", 2.5);

        node_e.append("text")
            .attr("dy", 3)
            .attr("x", d =>  d.children ? (d.parent ? -8 : 0) : 8)
            .style("text-anchor", d => d.parent ? this.collapse_tree?"start":"end" : "middle")
            .style("transform", d=> {
                if (this.collapse_tree)
                    return d.children?
                        (d.parent?"rotate(-90deg) translate(10px, -6px)":"translate(0px, -8px)"):
                        "rotate(-90deg) translate(0, 6px)"

            })
            .text(d =>
                (d.data.taxId?"* ":"+ ")+
                ((d.data.expanded && !d.data.taxId)?"":d.label) +
                (d.data.number_of_leaves>1?` (${d.data.number_of_leaves})`:"")
            );


    }
    set_organisms_loaded(tax_id, tax_loaded){
        this.nodes_by_tax[tax_id].loaded=true;
        // this.organisms.sort((a,b)=>{
        //     return tax_loaded.indexOf(tax_loaded.indexOf(String(this.nodes[a].taxId))-tax_loaded.indexOf(String(this.nodes[b].taxId)));
        // });
    }
    get_tax_list(){
        return this.organisms.map(d=>this.nodes[d].taxId);
    }

    on(typename, callback){
        this.dipatcher.on(typename, callback);
        return this;
    }
}
