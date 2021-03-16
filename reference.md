## Classes

<dl>
<dt><a href="#GenomePropertiesHierarchy">GenomePropertiesHierarchy</a></dt>
<dd><p>Genome Properties are organized in a hierarchy.
This Class manages the file that defines that hierarchy and uses is to allow filtering over the heatmap</p>
</dd>
<dt><a href="#GPModal">GPModal</a></dt>
<dd><p>Manager for a modla dialog, that has an overlay grey area and a dialog box in the middle</p>
</dd>
<dt><a href="#ZoomPanel">ZoomPanel</a></dt>
<dd><p>Creates a panel with a slider and +/- buttons to allow resizing the view</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#filterByLegend">filterByLegend</a></dt>
<dd></dd>
<dt><a href="#filterByHierarchy">filterByHierarchy</a></dt>
<dd><p>Genome Properties are organised in a hierarchy. By invoking this function, the list of properties in <code>viewer.props</code> is filtered
by only including those whose <code>parent_top_properties</code> are included in <code>viewer.gp_hierarchy</code></p>
</dd>
<dt><a href="#filterByText">filterByText</a></dt>
<dd><p>Filters the list of properties in <code>viewer.props</code> by checnking if their name includes the text in <code>viewer.filter_text</code></p>
</dd>
<dt><a href="#transformByScroll">transformByScroll</a></dt>
<dd><p>Updates this and othe components as if a scroll event happened.
It became the de-facto refresh of the whole viewer, as it groups the minimum necesary changes to trigger a full update.</p>
</dd>
<dt><a href="#drawScrollXBar">drawScrollXBar</a></dt>
<dd><p>Append a group into the viewer&#39;s mainGroup.
It contains the elements to draw a simple horizontal srollbar, and attach the dragging events to them.</p>
</dd>
<dt><a href="#updateScrollBars">updateScrollBars</a></dt>
<dd><p>A single method to trigger the update of all the scroll bars of the viewer. We currently only use 1.</p>
</dd>
<dt><a href="#createGradient">createGradient</a></dt>
<dd><p>Appends a <code>defs</code> element in the main group of the viewer.
It contains the definitions of the gradients used in th masks around the heatmap</p>
</dd>
<dt><a href="#drawMasks">drawMasks</a></dt>
<dd><p>Appends a new group element into the mainGroup of the viewer.
The group contains masks as rectangles to give the effect of new GP fading-in/out while horizontal scrolling</p>
</dd>
<dt><a href="#updateMasks">updateMasks</a></dt>
<dd><p>Update the size and position of the masks</p>
</dd>
<dt><a href="#drawDragArea">drawDragArea</a></dt>
<dd><p>Draws a draggable area ||| to redifine the widthassigned to the tree.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#updateScrollBarX">updateScrollBarX(viewer, visible_cols, current_col)</a></dt>
<dd><p>Updates the size and position of the scrollbar.
The size of the draggable is proportional to the number of visible columns in the graphic</p>
</dd>
</dl>

<a name="GenomePropertiesHierarchy"></a>

## GenomePropertiesHierarchy
Genome Properties are organized in a hierarchy.
This Class manages the file that defines that hierarchy and uses is to allow filtering over the heatmap

**Kind**: global class  

* [GenomePropertiesHierarchy](#GenomePropertiesHierarchy)
    * [new GenomePropertiesHierarchy()](#new_GenomePropertiesHierarchy_new)
    * [.nodes](#GenomePropertiesHierarchy+nodes) : <code>Object</code>
    * [.root](#GenomePropertiesHierarchy+root) : <code>Object</code>
    * [.hierarchy_switch](#GenomePropertiesHierarchy+hierarchy_switch) : <code>Array</code>
    * [.dipatcher](#GenomePropertiesHierarchy+dipatcher) : <code>Object</code>
    * [.load_hierarchy_from_path(path)](#GenomePropertiesHierarchy+load_hierarchy_from_path) ⇒ [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)
    * [.load_hierarchy_from_data(data)](#GenomePropertiesHierarchy+load_hierarchy_from_data)
    * [.add_node_recursively(node)](#GenomePropertiesHierarchy+add_node_recursively)
    * [.get_top_level_gp_by_id(id)](#GenomePropertiesHierarchy+get_top_level_gp_by_id) ⇒ <code>Array</code>
    * [.get_top_level_gp(node)](#GenomePropertiesHierarchy+get_top_level_gp) ⇒ <code>Set</code>
    * [.toggle_switch(id)](#GenomePropertiesHierarchy+toggle_switch)
    * [.on(typename)](#GenomePropertiesHierarchy+on) ⇒ [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)

<a name="new_GenomePropertiesHierarchy_new"></a>

### new GenomePropertiesHierarchy()
Initializes all the class attributes.

<a name="GenomePropertiesHierarchy+nodes"></a>

### genomePropertiesHierarchy.nodes : <code>Object</code>
Hashmap object from nodeId to its object.

**Kind**: instance property of [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)  
<a name="GenomePropertiesHierarchy+root"></a>

### genomePropertiesHierarchy.root : <code>Object</code>
Reference to the root of the GP hierarchy

**Kind**: instance property of [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)  
<a name="GenomePropertiesHierarchy+hierarchy_switch"></a>

### genomePropertiesHierarchy.hierarchy\_switch : <code>Array</code>
List of top level GP indicating if its enabled or not for filtering purposes

**Kind**: instance property of [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)  
<a name="GenomePropertiesHierarchy+dipatcher"></a>

### genomePropertiesHierarchy.dipatcher : <code>Object</code>
Event dispatcher using `d3.dispatch`

**Kind**: instance property of [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)  
<a name="GenomePropertiesHierarchy+load_hierarchy_from_path"></a>

### genomePropertiesHierarchy.load\_hierarchy\_from\_path(path) ⇒ [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)
Fetches  the hierarchy from a given URL, and triggers the processing of the file.

**Kind**: instance method of [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)  
**Returns**: [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy) - The curent instance for chaining methods.  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>String</code> | The URL where the hierarchy file is. |

<a name="GenomePropertiesHierarchy+load_hierarchy_from_data"></a>

### genomePropertiesHierarchy.load\_hierarchy\_from\_data(data)
Defines all the atrributes by processing the JSON object

**Kind**: instance method of [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Object representing the root of the Hierachy |

<a name="GenomePropertiesHierarchy+add_node_recursively"></a>

### genomePropertiesHierarchy.add\_node\_recursively(node)
Wlaks the tree, adding each node in `this.nodes` and generating a list of parents(in `node.parents`) for each node.

**Kind**: instance method of [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>Object</code> | each node has the shape `{id: <String>, name: <String>, children: [<Node>]}`. |

<a name="GenomePropertiesHierarchy+get_top_level_gp_by_id"></a>

### genomePropertiesHierarchy.get\_top\_level\_gp\_by\_id(id) ⇒ <code>Array</code>
Gets the node from `this.nodes` and searches it top level properties

**Kind**: instance method of [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)  
**Returns**: <code>Array</code> - Array of ids of the top level properties.  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | node present in this.nodes |

<a name="GenomePropertiesHierarchy+get_top_level_gp"></a>

### genomePropertiesHierarchy.get\_top\_level\_gp(node) ⇒ <code>Set</code>
Gets the top level genome properties associated with a given node

**Kind**: instance method of [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)  
**Returns**: <code>Set</code> - Set of top level genome properties.  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>Object</code> | node present in this.nodes |

<a name="GenomePropertiesHierarchy+toggle_switch"></a>

### genomePropertiesHierarchy.toggle\_switch(id)
finds the top level property with the given id,  toggles the value of `enable`, and then dispatches an event announceing the change.

**Kind**: instance method of [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | Id of the top level genome property |

<a name="GenomePropertiesHierarchy+on"></a>

### genomePropertiesHierarchy.on(typename) ⇒ [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)
shortcut to add invoke a callback when one of the dispatched events gets trigger

**Kind**: instance method of [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy)  
**Returns**: [<code>GenomePropertiesHierarchy</code>](#GenomePropertiesHierarchy) - The curent instance for chaining methods.  

| Param | Type | Description |
| --- | --- | --- |
| typename | <code>String</code> | one of the dispatched events: "siwtchChanged", "hierarchyLoaded" |

<a name="GPModal"></a>

## GPModal
Manager for a modla dialog, that has an overlay grey area and a dialog box in the middle

**Kind**: global class  

* [GPModal](#GPModal)
    * [new GPModal(element)](#new_GPModal_new)
    * [.setVisibility(visibility)](#GPModal+setVisibility)
    * [.showContent(content, fixed)](#GPModal+showContent)
    * [.getContentElement()](#GPModal+getContentElement) ⇒ <code>D3Selector</code>

<a name="new_GPModal_new"></a>

### new GPModal(element)
Appends the divs for the modal overlay and the popup.
Inside the popup creates a `div` element with a refence in `this.content`.


| Param | Type | Description |
| --- | --- | --- |
| element | <code>HTMLElement</code> | DOM element where the modal should be appended. |

<a name="GPModal+setVisibility"></a>

### gpModal.setVisibility(visibility)
Sets the visibility of the components of the modal

**Kind**: instance method of [<code>GPModal</code>](#GPModal)  

| Param | Type | Description |
| --- | --- | --- |
| visibility | <code>Boolean</code> | visibility of the components of the modal |

<a name="GPModal+showContent"></a>

### gpModal.showContent(content, fixed)
Sets the content of the popup, and sets the visibility to `true`

**Kind**: instance method of [<code>GPModal</code>](#GPModal)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| content | <code>String</code> |  | HTML to be appended in the dialog. |
| fixed | <code>Boolean</code> | <code>false</code> | If `false`, a click on the layover area closes the dialog.. |

<a name="GPModal+getContentElement"></a>

### gpModal.getContentElement() ⇒ <code>D3Selector</code>
Returns the reference(created in d3) to the content object.

**Kind**: instance method of [<code>GPModal</code>](#GPModal)  
**Returns**: <code>D3Selector</code> - Reference(created in d3) to the content object.  
<a name="ZoomPanel"></a>

## ZoomPanel
Creates a panel with a slider and +/- buttons to allow resizing the view

**Kind**: global class  
<a name="new_ZoomPanel_new"></a>

### new ZoomPanel(parameterNameHere)
Sets all the passed options in class atributes and initiates a d3.scale for the slider.

**Returns**: <code>ReturnValueDataTypeHere</code> - Brief description of the returning value here.  

| Param | Type | Description |
| --- | --- | --- |
| parameterNameHere | <code>Object</code> | Brief description of the parameter here. Note: For other notations of data types, please refer to JSDocs: DataTypes command. |

<a name="filterByLegend"></a>

## filterByLegend
**Kind**: global constant  
**Summary**: A cell in the heatmap can have 1 of 3 values: Yes, No or partial. Indicating if there is evidence that the GP is present in a given species.
Given multiple species, this function filters the list of genome properties to which currentluy selected species match the given condition, For example:

|Value    | Filter | JSON               | Explanation                                          |
|---------|--------|--------------------|------------------------------------------------------|
| YES     | ∀      | `{"YES": "∀"}`     | All the species have this GP                         |
| NO      | ∃      | `{"NO": "∃"}`      | There is at least 1 species with this GP             |
| PARTIAL | ∄      | `{"PARTIAL": "∄"}` | None of the species have partial evidence of this GP |

The current set of filters is in `viewer.legend_filters` and the filtered props will be saved in `viewer.props`.  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="filterByHierarchy"></a>

## filterByHierarchy
Genome Properties are organised in a hierarchy. By invoking this function, the list of properties in `viewer.props` is filtered
by only including those whose `parent_top_properties` are included in `viewer.gp_hierarchy`

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="filterByText"></a>

## filterByText
Filters the list of properties in `viewer.props` by checnking if their name includes the text in `viewer.filter_text`

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="transformByScroll"></a>

## transformByScroll
Updates this and othe components as if a scroll event happened.
It became the de-facto refresh of the whole viewer, as it groups the minimum necesary changes to trigger a full update.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="drawScrollXBar"></a>

## drawScrollXBar
Append a group into the viewer's mainGroup.
It contains the elements to draw a simple horizontal srollbar, and attach the dragging events to them.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="updateScrollBars"></a>

## updateScrollBars
A single method to trigger the update of all the scroll bars of the viewer. We currently only use 1.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |
| visible_cols | <code>Number</code> | Indicates how many columns are visible in the area assgined to the heatmap. |
| current_col | <code>Number</code> | Indicates the index of the first visible column out of the total number of GP. |

<a name="createGradient"></a>

## createGradient
Appends a `defs` element in the main group of the viewer.
It contains the definitions of the gradients used in th masks around the heatmap

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="drawMasks"></a>

## drawMasks
Appends a new group element into the mainGroup of the viewer.
The group contains masks as rectangles to give the effect of new GP fading-in/out while horizontal scrolling

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="updateMasks"></a>

## updateMasks
Update the size and position of the masks

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="drawDragArea"></a>

## drawDragArea
Draws a draggable area ||| to redifine the widthassigned to the tree.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="updateScrollBarX"></a>

## updateScrollBarX(viewer, visible_cols, current_col)
Updates the size and position of the scrollbar.
The size of the draggable is proportional to the number of visible columns in the graphic

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |
| visible_cols | <code>Number</code> | Indicates how many columns are visible in the area assgined to the heatmap. |
| current_col | <code>Number</code> | Indicates the index of the first visible column out of the total number of GP. |

