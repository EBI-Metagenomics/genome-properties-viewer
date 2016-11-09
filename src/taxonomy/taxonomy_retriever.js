"use strict";
var mysql      = require('mysql');

var fs = require("fs");
var content = fs.readFileSync("./src/taxonomy/config.json");
var jsonContent = JSON.parse(content);
var ids = [
    "1005058", "1216967", "1509", "192952", "224325", "243230", "246195", "272123", "272947", "309801", "340099",
    "382464", "469381", "515635", "547558", "6239", "706587", "880070", "10090", "1237085", "1580", "195", "228410",
    "243231", "246197", "272559", "273057", "313628", "359391", "387344", "471821", "521095", "555778", "62928",
    "717231", "887291", "1033802", "1292034", "177416", "203124", "228908", "243232", "246199", "272561", "273075",
    "314225", "36329", "398578", "479434", "523841", "559292", "637389", "7227", "887700", "1042209", "1303518",
    "186497", "205922", "234267", "243233", "251229", "272569", "281689", "314260", "367928", "441768", "483219",
    "523846", "561229", "644282", "741277", "926550", "1111708", "1332188", "187303", "208964", "240015", "243273",
    "262698", "272622", "284812", "314565", "3702", "441771", "485913", "525280", "570509", "650150", "754409",
    "926569", "1140", "1338011", "190192", "211586", "240292", "264462", "272623", "285006", "316274", "374847",
    "452637", "497964", "525372", "572479", "653733", "760142", "93061", "1142394", "1348852", "190485", "216591",
    "242231", "243274", "265072", "272624", "290315", "319224", "375451", "455632", "498848", "525373", "59374",
    "667014", "768066", "945713", "1162668", "1360", "190650", "224308", "242619", "243275", "266117", "272843",
    "29343", "324602", "379066", "457570", "509192", "525909", "598659", "682795", "83332", "9606", "1163617",
    "1410620", "192222", "224324", "243164", "243277", "267608", "272944", "309799", "339670", "380703", "4577",
    "511051", "546262", "59919", "690850", "999552", "83333"
];
// var ids = ["999552","83333"];
// var ids = ["243230", "246195", "272947"];
var not_included = ids.slice();

var taxon = {};

function newNode(lineage, species, taxonomy, taxId, rank){
    taxId = taxId || null;
    var id = taxId || lineage+";"+species;
    return {
        id: id,
        lineage: lineage,
        taxId: taxId,
        species: species,
        taxonomy: taxonomy,
        rank: rank,
        parent: null,
        children: []
    };
}

function newNodeFromRow(row){
    var taxonomy = row.taxonomy.split(";").filter(d=>d.trim()!=""),
        species = row.level;
    return newNode(
        row.taxonomy,
        species,
        taxonomy,
        row.ncbi_taxid
    );
}

function buildAncestryFromDB(node, connection, left, right) {
    var query ='SELECT * FROM pfam_30_0.taxonomy WHERE lft<'+left+' AND rgt>'+right+' AND minimal=1 ORDER BY lft DESC;';
    var current = node;
    connection.query(query, function(err, rows, fields) {
        if (err) throw err;
        for (var i=0;i<rows.length;i++) {
            var row = rows[i];
            if (!taxon[row.ncbi_taxid]){
                taxon[row.ncbi_taxid] = newNodeFromRow(row);
                taxon[row.ncbi_taxid].children.push(current);
                current.parent = row.ncbi_taxid;
                current = taxon[row.ncbi_taxid];
            } else {
                taxon[row.ncbi_taxid].children.push(current);
                current.parent = row.ncbi_taxid;
                current = taxon[row.ncbi_taxid];
                break;
            }
        }
        if (!current.parent && current.id !== 'root'){
            taxon["root"].children.push(current);
            current.parent = "root";
        }
    });
}
function annotate_number_of_leaves(node){
    if (node.number_of_leaves)
        return node.number_of_leaves;
    if (node.children.length<1)
        node.number_of_leaves = 1;
    else{
        node.number_of_leaves = 0;
        node.children.forEach(d=>node.number_of_leaves += annotate_number_of_leaves(d));
    }
    return node.number_of_leaves;
}

var connection = mysql.createConnection(jsonContent);
connection.connect();
taxon["root"] = newNode("", "root", "", "root", null, []);
var query ='SELECT * FROM pfam_30_0.taxonomy WHERE ncbi_taxid IN ('+ids.join(",")+');';
connection.query(query, function(err, rows, fields) {
    if (err) throw err;
    rows.forEach(row => {
        if (!row.ncbi_taxid) return;
        taxon[row.ncbi_taxid] = newNodeFromRow(row);
        taxon[row.ncbi_taxid].number_of_leaves = 1;
        buildAncestryFromDB(taxon[row.ncbi_taxid], connection, row.lft, row.rgt);
        var index =  not_included.indexOf(String(row.ncbi_taxid));
        if (index!=-1)
            not_included.splice(index, 1);
    });
    connection.end(function(err){
        // var root = getRoot();
        annotate_number_of_leaves(taxon["root"]);
        console.log(JSON.stringify(taxon["root"]));

    });
});

