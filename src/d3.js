export { select, selectAll } from "d3-selection";
export { text, xml, json } from "d3-request";
export { range } from "d3-array";
export { drag } from "d3-drag";
export {
  stack,
  pie,
  arc,
  symbol,
  symbolCross,
  symbolCircle,
  symbolTriangle,
} from "d3-shape";
export { transition } from "d3-transition";
export { stratify, cluster, tree, hierarchy } from "d3-hierarchy";
export { scaleLinear, scaleBand, scaleOrdinal } from "d3-scale";

const colors = (s) => s.match(/.{6}/g).map((x) => `#${x}`);
export const schemeCategory20b = colors(
  "393b795254a36b6ecf9c9ede6379398ca252b5cf6bcedb9c8c6d31bd9e39e7ba52e7cb94843c39ad494ad6616be7969c7b4173a55194ce6dbdde9ed6"
);

export { tsvParseRows } from "d3-dsv";
export { zoom } from "d3-zoom";
export { interpolate } from "d3-interpolate";
export { dispatch } from "d3-dispatch";

export const entries = (object) =>
  Object.entries(object || {}).map(([key, value]) => ({ key, value }));
