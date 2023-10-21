import * as vscode from "vscode";
import * as path from "path";
import * as cp from "child_process";

interface PackageInfo {
  projectRoot: string;
  projectName: string;
}

interface LineAndIndex {
  line: number;
  index: number;
}

interface EditorAccess {
  getFileName(): string;
  getLineAt(idx: number): string;
  getLineCount(): number;
  edit(idx: number, idxAt: number): Thenable<boolean>;
}

const execShell = (cmd: string) =>
  new Promise<string>((resolve, reject) => {
    cp.exec(cmd, (err, out) => {
      if (err) {
        return reject(err);
      }
      return resolve(out);
    });
  });

const getFileLocation = (info: string) => {
  const matches = info.matchAll(/^.*?[-]\s(.*?)?(?=:):(\d+):(\d+)/g);
  let path = "";
  let line = "";
  let index = "";

  for (const match of matches) {
    path = match[1];
    line = match[2];
    index = match[3];
  }

  return [path, line, index];
};

const showInfoMessage = (message: string) => {
  vscode.window.showInformationMessage(message);
};

const showErrorMessage = (message: string) => {
  vscode.window.showErrorMessage(message);
};

const getFilteredLintArray = async (filter: string) => {
  const folder = vscode.workspace.workspaceFolders![0].uri.path.substring(
    1,
    vscode.workspace.workspaceFolders![0].uri.path.length
  );

  const directory = path.dirname(folder);
  let lintsArray: string[] = [];
  const drive = directory.substring(0, 2);
  showInfoMessage("Running dart analyze...");
  const lints = await execShell(`cd ${directory} && dart analyze .`);
  lintsArray = lints.split("\n");
  var lintsArrayFiltered = lintsArray!.filter((element) =>
    element.includes(filter)
  );
  return lintsArrayFiltered;
};

const getDocumentLocationByExactPath = async (
  path: string
): Promise<vscode.TextDocument> => {
  const fileUri = await vscode.workspace.findFiles(path);
  return await vscode.workspace.openTextDocument(fileUri[0]);
};

const getDirectoriesAsMapAndListOfErrors = async (
  lintsArrayFiltered: string[]
): Promise<Map<string, LineAndIndex[]>> => {
  const directories = new Map<string, LineAndIndex[]>();
  for await (const lint of lintsArrayFiltered) {
    const fileLocationAndLine = getFileLocation(lint);
    const isWindows = process.platform === "win32";
    let separator = isWindows ? "\\" : "/";
    const path = fileLocationAndLine[0].substring(
      fileLocationAndLine[0].indexOf(separator) + 1
    );
    const lineNumber = fileLocationAndLine[1];
    const indexAt = fileLocationAndLine[2];

    if (!directories.has(path)) {
      directories.set(path, [
        { line: Number(lineNumber) - 1, index: Number(indexAt) - 1 },
      ]);
    } else {
      directories.get(path)!.push({
        line: Number(lineNumber) - 1,
        index: Number(indexAt) - 1,
      });
    }
  }
  return directories;
};

export {
  PackageInfo,
  EditorAccess,
  getFileLocation,
  LineAndIndex,
  showInfoMessage,
  showErrorMessage,
  getFilteredLintArray,
  getDocumentLocationByExactPath,
  getDirectoriesAsMapAndListOfErrors,
};
