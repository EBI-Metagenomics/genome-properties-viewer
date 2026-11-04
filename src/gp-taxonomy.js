import * as d3 from "./d3";
import TaxonomyNodeManager from "./gp-tax-node";

export default class GenomePropertiesTaxonomy {
  constructor({
    path,
    x = 0,
    y = 0,
    width = 200,
    height = 600,
    show_tree = true,
  }) {
    this.nodes = null;
    this.root = null;
    this.path = path;
    this.x = x;
    this.y = y;
    this.width = width;
    this.cell_side = 20;
    this.height = height;
    this.current_order = [];
    this.organisms = [];
    this.svg = null;
    this.collapse_tree = true;
    this.show_tree = show_tree;
    this.dataOffsetX = 0;
    this.dipatcher = d3.dispatch(
      "changeOrder",
      "spaciesRequested",
      "multipleSpaciesRequested",
      "changeWidth",
      "taxonomyLoaded",
      "removeSpacies"
    );
    this.node_r = 6;
    this.tax_label_type = "name";
    this.node_manager = new TaxonomyNodeManager(this, this.node_r);
    return this;
  }

  load_taxonomy() {
    fetch(this.path)
      .then((response) => {
        if (!response.ok)
          throw new Error(`${response.status} ${response.statusText}`);
        return response.json;
      })
      .then((data) => {
        this.load_taxonomy_obj(data);
      });
    return this;
  }

  load_taxonomy_obj(data) {
    this.root = data;
    this.root.parent = null;
    this.nodes = this.load_nodes(this.root);
    this.root.expanded = true;
    this.dipatcher.call("taxonomyLoaded", this, this.root);
    this.update_tree(500);
  }

  load_nodes(node) {
    if (this.nodes === null) this.nodes = {};
    node.id = node.id || node.taxid;
    this.nodes[node.taxid] = node;
    this.nodes[node.taxid].expanded = false;
    if (node.children === null || node.children.length < 1)
      this.organisms.push(node.taxid);
    node.children.forEach((child) => {
      this.load_nodes(child);
    });
    return this.nodes;
  }

  draw_tree_panel(svg, treeClipId = null) {
    this.svg = svg;
    this.tree_layer = svg.append("g").attr("class", "taxon_tree_layer");
    if (treeClipId) {
      this.tree_layer.attr("clip-path", `url(#${treeClipId})`);
    }
    this.tree_g = this.tree_layer
      .append("g")
      .attr("class", "taxon_tree")
      .attr("transform", `translate(${this.x}, ${this.y})`);
    this.node_manager.tree_g = this.tree_g;
  }

  // Walks the tree and calculates x,y values for each node.
  // Leaves run along X so they line up with species columns; depth runs down Y.
  tree(node, deepness = 0) {
    let avg = 0;

    if (node.has_loaded_leaves) {
      if (node.children) {
        for (const child of node.children) {
          this.tree(child, deepness + 1);
          avg += child.x;
          node.deepness =
            !node.deepness || child.deepness > node.deepness
              ? child.deepness
              : node.deepness;
        }
        node.x = avg / node.children.length;
        const leafY = Math.max(0, this.height - this.y - this.cell_side);
        node.y = (deepness / (node.deepness || 1)) * leafY;
      } else {
        node.x =
          (this.dataOffsetX || 0) +
          this.cell_side / 3 +
          this.cell_side *
            this.current_order.indexOf(this.organisms.indexOf(node.data.taxid));
        node.y = Math.max(0, this.height - this.y - this.cell_side);
        node.deepness = deepness;
      }
    }
  }

  prune_inner_nodes(tree, depth = 0) {
    if (!tree.label) tree.label = tree.data.name;
    if (!tree.taxid) tree.taxid = tree.data.taxid;
    tree.depth = depth;
    if (tree.children) {
      if (tree.children.length === 1) {
        tree.label = tree.children[0].data.name;
        tree.height = tree.children[0].height;
        tree.data = tree.children[0].data;
        tree.children = tree.children[0].children;
        if (tree.children)
          for (const child of tree.children) child.parent = tree;
        this.prune_inner_nodes(tree, depth);
      } else
        for (const child of tree.children)
          this.prune_inner_nodes(child, depth + 1);
    }
  }

  mark_branch_for_loaded_leaves(node) {
    node.has_loaded_leaves = true;
    if (node.parent) this.mark_branch_for_loaded_leaves(node.parent);
  }

  filter_collapsed_nodes(node) {
    if (node.data.expanded) {
      node.children = node.children ? node.children : node._children;
      node._children = null;
    } else {
      node._children = node.children;
      if (node.has_loaded_leaves && node._children) {
        node.children = node._children.filter((d) => d.has_loaded_leaves);
      } else {
        node.children = null;
      }
    }
    if (node.children) {
      node.children.sort((a) => (a.has_loaded_leaves ? -1 : 1));
      node.children.forEach((n) => {
        n.data.expanded = node.data.expanded && n.data.expanded;
        this.filter_collapsed_nodes(n);
      });
    }
  }

  requestAll(tree) {
    tree.expanded = true;
    if (!tree.children || tree.children.length === 0) {
      this.dipatcher.call("spaciesRequested", this, tree.taxid);
    }
    if (tree.children) {
      tree.children.forEach((d) => this.requestAll(d));
    }
  }

  getLeaves(tree) {
    if (!tree.children || tree.children.length === 0) {
      return [tree.taxid];
    }
    if (tree.children) {
      const leaves = [];
      for (const child of tree.children) {
        leaves.splice(0, 0, ...this.getLeaves(child));
      }
      return leaves;
    }
    return null;
  }

  set_organisms_loaded(tax_id, isFromFile) {
    if (tax_id in this.nodes) this.nodes[tax_id].loaded = true;
    else {
      this.nodes[tax_id] = {
        id: tax_id,
        loaded: true,
        taxid: tax_id,
        name: tax_id,
        isFromFile,
      };
      this.root.children.push(this.nodes[tax_id]);
    }
    // this.organisms.sort((a,b)=>{
    //     return tax_loaded.indexOf(tax_loaded.indexOf(String(this.nodes[a].taxid))-tax_loaded.indexOf(String(this.nodes[b].taxid)));
    // });
  }

  // A fake tree is created when the taxonomy is hidden.
  // The new tree is only the root and the loaded leaves.
  // This method either contructs the fake tree or uses the taxonomy one.
  get_tree_to_show() {
    const leaves = Object.values(this.nodes).filter((d) => d.loaded);
    leaves.forEach((l) => {
      if (this.show_tree) {
        l.parent = l.parent === "fake-root" ? l._parent : l.parent;
        l._parent = null;
      } else {
        l._parent = l.parent === "fake-root" ? l._parent : l.parent;
        l.parent = "fake-root";
      }
    });
    if (this.show_tree) {
      return this.root;
    }
    return {
      children: leaves,
      expanded: true,
      id: "fake-root",
      lineage: "",
      number_of_leaves: leaves.length,
      parent: null,
      rank: null,
      name: "root",
      taxid: "root",
      taxonomy: "",
    };
  }

  update_tree(time = 0, cell_side = null) {
    if (this.root === null || !this.tree_g) return;
    if (cell_side !== null) this.cell_side = cell_side;
    this.tree_g.attr("transform", `translate(${this.x}, ${this.y})`);

    const root = d3.hierarchy(this.get_tree_to_show());

    if (this.show_tree && this.collapse_tree) this.prune_inner_nodes(root);
    else
      root.descendants().forEach((e) => {
        e.label = e.data.name || e.data.taxid;
      });

    root
      .leaves()
      .filter((d) => d.data.loaded)
      .forEach((d) => this.mark_branch_for_loaded_leaves(d));
    this.filter_collapsed_nodes(root);
    root.sort((a) => (a.has_loaded_leaves ? -1 : 1));
    root.eachBefore((node) => {
      let height = 0;
      do {
        node.height = height;
        node = node.parent;
      } while (node && node.height < ++height);
    });

    const leaves = root
      .leaves()
      .filter((d) => d.data.loaded)
      .sort((a, b) => a.data.taxid - b.data.taxid);
    const ol = leaves.length;
    this.organisms = leaves.map((n) => n.data.taxid);
    this.dataOffsetX = Math.max(
      0,
      this.width - this.organisms.length * this.cell_side
    );

    // Precompute the orders.
    this.orders = {
      tax_id: d3
        .range(ol)
        .sort((a, b) => leaves[a].data.taxid - leaves[b].data.taxid),
      org_name: d3
        .range(ol)
        .sort((a, b) => (leaves[a].data.name > leaves[b].data.name ? 1 : -1)),
      tree1: d3
        .range(ol)
        .sort((a, b) =>
          leaves[a].data.lineage > leaves[b].data.lineage ? 1 : -1
        ),
      tree2: d3
        .range(ol)
        .sort((a, b) =>
          leaves[a].data.lineage > leaves[b].data.lineage ? -1 : 1
        ),
    };
    if (!this.current_order || this.current_order.length !== leaves.length)
      this.current_order = this.orders.tree1;
    const layoutHeight = Math.max(
      this.cell_side,
      this.height - (this.y || 0) - this.cell_side
    );
    const tree_f = d3
      .tree()
      .size([Math.max(this.cell_side, this.width), layoutHeight]);
    tree_f(root);
    this.tree(root);
    const t = this.tree_g.transition().duration(time).delay(100);
    const visible_nodes = root.descendants().filter((d) => {
      if (!d.parent) return true;
      return (
        d.data.expanded ||
        d.parent.data.expanded ||
        d.parent.has_loaded_leaves
      );
    });

    const link = this.tree_g
      .selectAll(".link")
      .data(root.links(), (d) =>
        d.source.data.id > d.target.data.id
          ? d.source.data.id + d.target.data.id
          : d.target.data.id + d.source.data.id
      );

    link
      .style("stroke-dashoffset", 0)
      .transition(t)
      .attr(
        "d",
        (d) =>
          `M${d.source.x},${d.source.y}V${d.source.y + 10}H${d.target.x}V${
            d.target.y
          }`
      );

    link.exit().transition(t).attr("stroke-dashoffset", -1000).remove();
    link
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        (d) =>
          `M${d.source.x},${d.source.y}V${d.source.y + 10}H${d.target.x}V${
            d.target.y
          }`
      )
      .style("stroke", (d) =>
        d.target.data.isFromFile ||
        d.target.data.parent === "fake-root" ||
        (d.target.data.parent &&
          d.target.data.parent.data &&
          d.target.data.parent.data.taxid === "fake-root")
          ? "transparent"
          : null
      )
      .attr("stroke-dasharray", 1000)
      .attr("stroke-dashoffset", -1000)
      .transition(t)
      .attr("stroke-dashoffset", 0);

    this.node_manager.draw_nodes(visible_nodes, t);
  }

  get_tax_list() {
    return this.organisms.map((d) => this.nodes[d].taxid);
  }

  on(typename, callback) {
    this.dipatcher.on(typename, callback);
    return this;
  }

  change_tax_label(type) {
    this.tax_label_type = type;
    this.update_tree();
  }

  remove_organism_loaded(tax_id, isFromFile) {
    this.nodes[tax_id].loaded = false;
    if (isFromFile) {
      const i = this.root.children.indexOf(this.nodes[tax_id]);
      this.root.children.splice(i, 1);
      delete this.nodes[tax_id];
    }
  }

  sortBy(method) {
    this.current_order = this.orders[method];
    this.dipatcher.call("changeOrder", this, this.current_order);
  }
}
