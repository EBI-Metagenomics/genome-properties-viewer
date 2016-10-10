"use strict";

import * as d3 from "./d3";
import TaxonomyNodeManager from "./gp-tax-node";

export default class GenomePropertiesTaxonomy {
    constructor({path, x=0, y=0, width=600, height=200}){
        this.nodes = null;
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
        this.dipatcher = d3.dispatch(
            "changeOrder",
            "spaciesRequested",
            "changeHeight",
            "taxonomyLoaded"
        );
        this.node_r = 6;
        this.tax_label_type = "name";
        this.node_manager = new TaxonomyNodeManager(this, this.node_r);
        return this;
    }

    load_taxonomy() {
        d3.json(this.path, (error, data) => {
            if (error) throw error;
            this.root = data;
            this.nodes = this.load_nodes(this.root);
            this.root.expanded=true;
            this.dipatcher.call("taxonomyLoaded", this, this.root);
            this.update_tree(500);
        });
        return this;
    }

    load_nodes(node){
        if (this.nodes==null) this.nodes = {};
        this.nodes[node.id]=node;
        this.nodes[node.id].expanded=false;
        if (node.children==null || node.children.length<1)
            this.organisms.push(node.id);
        node.children.forEach(child=>{ this.load_nodes(child); });
        return this.nodes;
    }

    draw_tree_panel(svg){
        this.svg=svg;
        this.tree_g = svg.append("g")
            .attr("class", "taxon_tree")
            .attr("transform", `translate(${this.x}, ${this.y})`);
        this.tree_g.append("line")
            .attr("class","height-sizer")
            .attr("x1",this.width)
            .attr("y1",this.height)
            .attr("y2",this.height)
            .call(d3.drag()
                .on("drag", (d,i,c)=>{
                    this.height = d3.event.y;
                    d3.select(c[i])
                        .attr("y1",this.height)
                        .attr("y2",this.height);
                })
                .on("end", ()=>{
                    this.dipatcher.call("changeHeight",this, this.height);
                    this.update_tree();
                })
            );
        this.node_manager.tree_g = this.tree_g;
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
            if (node.children) {
                for (let child of node.children) {
                    this.tree(child, deepness + 1);
                    avg += child.x;
                    // node.y = child.y < node.y ? child.y : node.y;
                    node.deepness = (!node.deepness || child.deepness > node.deepness) ? child.deepness : node.deepness;
                }
                node.x = avg / node.children.length;
                const tmp = (node.depth)*h/node.height;
                // node.y = (tmp<h)?tmp:(node.parent.y+node.y)/2;
            } else {
                node.x = heatmap_start+ (w_fr / 2 + w_fr * this.current_order.indexOf(this.organisms.indexOf(node.data.id)));
                node.y = h;
                node.deepness = deepness;
            }
        }
    }
    prune_inner_nodes(tree, depth=0){
        if (!tree.label) tree.label = tree.data.species;
        if (!tree.id) tree.id = tree.data.id;
        tree.depth = depth;
        if (tree.children){
            if (tree.children.length == 1){
                tree.label = tree.children[0].data.species;
                tree.height = tree.children[0].height;
                tree.data = tree.children[0].data;
                tree.children = tree.children[0].children;
                if (tree.children)
                    for (let child of tree.children)
                        child.parent = tree;
                this.prune_inner_nodes(tree, depth);
            }else
                for (let child of tree.children)
                    this.prune_inner_nodes(child, depth+1);

        }
    }
    mark_branch_for_loaded_leaves(node){
        node.has_loaded_leaves=true;
        if (node.parent)
            this.mark_branch_for_loaded_leaves(node.parent);
    }
    filter_collapsed_nodes(node){
        if (node.data.expanded) {
            node.children = (node.children) ? node.children : node._children;
            node._children = null;
        } else {
            node._children = node.children;
            if (node.has_loaded_leaves && node._children){
                node.children = node._children.filter(d=>d.has_loaded_leaves)
            }else {
                node.children = null;
            }
        }
        if (node.children){
            node.children.sort((a,b)=>a.has_loaded_leaves?1:-1);
            node.children.forEach(n=>{
                n.data.expanded=node.data.expanded&&n.data.expanded;
                this.filter_collapsed_nodes(n)
            });
        }
    }
    requestAll(tree){
        tree.expanded = true;
        if (tree.taxId) {
            this.dipatcher.call("spaciesRequested", this, tree.taxId);
        }
        if(tree.children) {
            tree.children.forEach(d=>this.requestAll(d))
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
        root.leaves().filter(d=>d.data.loaded).forEach(d=>this.mark_branch_for_loaded_leaves(d));
        this.filter_collapsed_nodes(root);
        root.sort((a,b)=>{
            return a.has_loaded_leaves?1:-1;
        });
        root.eachBefore(function computeHeight(node) {
            var height = 0;
            do node.height = height;
            while ((node = node.parent) && (node.height < ++height));
        });

        const leaves = root.leaves().filter(d=>d.data.loaded),
            ol = leaves.length;
        this.organisms = leaves.map(n=>n.data.id);

        // Precompute the orders.
        this.orders = {
            tax_id: d3.range(ol).sort((a, b) => leaves[a].data.taxId - leaves[b].data.taxId),
            org_name: d3.range(ol).sort((a, b) => leaves[a].data.species - leaves[b].data.species),
            tree: d3.range(ol).sort((a, b) => leaves[a].data.lineage - leaves[b].data.lineage),
        };
        if (!this.current_order || this.current_order.length!=leaves.length)
            this.current_order = this.orders.tree;

        const tree = d3.tree()
            .size([this.width-this.cell_side*leaves.length, this.height]);
        tree(root);
        this.tree(root);
        const t = d3.transition().duration(time).delay(100),
            visible_nodes = root.descendants().filter(d=>(
                d.data.expanded ||
                d.parent.data.expanded ||
                d.parent.has_loaded_leaves
            ));

        d3.select(".taxon_tree").attr("transform",
            "translate(0 ,"
            +(-this.height+20)
            +")");
        const link = this.tree_g.selectAll(".link")
            .data(root.links(), d=>
                d.source.id>d.target.id?d.source.id+d.target.id:d.target.id+d.source.id);

        link.style("stroke-dashoffset",0).transition(t).attr("d", (d, i) =>
            "M" + d.target.x + "," + d.target.y +
            "V" + (d.source.y+10) +
            "H" + d.source.x+
            "V" + (d.source.y + this.node_r)
        );

        link.exit().transition(t).attr("stroke-dashoffset",-1000)
            .remove();
        link.enter().append("path")
            .attr("class", "link")
            .attr("d", (d, i) =>
                "M" + d.target.x + "," + d.target.y +
                "V" + (d.source.y+10) +
                "H" + d.source.x+
                "V" + (d.source.y + this.node_r)
            )
            .attr("stroke-dasharray",1000)
            .attr("stroke-dashoffset",-1000)
            .transition(t).attr("stroke-dashoffset",0)
        ;

        this.node_manager.draw_nodes(visible_nodes, t);
    }
    set_organisms_loaded(tax_id, tax_loaded){
        this.nodes[tax_id].loaded=true;
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
    change_tax_label(type){
        this.tax_label_type = type;
        this.update_tree();
    }
}
