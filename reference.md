## Classes

<dl>
<dt><a href="#FileGetter">FileGetter</a></dt>
<dd><p>The file getter allows to fetch files and use a Gauge visualization to report its progress</p>
</dd>
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
<dt><a href="#enableSpeciesFromPreLoaded">enableSpeciesFromPreLoaded</a></dt>
<dd><p>Assuming the matches for the species with the given <code>taxid</code> are already loaded. This funcions sets it as selected in the tree and trigger a refresh, so the heatmap is updated.</p>
</dd>
<dt><a href="#loadGenomePropertiesText">loadGenomePropertiesText</a></dt>
<dd><p>Takes the information of the GP matches of a species, given as a text file, parses it as JSON and loads it in the viewer.
If the text is not a valid JSON it tries to process it as a TSV.
<em>NOTE:</em> The step information from a TSV file is randomly generated.</p>
</dd>
<dt><a href="#preloadSpecies">preloadSpecies</a></dt>
<dd><p>Preloads a data structure with data for multiple species.
Useful to preload all data and this way make the viewer more performant, instead of making a call per species.</p>
</dd>
<dt><a href="#removeGenomePropertiesFile">removeGenomePropertiesFile</a></dt>
<dd><p>Removes a species from the GP viewer. it removes its prescence from  <code>viewer.organism_totals</code>, <code>viewer.organisms</code>, <code>viewer.gp_taxonomy</code> and then updates the viewer.
The data won&#39;t be removed from <code>viewer.data</code> so it is still available in the client in case the users add the species back.
Useful to preload all data and this way make the viewer more performant, instead of making a call per species.</p>
</dd>
<dt><a href="#loadGenomePropertiesFile">loadGenomePropertiesFile</a> ⇒ <code>ReturnValueDataTypeHere</code></dt>
<dd><p>Loads a genome property file for a single species. If the fetch requests is succesfull it loads it in the viewer via <code>loadGenomePropertiesText</code>.
The source is the server sert in the options of the initializaation of the viewer. Defaults to the github files.</p>
</dd>
<dt><a href="#uploadLocalGPFile">uploadLocalGPFile</a></dt>
<dd><p>Reads a local file from the users machine.
If it follows the InterProScan format it calls the genome properties server to get the  of the genome properties on the given protein matches.
Otherwise it tries to use the file as if it is already in the Genomeproperties format and loades it in the viewer using  <code>loadGenomePropertiesText</code>.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#concat">concat(arrays)</a> ⇒ <code>Uint8Array</code></dt>
<dd><p>Merges multiple byteArrays into a single Array.
This is a utility function to be able to get the progress of a request.</p>
</dd>
<dt><a href="#updateScrollBarX">updateScrollBarX(viewer, visible_cols, current_col)</a></dt>
<dd><p>Updates the size and position of the scrollbar.
The size of the draggable is proportional to the number of visible columns in the graphic</p>
</dd>
<dt><a href="#isLineOK">isLineOK(line)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Quick check if a line from a TSV file is as expected</p>
</dd>
<dt><a href="#mergeObjectToData">mergeObjectToData(data, obj)</a></dt>
<dd><p>Merges the data of the genome properties of a single species into a data structure of multiple species</p>
</dd>
<dt><a href="#isIpproLine">isIpproLine(line)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Quick check if a line follows the TSV InterProScan format</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#GenomePropertiesMatches">GenomePropertiesMatches</a> : <code>Object</code></dt>
<dd><p>Data structure that contains all the genome properties, and the values of matching several species.</p>
</dd>
</dl>

<a name="FileGetter"></a>

## FileGetter
The file getter allows to fetch files and use a Gauge visualization to report its progress

**Kind**: global class  

* [FileGetter](#FileGetter)
    * [new FileGetter(viewer)](#new_FileGetter_new)
    * [.files](#FileGetter+files) : <code>Object</code>
    * [.isActive](#FileGetter+isActive) : <code>Boolean</code>
    * [.viewer](#FileGetter+viewer) : <code>GernomeProperiesViewer</code>
    * [.activeGauge](#FileGetter+activeGauge) : <code>Number</code>
    * [.activeGauges](#FileGetter+activeGauges) : <code>Array</code>
    * [.getJSON(path)](#FileGetter+getJSON) ⇒ <code>Object</code>
    * [.getText(path, shouldParseAsJSON)](#FileGetter+getText) ⇒ <code>String</code> \| <code>Object</code>
    * [.createProgressContent(modal)](#FileGetter+createProgressContent)
    * [.updateProgress()](#FileGetter+updateProgress)

<a name="new_FileGetter_new"></a>

### new FileGetter(viewer)
Initializes the the FileGetter


| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="FileGetter+files"></a>

### fileGetter.files : <code>Object</code>
Hashmap object from filename to data and download metadata.

**Kind**: instance property of [<code>FileGetter</code>](#FileGetter)  
<a name="FileGetter+isActive"></a>

### fileGetter.isActive : <code>Boolean</code>
indicates if the modal dialog showing FileGetter si currently active

**Kind**: instance property of [<code>FileGetter</code>](#FileGetter)  
<a name="FileGetter+viewer"></a>

### fileGetter.viewer : <code>GernomeProperiesViewer</code>
The instance of the genome properites viewer

**Kind**: instance property of [<code>FileGetter</code>](#FileGetter)  
<a name="FileGetter+activeGauge"></a>

### fileGetter.activeGauge : <code>Number</code>
Index of the Gauge that is currently in display.

**Kind**: instance property of [<code>FileGetter</code>](#FileGetter)  
<a name="FileGetter+activeGauges"></a>

### fileGetter.activeGauges : <code>Array</code>
All the gauges. One per file to download.

**Kind**: instance property of [<code>FileGetter</code>](#FileGetter)  
<a name="FileGetter+getJSON"></a>

### fileGetter.getJSON(path) ⇒ <code>Object</code>
Alias over the method `getText()` indicating that it should parse it as JSON

**Kind**: instance method of [<code>FileGetter</code>](#FileGetter)  
**Returns**: <code>Object</code> - JSON object with the content of the file.  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>String</code> | URL to the file to upload |

<a name="FileGetter+getText"></a>

### fileGetter.getText(path, shouldParseAsJSON) ⇒ <code>String</code> \| <code>Object</code>
Triggers the fetch for the file in the `path` and updates the progress in the gauges

**Kind**: instance method of [<code>FileGetter</code>](#FileGetter)  
**Returns**: <code>String</code> \| <code>Object</code> - Text content of the file or JSON object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| path | <code>String</code> |  | URL to the file to upload |
| shouldParseAsJSON | <code>Boolean</code> | <code>false</code> | Indicates if it should attent to parse is as JSON. |

<a name="FileGetter+createProgressContent"></a>

### fileGetter.createProgressContent(modal)
Creates the Dialog components to display thr FileGetter

**Kind**: instance method of [<code>FileGetter</code>](#FileGetter)  

| Param | Type | Description |
| --- | --- | --- |
| modal | <code>D3Selector</code> | D3 Selector of the modal component were the gauge will be displayed. |

<a name="FileGetter+updateProgress"></a>

### fileGetter.updateProgress()
Goes through `this.files` and updates the graphical components to reflect the progress of each downloaded file.

**Kind**: instance method of [<code>FileGetter</code>](#FileGetter)  
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

* [ZoomPanel](#ZoomPanel)
    * [new ZoomPanel(options)](#new_ZoomPanel_new)
    * _instance_
        * [.draw_panel()](#ZoomPanel+draw_panel)
        * [.refresh()](#ZoomPanel+refresh)
    * _static_
        * [.add_button(panel, text, x, y, r)](#ZoomPanel.add_button)

<a name="new_ZoomPanel_new"></a>

### new ZoomPanel(options)
Sets all the passed options in class atributes and initiates a d3.scale for the slider.


| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | All the available options of this class: |

**Example** *(Options defaults and explanations.)*  
```javascript
{
   x = 0, // X coordinate to locate the panel
   y = 0, // Y coordinate to locate the panel
   centerX = 17, // X coordinate where the buttons should be centered to
   top = 30, // Space in top before the center of the first button, use to create a gap for the sort button
   r = 10, // radius of the buttons
   padding = 3, // padding in between buttons and slider
   scrollH = 40, // Height of the scroller/slider
   scrollW = 10, // Width of the scroller/slider
   container = null, // D3 selection where the panel will be added
   domain = [0, 100], // Array of 2 positions defining the domain of values the function will return
   function_plus = null, // Callback for when the + button gets clicked
   function_less = null, // Callback for when the - button gets clicked
   function_slide = null, // Callback for when the slider gets dragged
 }
```
<a name="ZoomPanel+draw_panel"></a>

### zoomPanel.draw\_panel()
Appends a group in the given container that includes the SVG elements to represent the zoomer.
It also sets the events binding them to the callback funtions passed in the options object.

**Kind**: instance method of [<code>ZoomPanel</code>](#ZoomPanel)  
**Summary**: If the description is long, write your summary here. Otherwise, feel free to remove this.  
<a name="ZoomPanel+refresh"></a>

### zoomPanel.refresh()
Updates the position of the panel

**Kind**: instance method of [<code>ZoomPanel</code>](#ZoomPanel)  
<a name="ZoomPanel.add_button"></a>

### ZoomPanel.add\_button(panel, text, x, y, r)
Add a new circular button into a panel

**Kind**: static method of [<code>ZoomPanel</code>](#ZoomPanel)  

| Param | Type | Description |
| --- | --- | --- |
| panel | <code>Object</code> | D3 selector of the panel to add the button |
| text | <code>String</code> | Text for the button. the function doesn't check if the text doesn't fit the given radius |
| x | <code>Number</code> | X coordinate in the panel |
| y | <code>Number</code> | Y coordinate in the panel |
| r | <code>Number</code> | radius of the circles |

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

<a name="enableSpeciesFromPreLoaded"></a>

## enableSpeciesFromPreLoaded
Assuming the matches for the species with the given `taxid` are already loaded. This funcions sets it as selected in the tree and trigger a refresh, so the heatmap is updated.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |
| taxId | <code>String</code> | Taxonomy ID to be dsiplayed. |
| isFromFile | <code>Boolean</code> | Indicates if the file to be enabled comes from a file uploaded by the user. |
| shouldUpdate | <code>Boolean</code> | Indicates if an update of the viewer is necesary after enabling the taxId. |

<a name="loadGenomePropertiesText"></a>

## loadGenomePropertiesText
Takes the information of the GP matches of a species, given as a text file, parses it as JSON and loads it in the viewer.
If the text is not a valid JSON it tries to process it as a TSV.
*NOTE:* The step information from a TSV file is randomly generated.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |
| label | <code>String</code> | Taxonomy ID or file name to be displayed. |
| text | <code>String</code> | P matches of a species as a String, either in JSON or TSV format. |
| isFromFile | <code>Boolean</code> | Indicates if the file to be enabled comes from a file uploaded by the user. |

<a name="preloadSpecies"></a>

## preloadSpecies
Preloads a data structure with data for multiple species.
Useful to preload all data and this way make the viewer more performant, instead of making a call per species.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="removeGenomePropertiesFile"></a>

## removeGenomePropertiesFile
Removes a species from the GP viewer. it removes its prescence from  `viewer.organism_totals`, `viewer.organisms`, `viewer.gp_taxonomy` and then updates the viewer.
The data won't be removed from `viewer.data` so it is still available in the client in case the users add the species back.
Useful to preload all data and this way make the viewer more performant, instead of making a call per species.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |

<a name="loadGenomePropertiesFile"></a>

## loadGenomePropertiesFile ⇒ <code>ReturnValueDataTypeHere</code>
Loads a genome property file for a single species. If the fetch requests is succesfull it loads it in the viewer via `loadGenomePropertiesText`.
The source is the server sert in the options of the initializaation of the viewer. Defaults to the github files.

**Kind**: global constant  
**Returns**: <code>ReturnValueDataTypeHere</code> - Brief description of the returning value here.  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |
| tax_id | <code>String</code> | Taxonomy ID to be requested. |

<a name="uploadLocalGPFile"></a>

## uploadLocalGPFile
Reads a local file from the users machine.
If it follows the InterProScan format it calls the genome properties server to get the  of the genome properties on the given protein matches.
Otherwise it tries to use the file as if it is already in the Genomeproperties format and loades it in the viewer using  `loadGenomePropertiesText`.

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| viewer | <code>GernomeProperiesViewer</code> | The instance of the genome properites viewer |
| fileToRead | <code>Blob</code> | The Blob or File from which to read. |

<a name="concat"></a>

## concat(arrays) ⇒ <code>Uint8Array</code>
Merges multiple byteArrays into a single Array.
This is a utility function to be able to get the progress of a request.

**Kind**: global function  
**Returns**: <code>Uint8Array</code> - Single merged array.  

| Param | Type | Description |
| --- | --- | --- |
| arrays | <code>Array</code> | Array of ByteArrays. |

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

<a name="isLineOK"></a>

## isLineOK(line) ⇒ <code>Boolean</code>
Quick check if a line from a TSV file is as expected

**Kind**: global function  
**Returns**: <code>Boolean</code> - Is OK `true` or not `false`  

| Param | Type | Description |
| --- | --- | --- |
| line | <code>String</code> | Line to text |

<a name="mergeObjectToData"></a>

## mergeObjectToData(data, obj)
Merges the data of the genome properties of a single species into a data structure of multiple species

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| data | [<code>GenomePropertiesMatches</code>](#GenomePropertiesMatches) | Genome Properties matching multiple species |
| obj | [<code>GenomePropertiesMatches</code>](#GenomePropertiesMatches) | Genome Properties matching a single species |

<a name="isIpproLine"></a>

## isIpproLine(line) ⇒ <code>Boolean</code>
Quick check if a line follows the TSV InterProScan format

**Kind**: global function  
**Returns**: <code>Boolean</code> - Is OK `true` or not `false`  

| Param | Type | Description |
| --- | --- | --- |
| line | <code>String</code> | Line to test |

<a name="GenomePropertiesMatches"></a>

## GenomePropertiesMatches : <code>Object</code>
Data structure that contains all the genome properties, and the values of matching several species.

**Kind**: global typedef  
**Example** *(Genome properties matching data for a single property with a single step on a single species)*  
```js
{
   "GenPropXXXX":{
     property: "GenPropXXXX",
     name: "Name of GenPropXXXX",
     steps: [
       {
         step: "1",
         step_name: "Lonely Step",
         required: 1,
         values: { 833330: 1 },
       },
     ],
     values: { 833330: "YES", TOTAL: { PARTIAL: 0, NO: 0, YES: 1 } },
   }
}
```
