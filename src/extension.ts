import * as vscode from "vscode";
import { fixNonConstantNames } from "./fixers/non_constant_name_fixer";
import { fixAutoCommaFixer, fixCustomCommaFixer } from "./fixers/comma_fixer";
import { fixRemoveUnusedImports } from "./fixers/remove_unused_imports";

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  fixAutoCommaFixer(context);
  fixCustomCommaFixer(context);
  fixRemoveUnusedImports(context);
  fixNonConstantNames(context);
}
