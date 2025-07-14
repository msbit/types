#!/usr/bin/env node

import { dirname } from 'node:path';
import { argv, exit } from 'node:process';

import {
  TypeFormatFlags,
  createProgram,
  findConfigFile,
  forEachChild,
  getPositionOfLineAndCharacter,
  parseJsonConfigFileContent,
  readConfigFile,
  sys,
} from 'typescript';

import type { Node, Program } from 'typescript';

function _createProgram(file: string) {
  const configPath = findConfigFile('.', sys.fileExists, file);
  if (!configPath) {
    throw new Error('config file not found');
  }

  const { config, error } = readConfigFile(configPath, sys.readFile);
  if (error !== undefined) {
    throw new Error(`${error}`);
  }

  const { errors, fileNames: rootNames, options } = parseJsonConfigFileContent(config, sys, dirname(configPath));
  if (errors.length !== 0) {
    throw new Error(errors.join());
  }

  return createProgram({ rootNames, options });
}

function _getType(program: Program, sourceFileName: string, sourceRow: number, sourceColumn: number) {
  const source = program.getSourceFile(sourceFileName);
  if (!source) {
    throw new Error('source file not found');
  }

  const pos = getPositionOfLineAndCharacter(source, sourceRow - 1, sourceColumn - 1);

  function findNodeAt(pos: number, node: Node): Node | undefined {
    if (pos < node.getFullStart() || pos >= node.getEnd()) {
      return undefined;
    }

    return forEachChild(node, child => findNodeAt(pos, child)) || node;
  }

  const node = findNodeAt(pos, source);
  if (!node) {
    throw new Error('no node at location');
  }

  const checker = program.getTypeChecker();
  const type = checker.getTypeAtLocation(node);
  return checker.typeToString(type, undefined, TypeFormatFlags.NoTruncation);
}

if (argv.length < 5) {
  console.log('usage:', argv[0], argv[1], '<filename>', '<row>', '<column>');
  exit(0);
}

const [sourceFileName, sourceRow, sourceColumn] = argv.slice(2);

console.log(_getType(
  _createProgram('tsconfig.json'),
  sourceFileName,
  parseInt(sourceRow),
  parseInt(sourceColumn),
));
