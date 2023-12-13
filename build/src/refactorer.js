"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const util_1 = require("./util");
const fromFileSystemPath = require('json-schema-ref-parser/lib/util/url')
    .fromFileSystemPath;
class OpenApiRefactorer {
    constructor(sourcePath, outputPath) {
        this.sourcePath = sourcePath;
        this.outputPath = outputPath;
        this.apiDoc = util_1.readOpenApiFile(sourcePath);
        this.outputFile = path_1.basename(this.outputPath);
        this.outputExtension = path_1.extname(this.outputPath);
    }
    /**
     * Parses an OpenAPI document and splits it into several chunks.
     * References are updated accordingly.
     */
    refactor() {
        const newApiDoc = util_1.clone(this.apiDoc);
        const refactoredPaths = this.refactorPathObject(this.apiDoc.paths, 'paths');
        newApiDoc.paths = refactoredPaths.result;
        const references = new Map([['paths', refactoredPaths.references]]);
        return { result: newApiDoc, references };
    }
    /**
     * Refactors 'paths' section belonging to an OpenApi document.
     */
    refactorPathObject(pathsObject, relativePath) {
        const paths = new Map();
        const newPathObject = {};
        const pathStrObj = {};
        for (const [path, obj] of Object.entries(pathsObject)) {
            const pathStr = path.replace(/(^\/|\/$)/g, '').replace(/\//g, '-'); // remove heading slash
            const pathStrRef = pathStr.split('-');
            const relativeSubPath = `${relativePath}/${pathStrRef[0]}/${pathStrRef[1]}${this.outputExtension}`;
            // the relative path of the output root starting from the `relativeSubPath`
            const relativeBackwardPath = util_1.backwardsPath(path_1.dirname(relativeSubPath));
            pathStrObj[`${pathStrRef[0]}/${pathStrRef[1]}`] = pathStrObj[`${pathStrRef[0]}/${pathStrRef[1]}`] || { swagger: "2.0", paths: {} };
            pathStrObj[`${pathStrRef[0]}/${pathStrRef[1]}`]['paths'][pathStr] = this.updateReferences(obj, relativeBackwardPath);
            paths.set(`${pathStrRef[0]}/${pathStrRef[1]}`, pathStrObj[`${pathStrRef[0]}/${pathStrRef[1]}`]);
            newPathObject[path] = {
                $ref: fromFileSystemPath(relativeSubPath) + '#/paths/' + pathStr,
            };
        }
        return { result: newPathObject, references: paths };
    }
    updateReferences(sourceObject, relativePath) {
        const isRef = (key, _value) => key === '$ref';
        return util_1.mapJsonLeaves(sourceObject, (_k, v) => {
            console.log(v);
            const vString = v.toString();
            const vSplit = vString.split('/');
            if (vSplit[1] === 'definitions') {
                return relativePath + '/definitions/index.yaml' + v;
            }
            else {
                return relativePath + '/' + this.outputFile + v;
            }
        }, isRef);
    }
}
exports.OpenApiRefactorer = OpenApiRefactorer;
//# sourceMappingURL=refactorer.js.map