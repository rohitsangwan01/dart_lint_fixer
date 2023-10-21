import * as vscode from "vscode";
import {
  EditorAccess,
  getDocumentLocationByExactPath,
  getFilteredLintArray,
  getDirectoriesAsMapAndListOfErrors,
  showInfoMessage,
} from "../utils";

class VsCodeEditorUnusedImport implements EditorAccess {
  editor: vscode.TextEditor;

  constructor(editor: vscode.TextEditor) {
    this.editor = editor;
  }

  getFileName(): string {
    return this.editor.document.fileName;
  }
  getLineAt(idx: number): string {
    return this.editor.document.lineAt(idx).text;
  }
  getLineCount(): number {
    return this.editor.document.lineCount;
  }
  edit(idx: number, idxAt: number): Thenable<boolean> {
    return this.editor.edit(async (builder) => {
      const line = this.getLineAt(idx);
      const start = new vscode.Position(idx, 0);
      const end = new vscode.Position(idx, line.length);
      const range = new vscode.Range(start, end);

      builder.replace(range, "");
    });
  }
}

export function fixRemoveUnusedImports(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "dartLintFixer.fixRemoveUnusedImports",
      async () => {
        const lintArrayFiltered = await getFilteredLintArray(
          "unnecessary_import"
        );

        const directories = await getDirectoriesAsMapAndListOfErrors(
          lintArrayFiltered
        );

        for await (const [key, val] of directories) {
          const document = await getDocumentLocationByExactPath(key);

          const rawEditor = await vscode.window.showTextDocument(document);
          const editor = new VsCodeEditorUnusedImport(rawEditor);

          for await (const val of directories.get(key)!) {
            await editor.edit(val.line, val.index);
          }

          await vscode.commands.executeCommand(
            "editor.action.formatDocument",
            rawEditor.document.uri
          );
          await vscode.commands.executeCommand(
            "dart-import.fix",
            rawEditor.document.uri
          );
        }
        await vscode.workspace.saveAll();
        await vscode.commands.executeCommand(
          "workbench.action.closeAllEditors"
        );
        showInfoMessage("Finished unnecessary_import");
      }
    )
  );
}
