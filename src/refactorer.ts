import { dirname, extname, basename } from 'path';
import { OpenAPI } from 'openapi-types';
import { PathsObject, RefactoredObject } from '../types/types';
import { readOpenApiFile, clone, mapJsonLeaves, backwardsPath } from './util';
const fromFileSystemPath = require('json-schema-ref-parser/lib/util/url')
  .fromFileSystemPath;

export class OpenApiRefactorer {
  apiDoc: OpenAPI.Document;
  outputFile: string;
  outputExtension: string;

  constructor(public sourcePath: string, public outputPath: string) {
    this.apiDoc = readOpenApiFile(sourcePath);
    this.outputFile = basename(this.outputPath);
    this.outputExtension = extname(this.outputPath);
  }

  /**
   * Parses an OpenAPI document and splits it into several chunks.
   * References are updated accordingly.
   */
  refactor(): RefactoredObject<OpenAPI.Document> {
    const newApiDoc = clone(this.apiDoc);

    const refactoredPaths = this.refactorPathObject(this.apiDoc.paths, 'paths');

    newApiDoc.paths = refactoredPaths.result;
    const references = new Map([['paths', refactoredPaths.references]]);

    return { result: newApiDoc, references };
  }

  /**
   * Refactors 'paths' section belonging to an OpenApi document.
   */
  private refactorPathObject(
    pathsObject: PathsObject,
    relativePath: string
  ): RefactoredObject<PathsObject> {
    const paths: Map<string, PathsObject> = new Map();
    const newPathObject: { [pathStr: string]: any } = {};
    const pathStrObj: { [pathStr: string]: any } = {};
    for (const [path, obj] of Object.entries(pathsObject)) {
      const pathStr = path.replace(/(^\/|\/$)/g, '').replace(/\//g, '-'); // remove heading slash
      const pathStrRef = pathStr.split('-');
      const relativeSubPath =
        `${relativePath}/${pathStrRef[0]}/${pathStrRef[1]}${this.outputExtension}`

      // the relative path of the output root starting from the `relativeSubPath`
      const relativeBackwardPath =
        backwardsPath(dirname(relativeSubPath));
      pathStrObj[`${pathStrRef[0]}/${pathStrRef[1]}`] = pathStrObj[`${pathStrRef[0]}/${pathStrRef[1]}`] || {swagger:"2.0",paths:{}}
      pathStrObj[`${pathStrRef[0]}/${pathStrRef[1]}`]['paths'][pathStr] = this.updateReferences(obj, relativeBackwardPath);
      paths.set(`${pathStrRef[0]}/${pathStrRef[1]}`, pathStrObj[`${pathStrRef[0]}/${pathStrRef[1]}`]);
      newPathObject[path] = {
        $ref: fromFileSystemPath(relativeSubPath) + '#/paths/' + pathStr,
      };
    }

    return { result: newPathObject, references: paths };
  }

  private updateReferences(sourceObject: any, relativePath: string): any {
    const isRef = (key: string, _value: string | number) => key === '$ref';
    return mapJsonLeaves(sourceObject, (_k, v) => {
      console.log(v)
      const vString = v.toString()
      const vSplit = vString.split('/')
      if(vSplit[1] === 'definitions'){
        return relativePath + '/definitions/index.yaml' + v
      }else{
        return relativePath + '/' + this.outputFile + v
      }
    }, isRef);
  }
}
