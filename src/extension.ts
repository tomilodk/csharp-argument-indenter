import * as vscode from 'vscode';
import { TextEditor } from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('csharp-argument-formatter.formatArguments', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        formatArgumentsInEditor(editor);
    });

    context.subscriptions.push(disposable);
}

function formatArgumentsInEditor(editor: TextEditor) {
    editor.edit(editBuilder => {
        for (const selection of editor.selections) {
            const lineText = editor.document.lineAt(selection.active.line).text;
            const formattedText = formatMethodArguments(lineText);

            if (formattedText !== lineText) {
                const lineRange = editor.document.lineAt(selection.active.line).range;
                editBuilder.replace(lineRange, formattedText);
            }
        }
    });
}

function formatMethodArguments(text: string): string {
    // Regular expression to match method calls with arguments
    const methodCallRegex = /(\w+\s*\()([^)]+)(\))/;

    return text.replace(methodCallRegex, (match, opening, args, closing) => {
        // Split arguments and trim whitespace
        const argsArray = args.split(',').map((arg: any) => arg.trim());

        if (argsArray.length <= 1) {
            return match;
        }

        // Calculate the indentation level
        const indentLevel = text.match(/^\s*/)?.[0] || '';
        const methodIndent = ' '.repeat(opening.length);

        // Format arguments with proper indentation
        const formattedArgs = argsArray
            .map((arg: any, index: any) => {
                if (index === 0) {
                    return `\n${indentLevel}${methodIndent}${arg}`;
                }
                return `${indentLevel}${methodIndent}${arg}`;
            })
            .join(',\n');

        return `${opening}${formattedArgs}\n${indentLevel}${closing}`;
    });
}

export function deactivate() { }