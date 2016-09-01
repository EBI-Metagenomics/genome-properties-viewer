"use strict";

import * as d3 from "./d3";
// TODO: Genome properties categories
// TODO: Focus/Filter on a tax branch.
// TODO: tree frame resizable
// TODO: Piechart in bottom frame
// TODO: height and width using window size
// TODO: Color tree
// DONE: Piechart per organism
// DONE: Make cell size editable - Via Zooming
// DONE: Order by tree
// DONE: Make collapsing tree optional
// DONE: Cells should be squares
// DONE: Organism name in bottom frame
// DONE: Drag from inner nodes
// DONE: Total column fix width
export default class GenomePropertiesViewer {

    constructor({
        margin={top: 180, right: 10, bottom: 0, left: 80},
        width= 600,
        height= 700,
        element_selector= "body",
        cell_side= 20,
        bottom_panel_height=80,
        total_panel_height=cell_side,
        server= "../test-files/SUMMARY_FILE_",
        server_tax= "../test-files/Taxon_"
    }){
        this.data = {};
        this.organisms = [];
        this.organism_names = {};
        this.organism_totals = {};
        this.taxonomy_raw = [];
        this.options = {margin, width, height, element_selector, cell_side, server, server_tax,bottom_panel_height,total_panel_height};
        this.column_total_width = cell_side;
        this.x = d3.scaleBand().range([0, width-this.column_total_width]);
        this.y = d3.scaleLinear().range([0, height]);
        this.gp_values =["YES", "PARTIAL", "NO"];
        this.collapse_tree = true;
        this.c = {
            "YES":"rgb(49, 130, 189)",
            "PARTIAL": "rgb(107, 174, 214)",
            "NO": "rgb(210,210,210)"
        };
        this.current_order=null;

        this.svg = d3.select(element_selector).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(d3.zoom()
                .scaleExtent([20, 80])
                .on("zoom", () => {
                    this.options.cell_side = d3.event.transform.k;
                    this.update_viewer();
                }));

        this.draw_rows_panel();
        this.draw_columns_panel();
        this.draw_bottom_panel();
        this.draw_total_per_organism_panel();
        this.draw_tree_panel();
    }

    load_genome_properties_file(tax_id) {
        if (this.organisms.indexOf(tax_id) != -1)
            return;
        d3.text(`${this.options.server}${tax_id}`)
            .get((error, text) => {
                if (error) throw error;
                this.organisms.push(tax_id);
                this.organism_totals[tax_id] = {"YES":0, "NO":0, "PARTIAL":0};
                d3.tsvParseRows(text, (d) => {
                    if (!(d[0] in this.data))
                        this.data[d[0]] = {
                            property: d[0],
                            name: d[1],
                            values: {"TOTAL": {"YES":0, "NO":0, "PARTIAL":0}}
                        };
                    if (tax_id in this.data[d[0]]["values"])
                        return;
                    this.data[d[0]]["values"][tax_id] = d[2];
                    this.data[d[0]]["values"]["TOTAL"][d[2]]++;
                    this.organism_totals[tax_id][d[2]]++;
                });
                d3.xml(this.options.server_tax+tax_id, (error, xml) => {
                    if (error) throw error;
                    let data = [].map.call(xml.querySelectorAll("lineage taxon"), (taxon) => {
                        this.organism_names[taxon.getAttribute("taxId")] = taxon.getAttribute("scientificName");
                        return {
                            scientificName: taxon.getAttribute("scientificName"),
                            taxId: taxon.getAttribute("taxId"),
                            rank: taxon.getAttribute("rank"),
                        };
                    });
                    let taxon = xml.querySelector("taxon"),
                        data2 = {
                            scientificName: taxon.getAttribute("scientificName"),
                            taxId: taxon.getAttribute("taxId"),
                            rank: taxon.getAttribute("rank"),
                        };
                    this.organism_names[taxon.getAttribute("taxId")] = taxon.getAttribute("scientificName");

                    data = data.reverse().concat([data2]).reduce(
                        (agg, e)=> agg.concat({node:e, parent:agg.length==0?"":agg[agg.length-1].node}), []
                    );
                    // data.forEach(d=> console.log(tax_id, d.node.taxId, d.parent.taxId));
                    this.merge_with_current_taxonomy(data);

                    this.update_viewer();
                });
            });
    }

    merge_with_current_taxonomy (new_tax){
        if (this.taxonomy_raw.length==0) {
            this.taxonomy_raw = new_tax;
            return;
        }
        const ids = this.taxonomy_raw.map(d=>d.node.taxId);
        for (let i=new_tax.length-1; i>=0; i--){
            if (ids.indexOf(new_tax[i].parent.taxId)!=-1){
                this.taxonomy_raw = this.taxonomy_raw.concat(new_tax.slice(i));
                return;
            }
        }

    }

    draw_tree_panel(){
        // this.tree = d3.cluster()
        //     .size([this.options.width - this.column_total_width,this.options.margin.top-20]);
        this.tree_g = this.svg.append("g")
            .attr("class", "taxon_tree")
            .attr("transform", "translate(0,"+(-this.options.margin.top+20)+")");
        this.stratify = d3.stratify()
            .id(function(d) { return d.node.taxId; })
            .parentId(function(d) { return d.parent.taxId; })
    }


    prune_inner_nodes(tree){
        if (!tree.label)
            tree.label = tree.id;
        if (tree.children){
            if (tree.children.length == 1){
                tree.id += "."+tree.children[0].id;
                tree.label = tree.children[0].id;
                tree.height = tree.children[0].height;
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

    tree(root, deepness=0){
        const ol = this.organisms.length,
            w = this.options.cell_side*ol,
            h = this.options.margin.top-20,
            w_fr = w/ol;
        let avg=0;
        root.y = h;
        if (root.children) {
            for (let child of root.children){
                this.tree(child, deepness+1);
                avg += child.x;
                root.y = child.y<root.y?child.y:root.y;
                root.deepness = (!root.deepness || child.deepness>root.deepness)?child.deepness:root.deepness;
            }
            root.x=avg/root.children.length;
            root.y -= h/root.deepness;
        } else {
            root.x = w_fr/2 + w_fr*this.current_order.indexOf(this.organisms.indexOf(root.label));
            root.y = h;
            root.deepness = deepness;
        }

    }
    get_root(tree){
        if (tree.parent)
            return this.get_root(tree.parent)
        return tree;
    }
    update_tree(time=0){
        const root = this.stratify(this.taxonomy_raw);
        if (this.collapse_tree)
            this.prune_inner_nodes(root);
        else
            root.descendants().forEach(e=>e.label=e.id);
        this.tree(this.get_root(root));
        const t = d3.transition().duration(time),
            ol = this.organisms.length;

        // Precompute the orders.
        this.orders = {
            tax_id: d3.range(ol).sort((a, b) => this.organisms[a] - this.organisms[b]),
            org_name: d3.range(ol).sort((a, b) => this.organism_names[this.organisms[a]] > this.organism_names[this.organisms[b]]?1:-1),
            tree: root.leaves().sort((a,b)=>a.depth-b.depth).map(d=>this.organisms.indexOf(d.label))
        };
        d3.select(".taxon_tree").attr("transform",
            "translate("+(this.options.width - this.options.cell_side*ol -this.column_total_width )+","+(-this.options.margin.top+20)+")");
        var link = this.tree_g.selectAll(".link")
            .data(root.links(root.descendants()), d=>
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
            .data(root.descendants(), d=>d.id);


        node.transition(t)
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")");

        node.exit().remove();
        const node_e = node
            .enter().append("g")
            .attr("class", d => "node "+ d.label + (d.children ? " node--internal" : " node--leaf") )
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")" )
            .on("mouseover", d => d3.select("#info_organism").text(`${d.label}: ${this.organism_names[d.label]}`))
            .on("mouseout", d => d3.select("#info_organism").text(""))
            .call(d3.drag()
                .subject(function(){
                    const g = d3.select(this),
                        t = g.attr("transform").match(/translate\((.*),(.*)\)/);
                    return {
                        x:Number(t[1]) + Number(g.attr("x")),
                        y:Number(t[2]) + Number(g.attr("y")),
                    };
                })
                .on("drag", function() {
                    d3.event.sourceEvent.stopPropagation();
                    d3.select(this).attr("transform",
                        d => "translate(" + d3.event.x + "," + d.y + ")"
                    );
                })
                .on("end", function(_this) {
                    return function (d) {
                        const w = _this.x.bandwidth(),
                            dx = (d3.event.x - d.x);// - w/2,
                        let d_col = Math.round(dx / w);
                        move_tree(_this,d,d_col);
                        var t = d3.transition().duration(500);
                        d3.select(this).transition(t).attr("transform",
                            d => "translate(" + d.x + "," + d.y + ")");

                    }
                }(this))
            );

        function move_tree(_this,d, d_col) {
            // const e = d3.select(d).data()[0];
            if (!d.children) {
                move_leaf(_this,d,d_col);
            } else {
                d.children.sort((a,b)=>d_col>0?b.x-a.x:a.x-b.x);
                for (let child of d.children)
                    move_tree(_this,child,d_col);
            }

        }
        function move_leaf(_this,d, d_col){
            const current_i = _this.organisms.indexOf(d.label),
                current_o = _this.current_order.indexOf(current_i);
            d_col = current_o+d_col<0?-current_o:d_col;
            if (d_col != 0) {
                const e = _this.current_order.splice(current_o, 1);
                _this.current_order.splice(current_o+d_col, 0, e[0]);
                _this.order_organisms_current_order();
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
            .text(d =>  d.label);


    }

    draw_rows_panel() {
        this.rows = this.svg.append("g")
            .attr("class", "gpv-rows-group")
            .attr("transform", "translate(0,0)")
            .call(d3.drag() // Window panning.
                .subject(function(){
                    const g = d3.select(this),
                        t = g.attr("transform").match(/translate\((.*),(.*)\)/);
                    return {
                        x:Number(t[1]) + Number(g.attr("x")),
                        y:Number(t[2]) + Number(g.attr("y")),
                    };
                })
                .on("drag", function(_this) {
                    return function() {
                        d3.event.sourceEvent.stopPropagation();
                        const dy = Math.max(
                            Math.min(d3.event.y, 0),
                            _this.options.height
                            + _this.options.margin.bottom
                            + _this.options.bottom_panel_height
                            - _this.props.length*_this.y(1)
                            - _this.options.margin.top
                        );
                        d3.select(".gpv-rows-group")
                            .attr("transform", d => "translate(0, " + dy + ")");
                        _this.update_viewer();
                    }
                }(this))
            );
    }

    draw_columns_panel() {
        this.svg.append("rect")
            .attr("class", "background")
            .attr("x",-this.options.margin.left)
            .attr("y",-this.options.margin.top)
            .attr("width", this.options.width + this.options.margin.left)
            .attr("height", this.options.margin.top);

        this.cols = this.svg.append("g")
            .attr("class", "gpv-cols-group");

        this.svg.append("text")
            .attr("class", "total_title")
            .attr("x", this.options.width-this.column_total_width*0.4)
            .attr("y", 3)
            .attr("transform", "rotate(-90 "+(this.options.width-this.column_total_width/2)+",0)")
            .attr("opacity",0)
            .text("TOTAL");

    }
    draw_total_per_organism_panel() {
        const ph=this.options.total_panel_height;
        this.total_g = this.svg.append("g")
            .attr("class", "total-group")
            .attr("transform", "translate("+
                (-this.options.margin.left) + ", " +
                (this.options.height-this.options.margin.bottom-this.options.bottom_panel_height-ph) + ")");

        this.total_g.append("rect")
            .attr("class", "background")
            .attr("width", this.options.width + this.options.margin.left)
            .attr("height", ph);
    }

    update_total_per_organism_panel(time=0) {
        const ph=this.options.total_panel_height=this.options.cell_side,
            ol=this.organisms.length,
            w=this.options.width+this.options.margin.left,
            t = d3.transition().duration(time);
        this.total_g
            .attr("transform", "translate("+
                (-this.options.margin.left) + ", " +
                (this.options.height-this.options.margin.bottom-this.options.bottom_panel_height-ph) + ")");
        this.total_g.selectAll(".background")
            .attr("height", ph);

        const arc = d3.arc()
            .outerRadius(ph*0.4)
            .innerRadius(0);

        const pie = d3.pie()
            .value(d => d.value);


        const cells_t = this.total_g.selectAll(".total_cell_org")
            .data(d3.entries(this.organism_totals)
                    .sort ((a,b)=>this.organisms.indexOf(a.key) - this.organisms.indexOf(b.key)),
                d=>d.key);

        cells_t.transition(t)
            .attr("transform", (d,i)=>"translate("+(this.x(i)+ph/2+this.options.margin.left)+", "+ph*0.5+")");

        cells_t.enter().append("g")
            .attr("class", "total_cell_org")
            .attr("transform", (d,i)=>"translate("+(this.x(i)+ph/2+this.options.margin.left)+", "+ph*0.5+")")
            .on("mouseover", p => {
                d3.selectAll(".node--leaf text").classed("active", function() {
                    return this.textContent == p.key;
                });
                d3.select("#info_organism").text(`${p.key}: ${this.organism_names[p.key]}`);
                this.gr_total.attr("display","block");
                const fr = this.options.bottom_panel_height*0.7/(p.value["YES"]+p.value["NO"]+p.value["PARTIAL"]);

                const info_total_c = this.gr_total
                    .selectAll(".info_total_contribution")
                    .data(this.gr_total.stack([p.value]), d=>d.key);

                info_total_c
                    .attr("y", (d, i) => d[0][0] * fr)
                    .attr("height", (d, i) => {
                        return fr * (d[0][1] - d[0][0])
                    });
            })
            .on("mouseout", d => {
                d3.selectAll(".node--leaf text").classed("active", false);
            });

        const g = cells_t.selectAll(".arc")
            .data(d=>pie(d3.entries(d.value)));

        cells_t.selectAll(".arc").transition(t)
            .attr("d", arc)
            .attr("transform", "scale(1)");

        g.enter().append("path")
            .attr("class", "arc")
            .attr("d", arc)
            .style("fill", d => this.c[d.data.key]);

    }
    draw_bottom_panel(){
        const height_panel = this.options.bottom_panel_height,
            h_i = height_panel*0.8/this.gp_values.length,
            w = 100;

        const bottom_g = this.svg.append("g")
            .attr("class", "bottom-group")
            .attr("transform", "translate("+
                (-this.options.margin.left) + ", " +
                (this.options.height-this.options.margin.bottom-height_panel) + ")");

        bottom_g.append("rect")
            .attr("class", "background")
            .attr("width", this.options.width + this.options.margin.left)
            .attr("height", height_panel);

        // Drawing the legend
        const legend_g = bottom_g.append("g")
            .attr("class", "legend-group")
            .attr("transform", "translate("+
                (this.options.width+this.options.margin.left-w-this.options.margin.right) + ", " +
                (height_panel*0.1) + ")");

        legend_g.append("rect")
            .attr("width", w)
            .style("fill","white")
            .style("stroke","#ccc")
            .style("stroke-width","1px")
            .attr("height", height_panel*0.8);

        const legend_item = legend_g.selectAll(".legend-item")
            .data(this.gp_values)
            .enter().append("g")
            .attr("class", "legend-group");

        legend_item.append("text")
            .attr("x", w/2)
            .attr("y", (d,i) => 12 + i*h_i)
            .attr("dy", ".32em")
            .attr("text-anchor", "end")
            .text(d=>d);

        legend_item.append("rect")
            .attr("x", w*0.05+w/2)
            .attr("y", (d,i) => (0.1+i)*h_i)
            .attr("width", w*0.4)
            .attr("height", h_i*0.8)
            .style("fill", d => this.c[d]);

        const info_g = bottom_g.append("g")
            .attr("class", "info-group")
            .attr("transform", "translate(10, " +
                (height_panel*0.1) + ")");

        info_g.append("rect")
            .style("fill","white")
            .style("stroke","#ccc")
            .style("stroke-width","1px")
            .attr("width", this.options.width+ this.options.margin.left - w -this.options.margin.right - 20)
            .attr("height", height_panel*0.8);

        const info_item = info_g.selectAll(".legend-item")
            .data(["Property", "Name", "Organism"])
            .enter().append("g")
            .attr("class", "info-group");

        info_item.append("text")
            .attr("x", w*0.9)
            .attr("y", (d,i) => 12 + i*h_i)
            .attr("dy", ".32em")
            .attr("text-anchor", "end")
            .text(d=>d+":");

        info_item.append("text")
            .attr("id", (d,i) => "info_"+d.toLocaleLowerCase())
            .attr("x", w)
            .attr("y", (d,i) => 12 + i*h_i)
            .attr("dy", ".32em")
            .text("");

        info_g.append("rect")
            .attr("id", "info_value")
            .style("fill","white")
            .style("stroke","#ccc")
            .style("stroke-width","1px")
            .attr("x", this.options.width+this.options.margin.left - w -this.options.margin.right - this.options.margin.left - 30)
            .attr("y", height_panel*0.05)
            .attr("width", this.options.margin.left)
            .attr("height", height_panel*0.7);

        const stack = d3.stack()
                .keys(["YES","PARTIAL","NO"]);

        this.gr_total = info_g.append("g")
            .attr("id", "info_total")
            .attr("transform", "translate("+(this.options.width + this.options.margin.left - w -this.options.margin.right - this.options.margin.left - 30)+", " +
                (height_panel*0.05) + ")");
        this.gr_total.stack = stack;

        const info_total_c = this.gr_total
            .selectAll(".info_total_contribution")
            .data(stack([{YES: 0, NO: 0, PARTIAL: 0}]), d=>d.key);

        info_total_c.enter().append("rect")
            .attr("class", "info_total_contribution")
            .attr("height",(d,i) => 0)
            .attr("y", 0)
            .attr("width", this.options.margin.left)
            .style("fill", d => this.c[d.key]);

    }

    update_viewer() {
        this.props = d3.values(this.data);
        this.column_total_width = this.options.cell_side;
        this.x.range([this.options.width-this.column_total_width-this.options.cell_side*this.organisms.length, this.options.width-this.column_total_width]);

        const visible_rows = Math.min(
            this.props.length,
            Math.round(this.options.height/this.options.cell_side)
        );
        this.y.domain([0, visible_rows]);
        let dy = -Math.floor(
            d3.select(".gpv-rows-group").attr("transform").match(/translate\((.*),(.*)\)/)[2]/this.y(1)
        )-2;
        dy = dy<0?0:dy;
        this.current_props = this.props.slice(dy,visible_rows+dy+1);

        const n = this.organisms.length;
        if (this.current_order==null || this.current_order.length != this.organisms.length) {
            this.x.domain(d3.range( this.organisms.length));
            this.current_order = d3.range( this.organisms.length);
        }
        this.update_tree();

        let row_p = this.rows.selectAll(".row")
            .data(this.current_props, d=>d.property);

        row_p // .transition(t)
            .attr("transform", (d,i) => "translate(0," + this.y(i+dy) + ")")
            .each(update_row(this));

        row_p.exit().remove();
        let row = row_p.enter().append("g")
                .attr("id", d => "row_"+d.property)
                .attr("class", "row")
                .attr("transform", (d,i) => "translate(0," + this.y(i+dy) + ")")
                .each(update_row(this));
        row.append("line")
            .attr("x2", this.options.width);


        d3.selectAll(".total_title").attr("opacity",1);

        row_p.selectAll(".row_title")
            .attr("x", this.x.range()[0]-6)
            .attr("y", this.options.cell_side / 2);

        row.append("text")
            .attr("class", "row_title")
            .attr("x", this.x.range()[0]-6)
            .attr("y", this.options.cell_side / 2)
            .attr("dy", ".32em")
            .attr("text-anchor", "end")
            .text( d => d.property );



        let column_p = this.cols.selectAll(".column")
            .data(this.organisms, p=>p);

        column_p.attr("transform", (d,i) => "translate(" + this.x(i) + ")rotate(-90)");

        let column = column_p
            .enter().append("g")
            .attr("class", "column")
            .attr("transform", (d,i) => "translate(" + this.x(i) + ")rotate(-90)");

        column.append("line").attr("x1", -this.options.height);

        this.update_total_per_organism_panel();

        function update_row(_this){
            return function(r) {
                let cells = d3.select(this).selectAll(".cell")
                    .data(_this.organisms, d=>d);
                const cell_height = _this.options.cell_side,
                    ol = _this.organisms.length;

                cells
                    .attr("x", (d,i) => _this.x(i))
                    .attr("height", cell_height)
                    .attr("width", _this.x.bandwidth());

                cells = cells.enter().append("rect")
                    .attr("class", "cell")
                    .attr("x", (d,i) => _this.x(i))
                    .attr("height", cell_height)
                    .attr("width", _this.x.bandwidth())
                    .on("mouseover", mouseover(_this))
                    .on("mouseout", mouseout)
                    .style("fill", d => d in r.values ? _this.c[r.values[d]] : null);

                const arc = d3.arc()
                    .outerRadius(cell_height*0.4)
                    .innerRadius(0);
                const pie = d3.pie()
                    .value(d => d.value);

                const cells_t = d3.select(this).selectAll(".total_cell")
                    .data(["TOTAL"], d=>d);

                cells_t
                    .attr("transform", "translate("+(_this.options.width-_this.column_total_width/2)+", "+cell_height*0.5+")");

                cells_t.enter().append("g")
                    .attr("class", "total_cell")
                    .attr("transform", "translate("+(_this.options.width-_this.column_total_width/2)+", "+cell_height*0.5+")")
                    .on("mouseover", mouseover(_this))
                    .on("mouseout", mouseout);

                const g = cells_t.selectAll(".arc")
                    .data(pie(d3.entries(r.values["TOTAL"])));

                cells_t.selectAll(".arc")
                    .attr("d", arc);

                g.enter().append("path")
                    .attr("class", "arc")
                    .attr("d", arc)
                    .style("fill", d => _this.c[d.data.key]);

            };
        }
        function mouseover(_this) {
            return function(p) {
                d3.select(this.parentNode).select("text").classed("active", true);
                d3.selectAll(".node--leaf text").classed("active", d => d == p);
                const data = d3.select(this.parentNode).data();
                if (data.length < 1) return;

                d3.select("#info_property").text(data[0].property);
                d3.select("#info_name").text(data[0].name);
                d3.select("#info_organism").text(`${p}: ${_this.organism_names[p]}`);
                d3.select("#info_value").style("fill", _this.c[data[0].values[p]]);

                if ("TOTAL"==p) {
                    _this.gr_total.attr("display","block");
                    const fr = _this.options.bottom_panel_height*0.7/_this.organisms.length;

                    const info_total_c = _this.gr_total
                        .selectAll(".info_total_contribution")
                        .data(_this.gr_total.stack([data[0].values[p]]), d=>d.key);

                    info_total_c
                        .attr("y", (d, i) => d[0][0] * fr)
                        .attr("height", (d, i) => {
                            return fr * (d[0][1] - d[0][0])
                        });
                    d3.select("#info_organism").text("TOTAL: {YES: "+data[0].values[p]["YES"]+", PARTIAL: "+data[0].values[p]["PARTIAL"]+", NO: "+data[0].values[p]["NO"]+"}");
                } else {
                    _this.gr_total.attr("display","none");
                }
            }
        }

        function mouseout(p) {
            d3.selectAll("text").classed("active", false);
            d3.selectAll(".gpv-name").remove();
            d3.select("#info_property").text("");
            d3.select("#info_name").text("");
            d3.select("#info_organism").text("");
            d3.select("#info_value").style("fill","white");
            if ("TOTAL"==p)
               d3.selectAll("#info_total").attr("display","none");
        }



    }
    order_organisms(value) {
        this.current_order = this.orders[value];
        this.order_organisms_current_order();
    }
    order_organisms_current_order(){
        this.x.domain(this.current_order);
        this.update_tree(1000);
        this.update_total_per_organism_panel(1000);

        const t = d3.transition().duration(1000);

        t.selectAll(".row").selectAll(".cell")
            .attr("x", (d,i) => {
                return this.x(i);
            });

        t.selectAll(".column")
            .attr("transform", (d, i) => "translate(" + this.x(i) + ")rotate(-90)");

    }

}
