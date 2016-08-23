
// export * from './src/gp-viewer';

import GenomePropertiesViewer from "./src/gp-viewer"
import * as d3 from "./src/d3";
// d3.GenomePropertiesViewer = GenomePropertiesViewer;
// window.GenomePropertiesViewer = GenomePropertiesViewer;
export default {d3: d3,GenomePropertiesViewer:GenomePropertiesViewer};
// let viewer = new GenomePropertiesViewer();
// viewer.load_genome_properties_file("10090");
// viewer.load_genome_properties_file("83333");
// console.log(viewer.data);
