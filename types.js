"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const node_process_1 = require("node:process");
const typescript_1 = require("typescript");
function _createProgram(file) {
    const configPath = (0, typescript_1.findConfigFile)('.', typescript_1.sys.fileExists, file);
    if (!configPath) {
        throw new Error('config file not found');
    }
    const { config, error } = (0, typescript_1.readConfigFile)(configPath, typescript_1.sys.readFile);
    if (error !== undefined) {
        throw new Error(`${error}`);
    }
    const { errors, fileNames: rootNames, options } = (0, typescript_1.parseJsonConfigFileContent)(config, typescript_1.sys, (0, node_path_1.dirname)(configPath));
    if (errors.length !== 0) {
        throw new Error(errors.join());
    }
    return (0, typescript_1.createProgram)({ rootNames, options });
}
function _getType(program, sourceFileName, sourceRow, sourceColumn) {
    const source = program.getSourceFile(sourceFileName);
    if (!source) {
        throw new Error('source file not found');
    }
    const pos = (0, typescript_1.getPositionOfLineAndCharacter)(source, sourceRow - 1, sourceColumn - 1);
    function findNodeAt(pos, node) {
        if (pos < node.getFullStart() || pos >= node.getEnd()) {
            return undefined;
        }
        return (0, typescript_1.forEachChild)(node, child => findNodeAt(pos, child)) || node;
    }
    const node = findNodeAt(pos, source);
    if (!node) {
        throw new Error('no node at location');
    }
    const checker = program.getTypeChecker();
    const type = checker.getTypeAtLocation(node);
    return checker.typeToString(type, undefined, typescript_1.TypeFormatFlags.NoTruncation);
}
if (node_process_1.argv.length < 5) {
    (0, node_process_1.exit)(0);
}
const [sourceFileName, sourceRow, sourceColumn] = node_process_1.argv.slice(2);
console.log(_getType(_createProgram('tsconfig.json'), sourceFileName, parseInt(sourceRow), parseInt(sourceColumn)));
