"use strict";
exports.__esModule = true;
var ts = require("typescript");
var fs = require("fs");
/** Generate documentation for all classes in a set of .ts files */
function generateDocumentation(fileNames, options) {
    // Build a program using the set of root file names in fileNames
    var program = ts.createProgram(fileNames, options);
    // Get the checker, we will use it to find more about classes
    var checker = program.getTypeChecker();
    var output = [];
    // Visit every sourceFile in the program
    for (var _i = 0, _a = program.getSourceFiles(); _i < _a.length; _i++) {
        var sourceFile = _a[_i];
        //if (!sourceFile.isDeclarationFile) {
        // Walk the tree to search for classes
        ts.forEachChild(sourceFile, visit);
        //}
    }
    // print out the doc
    fs.writeFileSync("classes.json", JSON.stringify(output, undefined, 4));
    return;
    /** visit nodes finding exported classes */
    function visit(node) {
        // Only consider exported nodes
        if (!isNodeExported(node)) {
            return;
        }
        if (ts.isInterfaceDeclaration(node) && !ts.isImportClause(node)) {
            console.log("is interface " + node.name.getText());
        }
        /*
             if (ts.isClassDeclaration(node) && node.name) {
                 // This is a top level class, get its symbol
                 let symbol = checker.getSymbolAtLocation(node.name);
                 if (symbol) {
                     output.push(serializeClass(symbol));
                 }
                 // No need to walk any further, class expressions/inner declarations
                 // cannot be exported
             } else if (ts.isModuleDeclaration(node)) {
                 // This is a namespace, visit its children
                 ts.forEachChild(node, visit);
             }*/
    }
    /** Serialize a symbol into a json object */
    function serializeSymbol(symbol) {
        return {
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
            type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration))
        };
    }
    /** Serialize a class symbol information */
    function serializeClass(symbol) {
        var details = serializeSymbol(symbol);
        // Get the construct signatures
        var constructorType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
        details.constructors = constructorType
            .getConstructSignatures()
            .map(serializeSignature);
        return details;
    }
    /** Serialize a signature (call or construct) */
    function serializeSignature(signature) {
        return {
            parameters: signature.parameters.map(serializeSymbol),
            returnType: checker.typeToString(signature.getReturnType()),
            documentation: ts.displayPartsToString(signature.getDocumentationComment(checker))
        };
    }
    /** True if this is visible outside this file, false otherwise */
    function isNodeExported(node) {
        return ((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 ||
            (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile));
    }
}
generateDocumentation(process.argv.slice(2), {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS
});
