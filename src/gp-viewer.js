"use strict";

import * as d3 from "./d3";

export default class GenomePropertiesViewer {

    constructor({margin={top: 80, right: 10, bottom: 10, left: 80},
        width= 800,
        height= 800,
        element_selector= "body",
        min_row_height= 20,
        server= "../test-files/SUMMARY_FILE_"
    }){
        this.data = {};
        this.organisms = [];
        this.options = {margin, width, height, element_selector, min_row_height, server};
        this.x = d3.scaleBand().range([0, width]);
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
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        this.rows = this.svg.append("g")
            .attr("class", "gpv-rows-group")
            .attr("transform", "translate(0,0)")
            .call(d3.drag()
                .subject(function(){
                    const g = d3.select(this),
                        t = g.attr("transform").match(/translate\((.*),(.*)\)/);
                    return {
                        x:Number(t[1]) + Number(g.attr("x")),
                        y:Number(t[2]) + Number(g.attr("y")),
                    };
                })
                .on("drag", function(x) {
                    const _this=x;
                    return function() {
                        d3.event.sourceEvent.stopPropagation();
                        const dy = Math.max(
                            Math.min(d3.event.y, 0),
                            _this.options.height
                            + _this.options.margin.bottom
                            - _this.props.length*_this.y(1)
                            - _this.options.margin.top
                        );
                        d3.select(".gpv-rows-group")
                            .attr("transform", d => "translate(0, " + dy + ")");
                        _this.update_viewer();
                    }
                }(this))
            );


        this.svg.append("rect")
            .attr("class", "background")
            .attr("x",-this.options.margin.left)
            .attr("y",-this.options.margin.top)
            .attr("width", this.options.width + this.options.margin.left)
            .attr("height", this.options.margin.top);

        this.cols = this.svg.append("g")
            .attr("class", "gpv-cols-group");

        this.draw_bottom_panel();
    }

    draw_bottom_panel(){
        const h = this.options.margin.top*0.8,
            h_i = h/this.gp_values.length,
            w = 100;
        this.svg.append("rect")
            .attr("class", "background")
            .attr("x",-this.options.margin.left)
            .attr("y",this.options.height-this.options.margin.top+this.options.margin.bottom)
            .attr("width", this.options.width + this.options.margin.left)
            .attr("height", this.options.margin.top);

        // Drawing the legend
        const legend_g = this.svg.append("g")
            .attr("class", "legend-group")
            .attr("transform", "translate("+
                (this.options.width-w-this.options.margin.right) + ", " +
                (this.options.height-this.options.margin.top+2*this.options.margin.bottom) + ")");

        legend_g.append("rect")
            .attr("width", w)
            .style("fill","white")
            .style("stroke","#ccc")
            .style("stroke-width","1px")
            .attr("height", h);

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

        const info_g = this.svg.append("g")
            .attr("class", "info-group")
            .attr("transform", "translate(10, " +
                (this.options.height-this.options.margin.top+2*this.options.margin.bottom) + ")");

        info_g.append("rect")
            .style("fill","white")
            .style("stroke","#ccc")
            .style("stroke-width","1px")
            .attr("width", this.options.width - w -this.options.margin.right - 20)
            .attr("height", h);

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
            .attr("x", this.options.width - w -this.options.margin.right - this.options.margin.left - 30)
            .attr("y", h*0.1)
            .attr("width", this.options.margin.left)
            .attr("height", h*0.8);

    }
    load_genome_properties_file(tax_id) {
        if (this.organisms.indexOf(tax_id) != -1)
            return;
        d3.text(`${this.options.server}${tax_id}`)
            .get((error, text) => {
                if (error) throw error;
                this.organisms.push(tax_id);
                d3.tsvParseRows(text, (d) => {
                    if (!(d[0] in this.data))
                        this.data[d[0]] = {
                            property: d[0],
                            name: d[1],
                            values: {}
                        };
                    this.data[d[0]]["values"][tax_id] = d[2];
                });
                this.update_viewer();
            });
    }

    update_viewer() {
        this.props = d3.values(this.data);

        const visible_rows = Math.min(
            this.props.length,
            Math.round(this.options.height/this.options.min_row_height)
        );
        this.y.domain([0, visible_rows]);
        let dy = -Math.floor(
            d3.select(".gpv-rows-group").attr("transform").match(/translate\((.*),(.*)\)/)[2]/this.y(1)
        )-2;
        dy = dy<0?0:dy;
        this.current_props = this.props.slice(dy,visible_rows+dy);

        const n = this.organisms.length;
        // Precompute the orders.
        this.orders = {
            ascending: d3.range(n).sort((a, b) => this.organisms[b] - this.organisms[a]),
            descending: d3.range(n).sort((a, b) => this.organisms[a] - this.organisms[b]),
            length: d3.range(n).sort((a, b) => this.organisms[a].length -this.organisms[b].length),
        };
        if (this.current_order==null || this.current_order.length != this.organisms.length) {
            this.x.domain(this.orders.ascending);
            this.current_order = this.orders.ascending;
        }
        let row_p = this.rows.selectAll(".row")
            .data(this.current_props, d=>d.property);

        row_p
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

        function update_row(x){
            let _this = x;
            return function(r) {
                let cells = d3.select(this).selectAll(".cell")
                    .data(_this.organisms);

                cells
                    .attr("x", (d,i) => _this.x(i))
                    .attr("width", _this.x.bandwidth());

                cells.enter().append("rect")
                    .attr("class", "cell")
                    .attr("x", (d,i) => _this.x(i))
                    .attr("height", _this.y(1))
                    .attr("width", _this.x.bandwidth())
                    .on("mouseover", mouseover(_this))
                    .on("mouseout", mouseout)
                    .style("fill", d => d in r.values ? _this.c[r.values[d]] : null);

            };
        }
        function mouseover(t) {
            const _this = t;
            return function(p) {
                d3.select(this.parentNode).select("text").classed("active", true);
                d3.selectAll(".column text").classed("active", d => d == p);
                const data = d3.select(this.parentNode).data();
                if (data.length < 1) return;

                d3.select("#info_property").text(data[0].property);
                d3.select("#info_name").text(data[0].name);
                d3.select("#info_organism").text(p);
                d3.select("#info_value").style("fill", _this.c[data[0].values[p]]);
            }
        }

        function mouseout() {
            d3.selectAll("text").classed("active", false);
            d3.selectAll(".gpv-name").remove();
            d3.select("#info_property").text("");
            d3.select("#info_name").text("");
            d3.select("#info_organism").text("");
            d3.select("#info_value").style("fill","white");
        }

        row.append("text")
            .attr("class", "row_title")
            .attr("x", -6)
            .attr("y", this.y(1) / 2)
            .attr("dy", ".32em")
            .attr("text-anchor", "end")
            .text( d => d.property );


        let column_p = this.cols.selectAll(".column")
            .data(this.organisms);

        column_p
            .attr("transform", (d,i) => "translate(" + this.x(i) + ")rotate(-90)")
            .selectAll("text")
                .attr("y", this.x.bandwidth() / 2);

        let column = column_p
            .enter().append("g")
            .attr("class", "column")
            .attr("transform", (d,i) => "translate(" + this.x(i) + ")rotate(-90)");

        column.append("line")
            .attr("x1", -this.options.width);

        column.append("text")
            .attr("class", "col_title")
            .attr("x", 6)
            .attr("y", this.x.bandwidth() / 2)
            .attr("dy", ".32em")
            .attr("text-anchor", "start")
            .text( d => d )
            .call(d3.drag()
                .on("drag", function() {
                    d3.select(this).attr("y", d3.event.y);
                })
                .on("end", function(t) {
                    const _this = t;
                    return function (e) {
                        const w = _this.x.bandwidth(),
                            dx = d3.event.y-w/2,
                            d_col = Math.round(dx/w),
                            current_i=_this.organisms.indexOf(e),
                            current_o = _this.current_order.indexOf(current_i);
                        if (Math.abs(d_col)>0){
                            const e = _this.current_order.splice(current_o,1);
                            _this.current_order.splice(current_o+d_col,0,e[0]);
                            _this.order_organisms_current_order();
                        }

                        var t = d3.transition().duration(500);
                        d3.select(this).transition(t).attr("y", _this.x.bandwidth() / 2);

                    }
                }(this))
            );
        ;

    }
    order_organisms(value) {
        this.current_order = this.orders[value];
        this.order_organisms_current_order();
    }
    order_organisms_current_order(){
        this.x.domain(this.current_order);

        const t = d3.transition().duration(1000);

        t.selectAll(".row").selectAll(".cell")
            .attr("x", (d,i) => {
                return this.x(i);
            });

        t.selectAll(".column")
            .attr("transform", (d, i) => "translate(" + this.x(i) + ")rotate(-90)");

    }

}
