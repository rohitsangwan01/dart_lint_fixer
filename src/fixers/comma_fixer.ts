import * as vscode from "vscode";

import {
  EditorAccess,
  getDocumentLocationByExactPath,
  getFileLocation,
  getFilteredLintArray,
  getDirectoriesAsMapAndListOfErrors,
  showInfoMessage,
} from "../utils";

class VsCodeEditorComma implements EditorAccess {
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

      let outputString = "";

      if (line.charAt(idxAt - 1) === "}") {
        outputString =
          line.substring(0, idxAt - 1) + "," + line.substring(idxAt - 1);
      } else {
        outputString = line.substring(0, idxAt) + "," + line.substring(idxAt);
      }

      builder.replace(range, outputString === "" ? line : outputString);
    });
  }
}

export function fixAutoCommaFixer(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "dartLintFixer.fixAutoCommaFixer",
      async () => {
        const lintsArrayFiltered = await getFilteredLintArray(
          "require_trailing_commas"
        );

        const directories = new Set<string>();

        for await (const lint of lintsArrayFiltered) {
          const fileLocationAndLine = getFileLocation(lint);
          const isWindows = process.platform === "win32";
          let separator = isWindows ? "\\" : "/";
          const path = fileLocationAndLine[0].substring(
            fileLocationAndLine[0].indexOf(separator) + 1
          );

          directories.add(path);
        }

        for await (const path of directories) {
          const document = await getDocumentLocationByExactPath(path);
          const activeEditor = await vscode.window.showTextDocument(document);

          await vscode.commands.executeCommand(
            "editor.action.fixAll",
            activeEditor.document.uri
          );
          await vscode.commands.executeCommand(
            "editor.action.formatDocument",
            activeEditor.document.uri
          );
        }

        await vscode.workspace.saveAll();
        await vscode.commands.executeCommand(
          "workbench.action.closeAllEditors"
        );
        showInfoMessage("Finished require_trailing_commas");
      }
    )
  );
}

export function fixCustomCommaFixer(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "dartLintFixer.fixCustomCommaFixer",
      async () => {
        const lintsArrayFiltered = await getFilteredLintArray(
          "require_trailing_commas"
        );

        const directories = await getDirectoriesAsMapAndListOfErrors(
          lintsArrayFiltered
        );

        for await (const [key, _] of directories) {
          const document = await getDocumentLocationByExactPath(key);

          const rawEditor = await vscode.window.showTextDocument(document);
          const editor = new VsCodeEditorComma(rawEditor);

          for await (const val of directories.get(key)!) {
            await editor.edit(val.line, val.index);
          }

          await vscode.commands.executeCommand(
            "editor.action.formatDocument",
            rawEditor.document.uri
          );
        }

        await vscode.workspace.saveAll();
        await vscode.commands.executeCommand(
          "workbench.action.closeAllEditors"
        );
        showInfoMessage("Finished require_trailing_commas");
      }
    )
  );
}
