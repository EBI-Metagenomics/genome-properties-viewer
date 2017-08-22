"use strict";

import * as d3 from "./d3";
import GenomePropertiesHierarchy from "./gp-hierarchy";
import GenomePropertiesTaxonomy from "./gp-taxonomy";
import GenomePropertiesController from "./gp-controller";

export default class GenomePropertiesViewer {

    constructor({
        margin={top: 180, right: 50, bottom: 10, left: 40},
        width= null,
        height= null,
        element_selector= "body",
        cell_side= 20,
        total_panel_height=cell_side,
        server= "https://raw.githubusercontent.com/rdfinn/genome-properties/master/docs/release/GP_calculation/SUMMARY_FILE_",
        server_tax = "taxonomy.json",
        hierarchy_path = "../test-files/hierarchy.json",
        whitelist_path = "../test-files/gp_white_list.json",
        controller_element_selector="#gp-selector",
        legends_element_selector=".gp-legends",
        gp_text_filter_selector="#gp-filter",
        gp_label_selector="#gp_label",
        tax_label_selector="#tax_label",
        tax_search_selector="#tax-search"
    }){
        this.data = {};
        this.organisms = [];
        this.organism_names = {};
        this.organism_totals = {};
        this.filter_text="";
        this.whitelist=null;
        this.fixedHeight=height!==null;

        if (width===null){
            const rect = d3.select(element_selector).node().getBoundingClientRect();
            width = rect.width-margin.left-margin.right;
        }

        if (!this.fixedHeight){
            let rect = d3.select(element_selector).node().getBoundingClientRect();
            if (rect.height<1) {
                d3.select(element_selector).style("flex", "1");
                rect = d3.select(element_selector).node().getBoundingClientRect();
            }
            height = rect.height - margin.top - margin.bottom;
        }

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

        if(whitelist_path){
            d3.json(whitelist_path, (data)=>this.whitelist = data);
        }
        this.svg = d3.select(element_selector).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height+margin.top+margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        this.svg.x=0;
        this.svg.y=0;
        this.create_gradient();

        this.gp_taxonomy = new GenomePropertiesTaxonomy({
                path: server_tax,
                x: 0,
                y: -this.options.margin.top,
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
            .on("removeSpacies",(taxId)=>{
                d3.event.stopPropagation();
                this.remove_genome_properties_file(taxId);
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
                this.svg.y=0;
                d3.select(".gpv-rows-group")
                    .attr("transform", "translate(" + this.svg.x + "," + this.svg.y + ")");
                this.update_viewer(false, 500);
                this.update_total_per_organism_panel();
            });

        this.legends_filter={YES: "", NO: "", PARTIAL: ""};
        this.gp_label_type = "name";

        this.controller = new GenomePropertiesController({
            gp_element_selector: controller_element_selector,
            legends_element_selector: legends_element_selector,
            gp_text_filter_selector: gp_text_filter_selector,
            gp_label_selector: gp_label_selector,
            tax_label_selector: tax_label_selector,
            tax_search_selector: tax_search_selector,
            gp_viewer: this,
            gp_taxonomy: this.gp_taxonomy,
            hierarchy_contorller: this.gp_hierarchy
        }).on("legendFilterChanged", filters => {
            this.legend_filters = filters;
            this.update_viewer();
        });
        this.gp_taxonomy.on("taxonomyLoaded",()=>this.controller.loadSearchOptions());

        this.current_scroll={x:0,y:0};
        this.draw_rows_panel();
        this.draw_masks();
        this.draw_columns_panel();
        this.gp_taxonomy.draw_tree_panel(this.svg);
        this.draw_zoom_panel();
        this.draw_total_per_organism_panel();
        this.draw_scroll_x_bar();
        this.draw_scroll_y_bar();
        this.draw_drag_area();
        window.addEventListener('resize', ()=>this.refresh_size());
    }
    refresh_size(){
        const margin = this.options.margin;
        d3.select(this.options.element_selector).select("svg");
        const rect = d3.select(this.options.element_selector).node().getBoundingClientRect();
        this.options.width=rect.width-this.options.margin.left-this.options.margin.right;
        if (!this.fixedHeight)
            this.options.height=rect.height- margin.top- margin.bottom;
        this.gp_taxonomy.width=rect.width-margin.left-margin.right;
        d3.select(this.options.element_selector).select("svg")
            .attr("width", rect.width);
            // .attr("height", rect.height);
        this.y.range([0, this.options.height]);

        this.update_viewer();
    }
    draw_zoom_panel(){
        this.zoom_panel = this.svg.append("g")
            .attr("class", "gpv-zoomer")
            .attr("transform", "translate(-20,"+
                (-this.options.margin.top) + ")");
        GenomePropertiesViewer.add_button(this.zoom_panel, "+", 10,30,10)
            .on("click", ()=>{
                this.cell_side = this.options.cell_side + 10;
            });
        GenomePropertiesViewer.add_button(this.zoom_panel, "-", 10,60,10)
            .on("click", ()=>{
                this.cell_side = this.options.cell_side - 10;
            });

    }
    set cell_side(value){
        const p = this.options.cell_side;
        this.options.cell_side = Math.max(20, Math.min(200, value));
        if (p !== this.options.cell_side){
            this.current_scroll.y=this.current_scroll.y*this.options.cell_side/p;
            this.transform_by_scroll();
        }
    }
    static add_button(panel, text, x, y, r){
        const c = panel.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", r);
        panel.append("text")
            .attr("x", x)
            .attr("y", y)
            .text(text);
        return c;
    }
    draw_scroll_x_bar(){
        this.scrollbar_x_g = this.svg.append("g")
            .attr("class", "gpv-scrollbar")
            .attr("transform", "translate(0,"+
                (this.options.height - this.options.margin.bottom) + ")");

        this.scrollbar_x_bg = this.scrollbar_x_g.append("rect")
            .attr("class", "gpv-scrollbar-bg")
            .attr("width", this.options.width)
            .attr("height", this.options.margin.bottom);

        this.scrollbar_x = this.scrollbar_x_g.append("rect")
            .attr("class", "gpv-scrollbar-handle")
            .attr("width", this.options.width)
            .attr("height", this.options.margin.bottom)
            .attr("rx", 5).attr("ry", 5)
            .style("cursor", "ew-resize")
            .call(d3.drag()
                .on("end", ()=>this.skip_scroll_refreshing=false)
                .on("drag", function(_this) {
                    return function() {
                        _this.skip_scroll_refreshing = true;
                        d3.event.sourceEvent.stopPropagation();
                        // const th = _this.options.cell_side * _this.props.length;
                        const w =Number(_this.options.width);
                        const sw = Number(this.getAttribute("width"));
                        const x = Number(this.getAttribute("x"));
                        const w1 = _this.rows.node().getBBox().width;
                        const dx = Math.max(0,
                            Math.min(
                                x+d3.event.dx,
                                _this.options.width - sw
                            )
                        );

                        _this.scrollbar_x.attr("x",dx);

                        _this.current_scroll.x = dx*w1/w;
                        // let dy = -d3.event.y * th / (_this.options.height - this.getAttribute("height"));
                        // dy = Math.min(0,
                        //     Math.max(dy, -th+_this.options.height-_this.options.cell_side)
                        // );
                        _this.transform_by_scroll();
                    }
                }(this))
            );
    }

    draw_scroll_y_bar(){
        this.skip_scroll_refreshing = false;
        this.scrollbar_g = this.svg.append("g")
            .attr("class", "gpv-scrollbar")
            .attr("transform", "translate("+
                (this.options.width + 10) + ", 0)");

        this.scrollbar_bg = this.scrollbar_g.append("rect")
            .attr("class", "gpv-scrollbar-bg")
            .attr("width", 10)
            .attr("height", this.options.height);

        this.scrollbar = this.scrollbar_g.append("rect")
            .attr("class", "gpv-scrollbar-handle")
            .attr("width", 10)
            .attr("height", this.options.height)
            .attr("rx", 5).attr("ry", 5)
            .call(d3.drag()
                .on("end", ()=>this.skip_scroll_refreshing=false)
                .on("drag", function(_this) {
                    return function() {
                        _this.skip_scroll_refreshing = true;
                        d3.event.sourceEvent.stopPropagation();
                        const th = _this.options.cell_side * _this.props.length;
                        _this.scrollbar
                            .attr("y",
                                Math.max(0,
                                    Math.min(
                                        d3.event.y,
                                        _this.options.height - this.getAttribute("height")
                                    )
                                ));
                        let dy = -d3.event.y * th / (_this.options.height - this.getAttribute("height"));
                        _this.current_scroll.y = Math.min(0,
                            Math.max(dy, -th+_this.options.height-_this.options.cell_side)
                        );
                        _this.transform_by_scroll();
                    }
                }(this))
            );
    }
    transform_by_scroll(){
        this.rows
            .attr("transform", d => "translate("+this.current_scroll.x+", " + this.current_scroll.y + ")");
        this.cols
            .attr("transform", "translate("+
                (this.current_scroll.x) + ", 0)");
        this.gp_taxonomy.x = this.current_scroll.x;
        this.update_viewer();
    }

    update_scroll_bar(total_rows, visible_rows, current_row){
        this.scrollbar_g
            .attr("transform", "translate("+ (this.options.width + 10) + ", 0)");
        this.scrollbar_x_g
            .attr("transform", "translate(0,"+
                (this.options.height - this.options.margin.bottom) + ")");

        this.scrollbar.transition()
            .attr("height", this.options.height*Math.min(1,(total_rows!==0?visible_rows/total_rows:1)))
            .attr("y",
                    (total_rows?current_row*this.options.height/total_rows:0)
                    );
        this.scrollbar_x_bg.attr("width", this.options.width);
        this.scrollbar_bg.attr("height", this.options.height);

        const w1 = this.rows.node().getBBox().width;
        const w2 = this.options.width;
        const factor = w1>w2 ? w2/w1 : 1;
        const pw =Number(this.scrollbar_x.attr("width"));
        if (Math.abs(pw-w2*factor)>0.2) {
            this.current_scroll.x=0;
            this.scrollbar_x.transition()
                .attr("width", w2 * factor);
        }
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
    draw_masks(){
        const ph=this.options.total_panel_height;
        this.masks = this.svg.append("g")
            .attr("class", "masks");
        this.masks.append("rect")
            .attr("class", "tree-background background")
            .style("fill", "url(#gradientdown)")
            .attr("x",-this.options.margin.left)
            .attr("y",-this.options.margin.top)
            .attr("width", this.options.width + this.options.margin.left + this.options.margin.right)
            .attr("height", this.options.margin.top);
        this.svg.insert("rect", ":first-child")
            .attr("class", "event-mask background")
            .style("opacity", 0)
            .attr("x",-this.options.margin.left)
            .attr("y", 0)
            .attr("width", this.options.width + this.options.margin.left + this.options.margin.right)
            .attr("height", this.options.height-this.options.margin.bottom-ph);
        this.masks.append("rect")
            .attr("class", "total-background background")
            .style("fill", "url(#gradientup)")
            .attr("x", -this.options.margin.left)
            .attr("y", this.options.height-this.options.margin.bottom-ph)
            .attr("width", this.options.width + this.options.margin.left + this.options.margin.right)
            .attr("height", ph*2);
    }
    draw_drag_area(){
        const offset = 20;
        const zoom_height = 90;
        const g = this.svg.append("g")
            .attr("class","height-dragger")
            .attr("transform",`translate(${-offset}, 0)`)
            .call(d3.drag()
                .on("drag", ()=>{
                    this.options.margin.dy = Math.min(
                        Math.max(d3.event.y, zoom_height-this.options.margin.top),this.options.height - this.options.margin.bottom
                    );
                    // if (this.height-offset < 70)
                    //     this.height=70+offset;
                    g.attr("transform",`translate(${-offset}, ${this.options.margin.dy})`)
                })
                .on("end", ()=>{
                    const new_height = this.options.margin.top+this.options.margin.dy;
                    if (isNaN(new_height)) return;
                    this.gp_taxonomy.dipatcher.call(
                        "changeHeight",this.gp_taxonomy, new_height
                    );
                    g.attr("transform",`translate(${-offset}, 0)`);
                    this.gp_taxonomy.height = this.options.margin.top;
                    this.gp_taxonomy.y = -this.gp_taxonomy.height;
                    this.gp_taxonomy.update_tree();
                })
            );
        const side = this.options.cell_side/2;
        g.append("rect")
            .attr("y",-side/2)
            .attr("width",side*2)
            .attr("height",side)
            .style("fill", "transparent");
        for (let index=-1; index<2; index++){
            g.append("line")
                .attr("x1",side*2)
                .attr("y1",index*side/2)
                .attr("y2",index*side/2)
                .style("stroke", "#333");
        }
        g.append("line")
            .attr("class","height-sizer")
            .attr("x1",this.options.width);
    }

    update_masks(){
        const ph=this.options.total_panel_height;
        this.masks.select(".total-background")
            .attr("y", this.options.height-this.options.margin.bottom-ph)
            .attr("width", this.options.width + this.options.margin.left + this.options.margin.right)
            .attr("height", ph*2);
        this.svg.select(".event-mask background")
            .attr("width", this.options.width + this.options.margin.left + this.options.margin.right)
            .attr("height", this.options.height-this.options.margin.bottom-ph);
        this.masks.select(".tree-background")
            .attr("y",-this.options.margin.top)
            .attr("width", this.options.width + this.options.margin.left + this.options.margin.right)
            .attr("height", this.options.margin.top);

    }

    load_genome_properties_file(tax_id) {
        if (this.organisms.indexOf(Number(tax_id)) !== -1)
            return;
        d3.text(`${this.options.server}${tax_id}`)
            .get((error, text) => {
                if (error) throw error;
                this.load_genome_properties_text(tax_id, text);
                this.update_viewer(false,500);
            });
    }
    remove_genome_properties_file(id) {
        let tax_id = Number(id);
        const isFromFile = Number.isNaN(tax_id);
        if (isFromFile)
            tax_id = id;
        delete this.organism_totals[tax_id];
        const i = this.organisms.indexOf(tax_id);
        this.organisms.splice(i,1);
        this.gp_taxonomy.remove_organism_loaded(tax_id, isFromFile);
        if (this.organisms.length===0) {
            this.data = {};
        }
        for (let gp in this.data){
            this.data[gp].values["TOTAL"][this.data[gp].values[tax_id]]--;
            delete this.data[gp].values[tax_id];
        }
        this.update_viewer(false,500);
    }

    static checkLineisOK(line){
        return line.length === 3;
    }

    load_genome_properties_text(label, text) {
        const wl = this.whitelist;
        let tax_id = Number(label);
        const isFromFile = Number.isNaN(tax_id);
        if (isFromFile)
            tax_id = label;
        this.organisms.push(tax_id);
        this.organism_totals[tax_id] = {"YES":0, "NO":0, "PARTIAL":0};
        let allLinesAreOK = true;
        const errorLines = [];
        d3.tsvParseRows(text, (d, i) => {
            if (!GenomePropertiesViewer.checkLineisOK(d)) {
                allLinesAreOK = false;
                errorLines.push([i, d]);
            }
            if (wl && wl.indexOf(d[0]) === -1) return;
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
        if (allLinesAreOK) {
            this.gp_taxonomy.set_organisms_loaded(tax_id, isFromFile);
            this.update_viewer(false,500);
        } else {
            delete this.organisms[tax_id];
            delete this.organism_totals[tax_id];
            throw new Error("File didn't load. The following lines have errors:" +
                errorLines.map(l=>l.join(': ')).join('\n')
            );
        }
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
                // .on("drag", function(_this) {
                //     return function() {
                //         d3.event.sourceEvent.stopPropagation();
                //         const dy = Math.max(
                //             Math.min(d3.event.y, 0),
                //             _this.options.height
                //             + _this.options.margin.bottom
                //             - _this.props.length*_this.y(1)
                //             - _this.options.margin.top
                //         );
                //         d3.select(".gpv-rows-group")
                //             .attr("transform", d => "translate(0, " + dy + ")");
                //         _this.update_viewer();
                //     }
                // }(this))
            )
        ;
    }

    draw_columns_panel() {
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
        this.total_g = this.svg.append("g")
            .attr("class", "total-group")
            .attr("transform", "translate("+
                (this.current_scroll.x-this.options.margin.left) + ", " +
                (this.options.height-this.options.margin.bottom-ph) + ")");

    }

    refresh_organism_totals(){
        const ph=this.options.total_panel_height;

        for (let o in this.organism_totals)
            this.organism_totals[o]={"YES":0, "NO":0, "PARTIAL":0};
        this.props.forEach(e=>{
            for (let v in this.organism_totals)
                this.organism_totals[v][e.values[v]]++;
        });
    }

    update_total_per_organism_panel(time=0) {
        const ph=this.options.total_panel_height=this.options.cell_side,
            t = d3.transition().duration(time);
        this.total_g
            .attr("transform", "translate("+
                (this.current_scroll.x-this.options.margin.left) + ", " +
                (this.options.height-this.options.margin.bottom-ph) + ")");

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
            .attr("transform", (d,i)=> "translate("+(
                this.x(this.organisms.indexOf(Number.isNaN(+d.key)?d.key:+d.key)) +
                ph/2 + this.options.margin.left) +
                ", "+ph*0.5+")"
            );
        cells_t.exit().remove();

        const g_e = cells_t.enter().append("g")
            .attr("class", "total_cell_org")
            .attr("transform", (d,i)=>"translate("+(
                this.x(this.organisms.indexOf(Number.isNaN(+d.key)?d.key:+d.key)) +
                ph/2 + this.options.margin.left) +
                ", "+ph*0.5+")"
            )
            .on("mouseover", p => {
                d3.selectAll(".node--leaf text").classed("active", function() {
                    return this.textContent === p.key;
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

        const group = g_e.size()?g_e:cells_t,
            arcs = group.selectAll(".arc")
                .data(d=>pie(d3.entries(d.value)));

        arcs.transition(t)
            .attr("d", arc)
            .attr("transform", "scale(1)");

        arcs.enter().append("path")
            .attr("class", "arc")
            .attr("d", arc)
            .style("fill", d => this.c[d.data.key]);

    }
    filter_by_text(){
        if(this.filter_text)
            this.props = this.props.filter(e=>{
                return e.name.toLowerCase().indexOf(this.filter_text.toLowerCase())!==-1 ||
                    String(e.property).toLowerCase().indexOf(this.filter_text.toLowerCase())!==-1;
            });
    }
    filter_by_legend(){
        if(this.legend_filters){
            for (let x in this.legend_filters){
                if (this.legend_filters[x]==="∀")
                    this.props = this.props.filter(e=>{
                        const values =d3.entries(e.values).filter(e=>e.key!=="TOTAL");
                        return values.filter(e=>e.value===x).length===values.length;
                    });
                else if (this.legend_filters[x]==="∃")
                    this.props = this.props.filter(e=>{
                        const values =d3.entries(e.values).filter(e=>e.key!=="TOTAL");
                        return values.filter(e=>e.value===x).length>0;
                    });
                else if (this.legend_filters[x]==="∄")
                    this.props = this.props.filter(e=>{
                        const values =d3.entries(e.values).filter(e=>e.key!=="TOTAL");
                        return values.filter(e=>e.value===x).length===0;
                    });

            }
        }
    }

    update_viewer(zoom=false, time=0) {
        this.props = d3.values(this.data).filter(e=>{
            if (e.parent_top_properties===null)
                return true;
            for (let p of e.parent_top_properties)
                for (let tp of this.gp_hierarchy.hierarchy_switch)
                    if (p === tp.id && tp.enable)
                        return true;
            return false;
        });
        this.filter_by_text();
        this.filter_by_legend();

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
            dy = dy < this.props.length-visible_rows ? dy : this.props.length-visible_rows-1;
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
            .attr("transform", "rotate(-70 "+(this.options.width-this.options.cell_side/2)+",0)")
            .attr("x", this.options.width-this.options.cell_side/2)
            .attr("opacity",()=>this.organisms.length>0?1:0);

        row_p.selectAll(".row_title")
            .attr("x", this.x.range()[0]-6)
            .attr("y", this.column_total_width/2)
            .text( d => this.gp_label_type==="name"?d.name:this.gp_label_type==="id"?d.property:d.property+":"+d.name );

        row.append("text")
            .attr("class", "row_title")
            .attr("x", this.x.range()[0]-6)
            .attr("y", this.column_total_width/2)
            .attr("text-anchor", "end")
            .text( d => this.gp_label_type==="name"?d.name:this.gp_label_type==="id"?d.property:d.property+":"+d.name );


        let column_p = this.cols.selectAll(".column")
            .data(this.organisms, p=>p);

        column_p.attr("transform", (d,i) => "translate(" + this.x(i) + ")rotate(-90)");

        let column = column_p
            .enter().append("g")
            .attr("class", "column")
            .attr("transform", (d,i) => "translate(" + this.x(i) + ")rotate(-90)");

        column.append("line").attr("x1", -this.options.height);

        this.update_total_per_organism_panel();
        this.update_masks();
        this.zoom_panel
            .attr("transform", "translate(-20,"+
                (-this.options.margin.top) + ")");
        if (!this.skip_scroll_refreshing)
            this.update_scroll_bar(this.props.length, visible_rows, dy);

    }
    update_row(r,i,c) {
        const cell_height = this.options.cell_side;

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

        cells.exit().remove();

        const mouseover = (p,i,c)=> {
            d3.select(c[i].parentNode).select("text").classed("active", true);
            d3.selectAll(".node--leaf text").classed("active", d => d.label === p);
            const data = d3.select(c[i].parentNode).data();
            if (data.length < 1) return;

            const info = {
                Property: data[0].property,
                Name: data[0].name,
                Organism: p,
                Value: data[0].values[p]
            };
            if ("TOTAL"===p) {
                this.controller.draw_legends(data[0].values[p]);
                info.Value ="TOTAL: {YES: "+data[0].values[p]["YES"]+", PARTIAL: "+data[0].values[p]["PARTIAL"]+", NO: "+data[0].values[p]["NO"]+"}";
                info.Organism = "All";
            }
            this.controller.draw_tooltip(info);
        };
        const mouseout = (p) => {
            d3.selectAll("text").classed("active", false);
            d3.selectAll(".gpv-name").remove();
            this.controller.draw_tooltip();
            if ("TOTAL" === p)
                this.controller.draw_legends();
        };

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

        cells_t.enter().append("g")
            .attr("class", "total_cell")
            .attr("transform", "translate("+(this.options.width-this.column_total_width/2)+", "+cell_height*0.5+")")
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);

        const arcs = d3.select(c[i]).selectAll(".total_cell").selectAll(".arc")
            .data(pie(d3.entries(r.values["TOTAL"])), d=>d.data.key);

        arcs.attr("d", arc);

        arcs.enter().append("path")
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

    filter_gp(text){
        if (text!==this.filter_text) {
            this.filter_text = text;
            this.svg.y=0;
            d3.select(".gpv-rows-group")
                .attr("transform", "translate(" + this.svg.x + "," + this.svg.y + ")");
            this.update_viewer();
        }
    }
    change_gp_label(type){
        this.gp_label_type = type;
        this.update_viewer();
    }
}
