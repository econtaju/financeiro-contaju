import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface Violation {
  file: string;
  line: number;
  hookName: string;
  message: string;
}

const violations: Violation[] = [];

function checkFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  function inspectNode(node: ts.Node, hasReturnedBefore: boolean = false): boolean {
    let returnedInBlock = hasReturnedBefore;

    if (ts.isBlock(node)) {
      let returned = false;
      for (const statement of node.statements) {
        if (returned) {
          // Checar se o statement contém chamada a Hook
          checkSubtreeForHooks(statement, filePath, sourceFile);
        }
        if (ts.isReturnStatement(statement)) {
          returned = true;
        } else if (ts.isIfStatement(statement)) {
          // Se o 'if' tem return no thenStatement e não tem else, tudo que vier depois no mesmo bloco está após um return condicional!
          if (hasGuaranteedReturn(statement.thenStatement) && !statement.elseStatement) {
            returned = true;
          }
        }
      }
    }

    ts.forEachChild(node, child => {
      // Se for uma nova declaração de função/componente, reinicia o contexto
      if (ts.isFunctionDeclaration(child) || ts.isArrowFunction(child) || ts.isFunctionExpression(child)) {
        inspectFunction(child);
      } else {
        inspectNode(child, returnedInBlock);
      }
    });

    return returnedInBlock;
  }

  function hasGuaranteedReturn(node: ts.Node): boolean {
    if (ts.isReturnStatement(node)) return true;
    if (ts.isBlock(node)) {
      for (const stmt of node.statements) {
        if (ts.isReturnStatement(stmt)) return true;
      }
    }
    return false;
  }

  function checkSubtreeForHooks(node: ts.Node, file: string, sf: ts.SourceFile) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      let callName = '';
      if (ts.isIdentifier(expr)) {
        callName = expr.text;
      } else if (ts.isPropertyAccessExpression(expr)) {
        callName = expr.name.text;
      }
      if (isReactHook(callName)) {
        const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart());
        violations.push({
          file,
          line: line + 1,
          hookName: callName,
          message: `Hook '${callName}' chamado após um 'return' no mesmo bloco/função!`
        });
      }
    }
    ts.forEachChild(node, child => checkSubtreeForHooks(child, file, sf));
  }

  function isReactHook(name: string): boolean {
    return /^use[A-Z0-9]/.test(name);
  }

  function inspectFunction(fnNode: ts.Node) {
    let returned = false;
    const body = (fnNode as any).body;
    if (body && ts.isBlock(body)) {
      for (const stmt of body.statements) {
        if (returned) {
          checkSubtreeForHooks(stmt, filePath, sourceFile);
        }
        if (ts.isReturnStatement(stmt)) {
          returned = true;
        } else if (ts.isIfStatement(stmt)) {
          if (hasGuaranteedReturn(stmt.thenStatement) && !stmt.elseStatement) {
            returned = true;
          }
        }
      }
    }
    ts.forEachChild(fnNode, child => {
      if (ts.isFunctionDeclaration(child) || ts.isArrowFunction(child) || ts.isFunctionExpression(child)) {
        inspectFunction(child);
      }
    });
  }

  inspectNode(sourceFile);
}

function scanDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      checkFile(fullPath);
    }
  }
}

scanDir(path.resolve(process.cwd(), 'src'));

console.log('=== RELATÓRIO DE AUDITORIA DE HOOKS DO REACT ===');
if (violations.length === 0) {
  console.log('Nenhuma violação de hooks detectada!');
} else {
  console.log(`Encontradas ${violations.length} violação(ões):`);
  for (const v of violations) {
    console.log(`[VIOLAÇÃO] ${path.relative(process.cwd(), v.file)}:${v.line} -> ${v.message}`);
  }
}
