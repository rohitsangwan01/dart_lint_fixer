import * as vscode from "vscode";
import {
  EditorAccess,
  getDocumentLocationByExactPath,
  getFilteredLintArray,
  getDirectoriesAsMapAndListOfErrors,
  showInfoMessage,
} from "../utils";

class VsCodeConstantNameEditor implements EditorAccess {
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
      // get the current word
      let position = new vscode.Position(idx, idxAt);
      let word = this.editor.document.getText(
        this.editor.document.getWordRangeAtPosition(position)
      );
      // Capitalize the first letter
      let newWord = word.charAt(0).toLowerCase() + word.slice(1);
      if (newWord === word) {
        // Convert snake_case to camelCase
        let parts = newWord.split("_");
        if (parts.length > 1) {
          newWord = parts
            .map((part, index) => {
              return index === 0
                ? part
                : part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join("");
        }
      }

      if (newWord === word) {
        // means first character is already lowercase
        return false;
      }

      // check if able to retrieve document from uri
      if (this.editor.document.uri) {
      }

      await vscode.commands
        .executeCommand<vscode.WorkspaceEdit>(
          "vscode.executeDocumentRenameProvider",
          this.editor.document.uri,
          new vscode.Position(idx, idxAt),
          newWord
        )
        .then((edit) => {
          if (!edit) {
            throw Error;
          }
          return vscode.workspace.applyEdit(edit);
        })
        .then(undefined, (err) => {
          console.log(`Error: ${err}`);
        });
    });
  }
}

export function fixNonConstantNames(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "dartLintFixer.fixNonConstantNames",
      async () => {
        const lintsArrayFiltered = await getFilteredLintArray(
          "non_constant_identifier_names"
        );
        console.log("Starting non_constant_identifier_names");

        const directories = await getDirectoriesAsMapAndListOfErrors(
          lintsArrayFiltered
        );

        showInfoMessage(`Got ${directories.size} directories`);

        for await (const [key, _] of directories) {
          const document = await getDocumentLocationByExactPath(key);

          const rawEditor = await vscode.window.showTextDocument(document);
          const editor = new VsCodeConstantNameEditor(rawEditor);

          let directoryKeys = directories.get(key);
          if (!directoryKeys) {
            continue;
          }
          for await (const val of directoryKeys) {
            await editor.edit(val.line, val.index);
          }
        }

        await vscode.workspace.saveAll();
        await vscode.commands.executeCommand(
          "workbench.action.closeAllEditors"
        );
        showInfoMessage("Finished non_constant_identifier_names");
      }
    )
  );
}
