import * as d3 from "./d3";

export const filterByLegend = (viewer) => {
  if (viewer.legend_filters) {
    for (const x of Object.keys(viewer.legend_filters)) {
      if (viewer.legend_filters[x] === "∀") {
        // eslint-disable-next-line no-param-reassign
        viewer.props = viewer.props.filter((prop) => {
          const values = d3
            .entries(prop.values)
            .filter((e) => viewer.organisms.indexOf(e.key) !== -1);
          return values.filter((e) => e.value === x).length === values.length;
        });
      } else if (viewer.legend_filters[x] === "∃") {
        // eslint-disable-next-line no-param-reassign
        viewer.props = viewer.props.filter((prop) => {
          const values = d3
            .entries(prop.values)
            .filter((e) => viewer.organisms.indexOf(e.key) !== -1);
          return values.filter((e) => e.value === x).length > 0;
        });
      } else if (viewer.legend_filters[x] === "∄") {
        // eslint-disable-next-line no-param-reassign
        viewer.props = viewer.props.filter((prop) => {
          const values = d3
            .entries(prop.values)
            .filter((e) => viewer.organisms.indexOf(e.key) !== -1);
          return values.filter((e) => e.value === x).length === 0;
        });
      }
    }
  }
};

export const filterByHierarchy = (viewer) => {
  // eslint-disable-next-line no-param-reassign
  viewer.props = viewer.props.filter((e) => {
    if (e.parent_top_properties === null) return true;
    for (const p of e.parent_top_properties)
      for (const tp of viewer.gp_hierarchy.hierarchy_switch)
        if (p === tp.id && tp.enable) return true;
    return false;
  });
};

export const filterByText = (viewer) => {
  if (viewer.filter_text) {
    // eslint-disable-next-line no-param-reassign
    viewer.props = viewer.props.filter(
      (e) =>
        e.name.toLowerCase().indexOf(viewer.filter_text.toLowerCase()) !== -1 ||
        String(e.property)
          .toLowerCase()
          .indexOf(viewer.filter_text.toLowerCase()) !== -1
    );
  }
};
