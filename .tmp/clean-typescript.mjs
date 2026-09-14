import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'
const root = process.cwd()
for (const app of ['be', 'fe']) {
  const configPath = path.join(root, app, 'tsconfig.json')
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath))
  const fileNames = parsed.fileNames.filter((f) => f.startsWith(path.join(root, app, 'src').replaceAll('\\', '/')) || f.startsWith(path.join(root, app, 'src')))
  const host = {
    getScriptFileNames: () => parsed.fileNames,
    getScriptVersion: () => '0',
    getScriptSnapshot: (file) => fs.existsSync(file) ? ts.ScriptSnapshot.fromString(fs.readFileSync(file, 'utf8')) : undefined,
    getCurrentDirectory: () => path.dirname(configPath),
    getCompilationSettings: () => parsed.options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists, readFile: ts.sys.readFile, readDirectory: ts.sys.readDirectory,
  }
  const service = ts.createLanguageService(host)
  for (const fileName of fileNames) {
    const changes = service.organizeImports({ type: 'file', fileName }, {}, { quotePreference: 'single' })
    for (const change of changes) {
      let source = fs.readFileSync(change.fileName, 'utf8')
      for (const edit of [...change.textChanges].sort((a,b) => b.span.start-a.span.start)) {
        source = source.slice(0,edit.span.start)+edit.newText+source.slice(edit.span.start+edit.span.length)
      }
      fs.writeFileSync(change.fileName,source)
    }
  }
  service.dispose()
  // A fresh service sees import edits; format indentation without changing semantics.
  const formatter = ts.createLanguageService(host)
  for (const fileName of fileNames) {
    let source = fs.readFileSync(fileName, 'utf8')
    const edits = formatter.getFormattingEditsForDocument(fileName, { indentSize: 2, tabSize: 2, convertTabsToSpaces: true, newLineCharacter: '\n', semicolons: ts.SemicolonPreference.Remove, insertSpaceAfterCommaDelimiter: true, insertSpaceBeforeAndAfterBinaryOperators: true, insertSpaceAfterKeywordsInControlFlowStatements: true, insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true })
    for (const edit of edits.sort((a,b) => b.span.start-a.span.start)) source=source.slice(0,edit.span.start)+edit.newText+source.slice(edit.span.start+edit.span.length)
    fs.writeFileSync(fileName,source)
  }
  formatter.dispose()
  console.log(`${app}: cleaned ${fileNames.length} source files`)
}
