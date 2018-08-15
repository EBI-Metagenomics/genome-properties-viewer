import * as d3 from "./d3";

export const filterByLegend = viewer => {
  if (viewer.legend_filters) {
    for (let x of Object.keys(viewer.legend_filters)) {
      if (viewer.legend_filters[x] === "∀")
        viewer.props = viewer.props.filter(e => {
          const values = d3.entries(e.values).filter(e => e.key !== "TOTAL");
          return values.filter(e => e.value === x).length === values.length;
        });
      else if (viewer.legend_filters[x] === "∃")
        viewer.props = viewer.props.filter(e => {
          const values = d3.entries(e.values).filter(e => e.key !== "TOTAL");
          return values.filter(e => e.value === x).length > 0;
        });
      else if (viewer.legend_filters[x] === "∄")
        viewer.props = viewer.props.filter(e => {
          const values = d3.entries(e.values).filter(e => e.key !== "TOTAL");
          return values.filter(e => e.value === x).length === 0;
        });
    }
  }
};

export const filterByHierarchy = viewer => {
  viewer.props = viewer.props.filter(e => {
    if (e.parent_top_properties === null) return true;
    for (let p of e.parent_top_properties)
      for (let tp of viewer.gp_hierarchy.hierarchy_switch)
        if (p === tp.id && tp.enable) return true;
    return false;
  });
};

export const filterByText = () => {
  if (viewer.filter_text)
    viewer.props = viewer.props.filter(e => {
      return (
        e.name.toLowerCase().indexOf(viewer.filter_text.toLowerCase()) !== -1 ||
        String(e.property)
          .toLowerCase()
          .indexOf(viewer.filter_text.toLowerCase()) !== -1
      );
    });
};
