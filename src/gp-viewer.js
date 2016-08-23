"use strict";

import * as d3 from "./d3";

export default class GenomePropertiesViewer {

    constructor({margin={top: 80, right: 0, bottom: 10, left: 80},
        width= 800,
        height= 800,
        element_selector= "body",
        min_row_height= 20
    }){
        this.data = {};
        this.organisms = [];
        // const {margin, width, height} = options;
        this.options = {margin, width, height, element_selector, min_row_height};
        this.x = d3.scaleBand().range([0, width]);
        this.y = d3.scaleLinear().range([0, height]);
        // this.z = d3.scaleLinear().domain([0, 4]).clamp(true);
        this.c = d3.scaleOrdinal(d3.schemeCategory20c).domain(["YES", "NO", "PARTIAL"]);

        this.svg = d3.select(element_selector).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        this.rows = this.svg.append("g")
            .attr("class", "gpv-rows-group")
            .attr("transform", "translate(0,0)");

        this.svg.append("rect")
            .attr("class", "background")
            .attr("x",-this.options.margin.left)
            .attr("y",-this.options.margin.top)
            .attr("width", this.options.width + this.options.margin.left)
            .attr("height", this.options.margin.top)

        // this.svg.append("rect")
        //     .attr("class", "background")
        //     .attr("width", width)
        //     .attr("height", height);
    }

    load_genome_properties_file(tax_id) {
        d3.text(`../test-files/SUMMARY_FILE_${tax_id}`)
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
        const props = d3.values(this.data).slice(0,100);
        this.current_props = props;
        this.x.domain(this.organisms);
        const visible_rows = Math.min(
            props.length,
            Math.round(this.options.height/this.options.min_row_height)
        );
        this.y.domain([0, visible_rows]);
        let row_p = this.rows.selectAll(".row")
            .data(props, d=>d.property);

        row_p
            .attr("transform", (d,i) => "translate(0," + this.y(i) + ")")
            .each(update_row(this));

        let row = row_p.enter().append("g")
                .attr("id", d => "row_"+d.property)
                .attr("class", "row")
                .attr("transform", (d,i) => "translate(0," + this.y(i) + ")")
                .each(update_row(this));
        row.append("line")
            .attr("x2", this.options.width);

        function update_row(x){
            let _this = x;
            return function(r) {
                let cells = d3.select(this).selectAll(".cell")
                    .data(_this.organisms); //TODO: Filter for visible organisms

                cells
                    .attr("x", d => _this.x(d))
                    .attr("width", _this.x.bandwidth());

                cells.enter().append("rect")
                    .attr("class", "cell")
                    .attr("x", d => _this.x(d))
                    .attr("height", _this.y(1))
                    .attr("width", _this.x.bandwidth())
                    .on("mouseover", mouseover)
                    .on("mouseout", mouseout)
                    .style("fill", d => d in r.values ? _this.c(r.values[d]) : null)
                    .call(d3.drag()
                        .subject(function(){
                            const g = d3.select(".gpv-rows-group"),
                                t = g.attr("transform").match(/translate\((.*),(.*)\)/);
                            return {x:Number(t[1]), y:Number(t[2])};
                        })
                        .on("start", function () {
                            d3.event.sourceEvent.stopPropagation(); // silence other listeners
                            // if (d3.event.sourceEvent.which == 1)
                            //     dragInitiated = true;
                        })
                        .on("drag", dragged(_this)));

            };
        }

        function mouseover(p) {
            d3.select(this.parentNode).select("text").classed("active", true);
            d3.selectAll(".column text").classed("active", d => d == p);

            // d3.select(this.parentNode).append("text")
            //     .attr("class","gpv-name")
            //     .attr("x", d3.event.offsetX)
            //     .attr("y", 10)
            //     .attr("dy", ".32em")
            //     .text( d => d.name );

        }

        function mouseout() {
            d3.selectAll("text").classed("active", false);
            d3.selectAll(".gpv-name").remove();
        }
        // function dragstarted(d) {
        //     d3.event.sourceEvent.stopPropagation();
        // }

        function dragged(x) {
            const _this=x;
            return function(d) {
                d3.event.sourceEvent.stopPropagation();
                const dy = Math.max(
                    Math.min(d3.event.y, 0),
                    -_this.current_props.length*_this.y(1) +_this.options.height
                );
                d3.select(".gpv-rows-group")
                    .attr("transform", d => "translate(0, " + dy + ")");
            }
        }

        row.append("text")
            .attr("x", -6)
            .attr("y", this.y(1) / 2)
            .attr("dy", ".32em")
            .attr("text-anchor", "end")
            .text( d => d.property );


        let column_p = this.svg.selectAll(".column")
            .data(this.organisms);

        column_p
            .attr("transform", d => "translate(" + this.x(d) + ")rotate(-90)")
            .selectAll("text")
                .attr("y", this.x.bandwidth() / 2)

        let column = column_p
            .enter().append("g")
            .attr("class", "column")
            .attr("transform", d => "translate(" + this.x(d) + ")rotate(-90)");

        column.append("line")
            .attr("x1", -this.options.width);

        column.append("text")
            .attr("x", 6)
            .attr("y", this.x.bandwidth() / 2)
            .attr("dy", ".32em")
            .attr("text-anchor", "start")
            .text( d => d );

    }

}
