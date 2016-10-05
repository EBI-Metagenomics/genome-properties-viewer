"use strict";

import * as d3 from "./d3";
import GenomePropertiesHierarchy from "./gp-hierarchy";
import GenomePropertiesTaxonomy from "./gp-taxonomy";
import GenomePropertiesController from "./gp-controller";

export default class GenomePropertiesViewer {

    constructor({
        margin={top: 180, right: 10, bottom: 0, left: 80},
        width= 600,
        height= 700,
        element_selector= "body",
        cell_side= 20,
        total_panel_height=cell_side,
        server= "../test-files/SUMMARY_FILE_",
        server_tax = "taxonomy.json",
        hierarchy_path = "../test-files/gp.dag.txt",
        controller_element_selector="#gp-selector",
        legends_element_selector=".gp-legends"
    }){
        this.data = {};
        this.organisms = [];
        this.organism_names = {};
        this.organism_totals = {};
        this.options = {
            margin, width, height, element_selector, cell_side, server, server_tax,
            total_panel_height, hierarchy_path};
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
                        (this.options.height-this.options.margin.bottom) + ")");

                this.update_viewer();
            });

        this.gp_hierarchy = new GenomePropertiesHierarchy()
            .load_hierarchy_from_path(this.options.hierarchy_path)
            .on("siwtchChanged",()=>{
                this.update_viewer(false, 500);
                this.update_total_per_organism_panel();
            });

        this.controller = new GenomePropertiesController({
            gp_element_selector: controller_element_selector,
            legends_element_selector: legends_element_selector,
            gp_viewer: this,
            hierarchy_contorller: this.gp_hierarchy
        });

        this.draw_rows_panel();
        this.draw_columns_panel();
        this.gp_taxonomy.draw_tree_panel(this.svg);
        // this.draw_bottom_panel();
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
            .attr("y", this.options.height-this.options.margin.bottom-ph)
            .attr("width", this.options.width + this.options.margin.left + this.options.margin.right)
            .attr("height", ph);
        this.total_g = this.svg.append("g")
            .attr("class", "total-group")
            .attr("transform", "translate("+
                (-this.options.margin.left) + ", " +
                (this.options.height-this.options.margin.bottom-ph) + ")");

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
                (this.options.height-this.options.margin.bottom-ph) + ")");
        this.svg.selectAll(".total-background")
            .attr("y", this.options.height-this.options.margin.bottom-ph)
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
                this.controller.draw_tooltip({
                    Organism:p.key
                });
                this.controller.draw_legends(p.value);
            })
            .on("mouseout", () => {
                this.controller.draw_legends();
                this.controller.draw_tooltip();
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
            .each((d,i,c)=>this.update_row(d,i,c));

        row_p.exit()
            .remove();

        let row = row_p.enter().append("g")
                .attr("id", d => "row_"+d.property)
                .attr("class", "row")
                .each((d,i,c)=>this.update_row(d,i,c));
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





    }
    update_row(r,i,c) {
        const cell_height = this.options.cell_side,
            ol = this.organisms.length;

        const gps = d3.select(c[i]).selectAll(".top_level_gp")
                .data(r.parent_top_properties, d=>d),
            text_heigth= d3.select("text").node().getBBox().height;
        let radius = (cell_height-text_heigth)/2 -4;
        if (radius<2) radius=2;
        if (radius>6) radius=6;

        gps.attr("cx", (d,i) => this.x.range()[0]-6 -radius - (2*radius+2) * i)
            .attr("cy", cell_height/2 + text_heigth/2 + radius - 2)
            .attr("r", radius);

        gps.enter().append("circle")
            .attr("class", "top_level_gp")
            .attr("cx", (d,i) => this.x.range()[0]-6 -radius - (2*radius+2) * i)
            .attr("cy", cell_height/2 + text_heigth/2 + radius - 2)
            .attr("r", radius)
            .style("fill", d=> this.gp_hierarchy.color(d));

        let cells = d3.select(c[i]).selectAll(".cell")
            .data(this.organisms, d=>d);

        cells
            .attr("x", (d,i) => this.x(i))
            .attr("height", cell_height)
            .attr("width", this.x.bandwidth());

        const mouseover = (p,i,c)=> {
            d3.select(c[i].parentNode).select("text").classed("active", true);
            d3.selectAll(".node--leaf text").classed("active", d => d.label == p);
            const data = d3.select(c[i].parentNode).data();
            if (data.length < 1) return;

            const info = {
                Property: data[0].property,
                Name: data[0].name,
                Organism: p,
                Value: data[0].values[p]
            };
            if ("TOTAL"==p) {
                this.controller.draw_legends(data[0].values[p]);
                info.Value ="TOTAL: {YES: "+data[0].values[p]["YES"]+", PARTIAL: "+data[0].values[p]["PARTIAL"]+", NO: "+data[0].values[p]["NO"]+"}";
                info.Organism = "All";
            }
            this.controller.draw_tooltip(info);
        };
        const mouseout = (p,i,c) => {
            d3.selectAll("text").classed("active", false);
            d3.selectAll(".gpv-name").remove();
            this.controller.draw_tooltip();
            if ("TOTAL" == p)
                this.controller.draw_legends();
        }

        cells.enter().append("rect")
            .attr("class", "cell")
            .attr("x", (d,i) => this.x(i))
            .attr("height", cell_height)
            .attr("width", this.x.bandwidth())
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .style("fill", d => d in r.values ? this.c[r.values[d]] : null);

        const arc = d3.arc()
            .outerRadius(cell_height*0.4)
            .innerRadius(0);
        const pie = d3.pie()
            .value(d => d.value);

        const cells_t = d3.select(c[i]).selectAll(".total_cell")
            .data(["TOTAL"], d=>d);

        cells_t
            .attr("transform", "translate("+(this.options.width-this.column_total_width/2)+", "+cell_height*0.5+")");

        const g = cells_t.enter().append("g")
            .attr("class", "total_cell")
            .attr("transform", "translate("+(this.options.width-this.column_total_width/2)+", "+cell_height*0.5+")")
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .selectAll(".arc")
            .data(pie(d3.entries(r.values["TOTAL"])), d=>d);

        cells_t.selectAll(".arc")
            .attr("d", arc);

        g.enter().append("path")
            .attr("class", "arc")
            .attr("d", arc)
            .style("fill", d => {
                return this.c[d.data.key]
            });
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
