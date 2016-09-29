"use strict";

import * as d3 from "./d3";
import GenomePropertiesHierarchy from "./gp-hierarchy";
import GenomePropertiesTaxonomy from "./gp-taxonomy";

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
        server_tax = "taxonomy.json",
        hierarchy_path = "../test-files/gp.dag.txt"
    }){
        this.data = {};
        this.organisms = [];
        this.organism_names = {};
        this.organism_totals = {};
        this.options = {
            margin, width, height, element_selector, cell_side, server, server_tax,
            bottom_panel_height, total_panel_height, hierarchy_path};
        this.column_total_width = cell_side;
        this.x = d3.scaleBand().range([0, width-this.column_total_width]);
        this.y = d3.scaleLinear().range([0, height]);
        this.gp_values =["YES", "PARTIAL", "NO"];
        this.c = {
            "YES":"rgb(49, 130, 189)",
            "PARTIAL": "rgb(107, 174, 214)",
            "NO": "rgb(210,210,210)"
        };
        this.current_order=null;
        this.legend_block_heigth=this.options.bottom_panel_height/5;
        this.legend_block_width=100;

        this.svg = d3.select(element_selector).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .on('wheel',()=>{
                d3.event.preventDefault();
                // ZOOMING
                if (d3.event.ctrlKey || d3.event.shiftKey){
                    this.svg.k= (this.svg.k!=null)?this.svg.k-d3.event.deltaY/2:0;
                    if (this.svg.k<20) this.svg.k = 20;
                    if (this.svg.k>120) this.svg.k = 120;
                    this.options.cell_side = this.svg.k;
                    this.update_viewer(true);
                }
                // PANNING-SCROLLING
                this.svg.x= (this.svg.x!=null)?this.svg.x+d3.event.deltaX:0;
                this.svg.x = Math.max(0,
                    Math.min(this.svg.x,
                        d3.select(".gpv-rows-group").node().getBBox().width
                        - this.options.width
                        - this.options.margin.left
                    )
                );

                this.svg.y= (this.svg.y!=null)?this.svg.y+d3.event.deltaY:0;
                this.svg.y = Math.min(0,
                    Math.max(this.svg.y,
                    this.options.height
                    + this.options.margin.bottom
                    + this.options.bottom_panel_height*0.6
                    - this.props.length*this.y(1)
                    - this.options.margin.top)
                );
                d3.select(".gpv-rows-group")
                    .attr("transform", "translate(" + this.svg.x + "," + this.svg.y + ")");
                d3.select(".gpv-cols-group")
                    .attr("transform", "translate(" + this.svg.x + ",0)");
                this.update_viewer();
            });
        ;
        this.svg.x=0;
        this.svg.y=0;
        this.create_gradient();

        this.gp_taxonomy = new GenomePropertiesTaxonomy({
                path: server_tax,
                x: 0,
                y: -this.options.margin.top+20,
                width: this.options.width,
                height: this.options.margin.top
            })
            .load_taxonomy()
            .on("changeOrder",(order)=>{
                this.current_order = order;
                this.order_organisms_current_order();
            })
            .on("spaciesRequested",(taxId)=>{
                this.load_genome_properties_file(taxId);
            })
            .on("changeHeight", h=>{
                const dh = this.options.margin.top-h;
                this.options.margin.top=h;
                this.options.height += dh;
                this.y.range([0, this.options.height]);
                this.svg.attr("transform", "translate(" + this.options.margin.left + "," + this.options.margin.top + ")");

                d3.select(".bottom-group")
                    .attr("transform", "translate("+
                        (-this.options.margin.left) + ", " +
                        (this.options.height-this.options.margin.bottom-this.options.bottom_panel_height) + ")");

                this.update_viewer();
            });

        this.gp_hierarchy = new GenomePropertiesHierarchy(
                this.legend_block_width,
                this.legend_block_heigth*4,
                this.options.width -this.options.margin.right,
                this.legend_block_heigth*0.8
            )
            .load_hierarchy_from_path(this.options.hierarchy_path)
            .on("siwtchChanged",()=>{
                this.update_viewer(false, 500);
                this.update_total_per_organism_panel();
            });


        this.draw_rows_panel();
        this.draw_columns_panel();
        this.gp_taxonomy.draw_tree_panel(this.svg);
        this.draw_bottom_panel();
        this.draw_total_per_organism_panel();
    }

    create_gradient(){
        const defs = this.svg.append("defs");
        const gradient_d = defs
            .append("linearGradient")
            .attr("id", "gradientdown")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%");
        gradient_d.append("stop")
            .attr("offset", "85%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 1);
        gradient_d.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 0.5);
        const gradient_u = defs
            .append("linearGradient")
            .attr("id", "gradientup")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%");
        gradient_u.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 0.7);
        gradient_u.append("stop")
            .attr("offset", "35%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 1);
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
                            values: {"TOTAL": {"YES":0, "NO":0, "PARTIAL":0}},
                            parent_top_properties: this.gp_hierarchy.get_top_level_gp_by_id(d[0])
                        };
                    if (tax_id in this.data[d[0]]["values"])
                        return;
                    this.data[d[0]]["values"][tax_id] = d[2];
                    this.data[d[0]]["values"]["TOTAL"][d[2]]++;
                    this.organism_totals[tax_id][d[2]]++;
                });
                this.gp_taxonomy.set_organisms_loaded(tax_id, this.organisms);
                this.update_viewer(false,500);
            });
    }



    draw_rows_panel() {
        this.rows = this.svg.append("g")
            .attr("class", "gpv-rows-group")
            .attr("transform", "translate(0,0)")
            // .call(d3.drag() // Window panning.
            //     .subject(function(){
            //         const g = d3.select(this),
            //             t = g.attr("transform").match(/translate\((.*),(.*)\)/);
            //         return {
            //             x:Number(t[1]) + Number(g.attr("x")),
            //             y:Number(t[2]) + Number(g.attr("y")),
            //         };
            //     })
            //     .on("drag", function(_this) {
            //         return function() {
            //             d3.event.sourceEvent.stopPropagation();
            //             const dy = Math.max(
            //                 Math.min(d3.event.y, 0),
            //                 _this.options.height
            //                 + _this.options.margin.bottom
            //                 + _this.options.bottom_panel_height
            //                 - _this.props.length*_this.y(1)
            //                 - _this.options.margin.top
            //             );
            //             d3.select(".gpv-rows-group")
            //                 .attr("transform", d => "translate(0, " + dy + ")");
            //             _this.update_viewer();
            //         }
            //     }(this))
            // )
        ;
    }

    draw_columns_panel() {
        this.svg.append("rect")
            .attr("class", "background")
            .style("fill", "url(#gradientdown)")
            .attr("x",-this.options.margin.left)
            .attr("y",-this.options.margin.top)
            .attr("width", this.options.width + this.options.margin.left + this.options.margin.right)
            .attr("height", this.options.margin.top);

        this.cols = this.svg.append("g")
            .attr("class", "gpv-cols-group");

        this.cols.append("text")
            .attr("class", "total_title")
            .attr("x", this.options.width-this.column_total_width*0.4)
            .attr("y", 3)
            .attr("transform", "rotate(-90 "+(this.options.width-this.column_total_width/2)+",0)")
            .attr("opacity",0)
            .text("TOTAL");

    }
    draw_total_per_organism_panel() {
        const ph=this.options.total_panel_height;
        this.svg.append("rect")
            .attr("class", "total-background background")
            .style("fill","#fff")
            .style("opacity","0.7")
            .attr("x", -this.options.margin.left)
            .attr("y", this.options.height-this.options.margin.bottom-this.options.bottom_panel_height-ph)
            .attr("width", this.options.width + this.options.margin.left + this.options.margin.right)
            .attr("height", ph);
        this.total_g = this.svg.append("g")
            .attr("class", "total-group")
            .attr("transform", "translate("+
                (-this.options.margin.left) + ", " +
                (this.options.height-this.options.margin.bottom-this.options.bottom_panel_height-ph) + ")");

    }

    refresh_organism_totals(){
        for (let o in this.organism_totals)
            this.organism_totals[o]={"YES":0, "NO":0, "PARTIAL":0};
        this.props.forEach(e=>{
            for (let v in this.organism_totals)
                this.organism_totals[v][e.values[v]]++;
        });
    }

    update_total_per_organism_panel(time=0) {
        const ph=this.options.total_panel_height=this.options.cell_side,
            ol=this.organisms.length,
            w=this.options.width+this.options.margin.left,
            t = d3.transition().duration(time);
        this.total_g
            .attr("transform", "translate("+
                (-this.options.margin.left+this.svg.x) + ", " +
                (this.options.height-this.options.margin.bottom-this.options.bottom_panel_height-ph) + ")");
        this.svg.selectAll(".total-background")
            .attr("y", this.options.height-this.options.margin.bottom-this.options.bottom_panel_height-ph)
            .attr("height", ph);

        const arc = d3.arc()
            .outerRadius(ph*0.4)
            .innerRadius(0);

        const pie = d3.pie()
            .value(d => d.value);

        this.refresh_organism_totals();

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
                this.update_legend(p.value);
            })
            .on("mouseout", () => {
                this.update_legend();
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
            h_legend_item = height_panel/this.gp_values.length,
            h_i= this.legend_block_heigth,
            w = this.legend_block_width,
            empty_total={YES: 0, NO: 0, PARTIAL: 0};

        const bottom_g = this.svg.append("g")
            .attr("class", "bottom-group")
            .attr("transform", "translate("+
                (-this.options.margin.left) + ", " +
                (this.options.height-this.options.margin.bottom-height_panel) + ")");

        bottom_g.append("rect")
            .attr("class", "background")
            .style("fill", "url(#gradientup)")
            .attr("width", this.options.width + this.options.margin.left + this.options.margin.right)
            .attr("height", height_panel);

        // Drawing the legend
        this.legend_g = bottom_g.append("g")
            .attr("class", "legend-group")
            .attr("transform", "translate("+
                    (this.options.width
                    +this.options.margin.left-
                    w-this.options.margin.right)
                + ", 0 )");

        this.legend_g.append("rect")
            .attr("width", w)
            .style("fill","white")
            .style("stroke","#ccc")
            .style("stroke-width","1px")
            .attr("height", height_panel);

        const legend_item = this.legend_g.selectAll(".legend-item")
            .data(d3.entries(empty_total).sort((a,b)=>a.key>b.key?-1:1), d=>d.key);

        const g_item = legend_item
            .enter().append("g")
            .attr("class", "legend-item");

        g_item.append("text")
            .attr("x", w/2)
            .attr("y", (d,i) => 12 + i*h_legend_item)
            .attr("dy", ".32em")
            .attr("text-anchor", "end")
            .text(d=>d.key);

        g_item.append("rect")
            .attr("x", w*0.05+w/2)
            .attr("y", (d,i) => (0.1+i)*h_legend_item)
            .attr("width", w*0.4)
            .attr("height", h_legend_item*0.8)
            .style("fill", d => this.c[d.key]);

        g_item.append("text")
            .attr("class","legend_value")
            .attr("x", w*0.75)
            .attr("y", (d,i) => 12 + i*h_legend_item)
            .attr("dy", ".32em")
            .attr("text-anchor", "middle")
            .style("text-shadow", "0 0 0")
            .style("fill", d => d.key=="NO"?"rgb(49, 130, 189)":"rgb(230,230,230)")
            .text(d=>d.value?d.value:"");

        const info_g = bottom_g.append("g")
            .attr("class", "info-group")
            .attr("transform", "translate(10,0)");

        info_g.append("rect")
            .style("fill","white")
            .style("stroke","#ccc")
            .style("stroke-width","1px")
            .attr("width", this.options.width+ this.options.margin.left - w -this.options.margin.right - 20)
            .attr("height", height_panel);

        // Drawing the Info Area
        const info_item = info_g.selectAll(".info-group")
            .data(["Property", "Name", "Organism", "Top level properties"])
            .enter().append("g")
            .attr("class", "info-group");

        info_item.append("text")
            .attr("x", w*0.95)
            .attr("y", (d,i) => 12 + i*h_i)
            .attr("dy", ".32em")
            .attr("text-anchor", "end")
            .text(d=>d+":");

        info_item.append("text")
            .attr("id", (d,i) => "info_"+d.toLocaleLowerCase().replace(/\s/g,"_"))
            .attr("x", w)
            .attr("y", (d,i) => 12 + i*h_i)
            .attr("dy", ".32em")
            .text("");

        this.gp_hierarchy.draw_controller(info_g);

        // Drawing the stack graph
        info_g.append("rect")
            .attr("id", "info_value")
            .style("fill","white")
            .style("stroke","#ccc")
            .style("stroke-width","1px")
            .attr("x", this.options.width+this.options.margin.left - w -this.options.margin.right - this.options.margin.left - 30)
            .attr("y", height_panel*0.05)
            .attr("width", this.options.margin.left)
            .attr("height", height_panel*0.9);

        const stack = d3.stack()
                .keys(["YES","PARTIAL","NO"]);

        this.gr_total = info_g.append("g")
            .attr("id", "info_total")
            .attr("transform", "translate("+(this.options.width + this.options.margin.left - w -this.options.margin.right - this.options.margin.left - 30)+", " +
                (height_panel*0.05) + ")");
        this.gr_total.stack = stack;

        const info_total_c = this.gr_total
            .selectAll(".info_total_contribution")
            .data(stack([empty_total]), d=>d.key);

        info_total_c.enter().append("rect")
            .attr("class", "info_total_contribution")
            .attr("height",(d,i) => 0)
            .attr("y", 0)
            .attr("width", this.options.margin.left)
            .style("fill", d => this.c[d.key]);

    }
    update_legend(total=null){
        this.legend_g.selectAll(".legend-item").selectAll(".legend_value")
            .text(d=> (total!=null && total[d.key])?total[d.key]:"");
        if (total==null){
            this.gr_total.attr("display","none");
            return;
        }

        this.gr_total.attr("display","block");
        const fr = this.options.bottom_panel_height*0.9/(total["YES"]+total["NO"]+total["PARTIAL"]);

        const info_total_c = this.gr_total
            .selectAll(".info_total_contribution")
            .data(this.gr_total.stack([total]), d=>d.key);

        info_total_c
            .attr("y", (d, i) => d[0][0] * fr)
            .attr("height", (d) => {
                return fr * (d[0][1] - d[0][0])
            });

    }


    update_viewer(zoom=false, time=0) {
        this.props = d3.values(this.data).filter(e=>{
            if (e.parent_top_properties==null)
                return true;
            for (let p of e.parent_top_properties)
                for (let tp of this.gp_hierarchy.hierarchy_switch)
                    if (p == tp.id && tp.enable)
                        return true;
            return false;
        });
        this.column_total_width = this.options.cell_side;
        this.x.range([
            this.options.width-this.column_total_width-this.options.cell_side*this.organisms.length,
            this.options.width-this.column_total_width
        ]);

        const visible_rows = Math.round(this.options.height/this.options.cell_side);

        this.y.domain([0, visible_rows]);
        let dy = this.current_dy;
        if (!zoom){
            dy = -Math.floor(
                    d3.select(".gpv-rows-group").attr("transform").match(/translate\((.*),(.*)\)/)[2] / this.y(1)
                ) - 2;
            dy = dy < 0 ? 0 : dy;
            this.current_dy = dy;
        }
        this.current_props = this.props.slice(dy, visible_rows + dy + 1);
        this.gp_taxonomy.update_tree(time, this.options.cell_side);
        this.current_order = this.gp_taxonomy.current_order;
        this.organisms = this.gp_taxonomy.get_tax_list();
        this.x.domain(this.current_order);
        const t = d3.transition().duration(time);

        let row_p = this.rows.selectAll(".row")
            .data(this.current_props, d=>d.property);

        row_p.transition(t)
            .attr("transform", (d,i) => "translate(0," + this.y(i+dy) + ")")
            .each(update_row(this));

        row_p.exit()
            .remove();

        let row = row_p.enter().append("g")
                .attr("id", d => "row_"+d.property)
                .attr("class", "row")
                .each(update_row(this));
        row.append("line")
            .attr("x2", this.options.width);
        row
            .attr("transform", (d,i) =>
                "translate(0," + (this.y(i+dy) +(i>visible_rows/2?1:-1)*this.options.height/2) + ")"
            )
            .transition(t)
            .attr("transform", (d,i) => "translate(0," + this.y(i+dy) + ")");

        d3.selectAll("g.row line").attr("x1", this.x(0));


        d3.selectAll(".total_title")
            .attr("transform", "rotate(-90 "+(this.options.width-this.options.cell_side/2)+",0)")
            .attr("x", this.options.width-this.options.cell_side/2)
            .attr("opacity",()=>this.organisms.length>0?1:0);

        row_p.selectAll(".row_title")
            .attr("x", this.x.range()[0]-6)
            .attr("y", this.column_total_width/2);

        row.append("text")
            .attr("class", "row_title")
            .attr("x", this.x.range()[0]-6)
            .attr("y", this.column_total_width/2)
            .attr("text-anchor", "end")
            .text( d => d.name );


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
                const cell_height = _this.options.cell_side,
                    ol = _this.organisms.length;

                const gps = d3.select(this).selectAll(".top_level_gp")
                    .data(r.parent_top_properties, d=>d),
                    text_heigth= d3.select("text").node().getBBox().height;
                let radius = (cell_height-text_heigth)/2 -4;
                if (radius<2) radius=2;
                if (radius>6) radius=6;

                gps.attr("cx", (d,i) => _this.x.range()[0]-6 -radius - (2*radius+2) * i)
                    .attr("cy", cell_height/2 + text_heigth/2 + radius - 2)
                    .attr("r", radius);

                gps.enter().append("circle")
                    .attr("class", "top_level_gp")
                    .attr("cx", (d,i) => _this.x.range()[0]-6 -radius - (2*radius+2) * i)
                    .attr("cy", cell_height/2 + text_heigth/2 + radius - 2)
                    .attr("r", radius)
                    .style("fill", d=> _this.gp_hierarchy.color(d));

                let cells = d3.select(this).selectAll(".cell")
                    .data(_this.organisms, d=>d);

                cells
                    .attr("x", (d,i) => _this.x(i))
                    .attr("height", cell_height)
                    .attr("width", _this.x.bandwidth());

                cells.enter().append("rect")
                    .attr("class", "cell")
                    .attr("x", (d,i) => _this.x(i))
                    .attr("height", cell_height)
                    .attr("width", _this.x.bandwidth())
                    .on("mouseover", mouseover(_this))
                    .on("mouseout", mouseout(_this))
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

                const g = cells_t.enter().append("g")
                    .attr("class", "total_cell")
                    .attr("transform", "translate("+(_this.options.width-_this.column_total_width/2)+", "+cell_height*0.5+")")
                    .on("mouseover", mouseover(_this))
                    .on("mouseout", mouseout(_this))
                    .selectAll(".arc")
                    .data(pie(d3.entries(r.values["TOTAL"])), d=>d);

                cells_t.selectAll(".arc")
                    .attr("d", arc);

                g.enter().append("path")
                    .attr("class", "arc")
                    .attr("d", arc)
                    .style("fill", d => {
                        return _this.c[d.data.key]
                    });
            };
        }
        function mouseover(_this) {
            return function(p) {
                d3.select(this.parentNode).select("text").classed("active", true);
                d3.selectAll(".node--leaf text").classed("active", d => d.label == p);
                const data = d3.select(this.parentNode).data();
                if (data.length < 1) return;

                d3.select("#info_property").text(data[0].property);
                d3.select("#info_name").text(data[0].name);
                d3.select("#info_organism").text(`${p}: ${_this.organism_names[p]}`);
                d3.select("#info_value").style("fill", _this.c[data[0].values[p]]);

                if ("TOTAL"==p) {
                    _this.update_legend(data[0].values[p]);
                    d3.select("#info_organism").text("TOTAL: {YES: "+data[0].values[p]["YES"]+", PARTIAL: "+data[0].values[p]["PARTIAL"]+", NO: "+data[0].values[p]["NO"]+"}");
                } else {
                    _this.gr_total.attr("display","none");
                }
            }
        }

        function mouseout(_this) {
            return function(p) {
                d3.selectAll("text").classed("active", false);
                d3.selectAll(".gpv-name").remove();
                d3.select("#info_property").text("");
                d3.select("#info_name").text("");
                d3.select("#info_organism").text("");
                d3.select("#info_value").style("fill", "white");
                if ("TOTAL" == p)
                    _this.update_legend();
            }
        }



    }
    order_organisms(value) {
        this.current_order = this.gp_taxonomy.orders[value];
        this.order_organisms_current_order();
    }
    order_organisms_current_order(){
        this.x.domain(this.current_order);
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
