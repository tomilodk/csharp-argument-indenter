import * as vscode from 'vscode';
import { TextEditor, TextEditorEdit, Selection, Position } from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('csharp-argument-indenter.indentArguments', () => {
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
    // Function to count opening parentheses before a position
    const countOpenParens = (str: string, pos: number): number => {
        let count = 0;
        for (let i = 0; i < pos; i++) {
            if (str[i] === '(') count++;
            if (str[i] === ')') count--;
        }
        return count;
    };

    // Function to find matching closing parenthesis
    const findMatchingParen = (str: string, startPos: number): number => {
        let count = 1;
        for (let i = startPos + 1; i < str.length; i++) {
            if (str[i] === '(') count++;
            if (str[i] === ')') count--;
            if (count === 0) return i;
        }
        return -1;
    };

    // Find the first method call
    const methodMatch = text.match(/\w+\s*\(/);
    if (!methodMatch) return text;

    const startPos = methodMatch.index! + methodMatch[0].length;
    const endPos = findMatchingParen(text, startPos - 1);
    if (endPos === -1) return text;

    // Extract the full method call
    const beforeMethod = text.substring(0, methodMatch.index!);
    const methodName = methodMatch[0];
    const args = text.substring(startPos, endPos);
    const afterMethod = text.substring(endPos + 1);

    // Split arguments while respecting nested parentheses
    const splitArgs: string[] = [];
    let currentArg = '';
    let parenCount = 0;

    for (let i = 0; i < args.length; i++) {
        const char = args[i];
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === ',' && parenCount === 0) {
            splitArgs.push(currentArg.trim());
            currentArg = '';
            continue;
        }
        currentArg += char;
    }
    if (currentArg) splitArgs.push(currentArg.trim());

    // Calculate proper indentation
    const baseIndent = beforeMethod.match(/^\s*/)?.[0] || '';
    const argumentIndent = ' '.repeat(baseIndent.length + 12); // Standard 4-space indent × 3

    // Format arguments
    const formattedArgs = splitArgs
        .map((arg, index) => index === 0 
            ? `\n${argumentIndent}${arg}`
            : `${argumentIndent}${arg}`
        )
        .join(',\n');

    return `${beforeMethod}${methodName}${formattedArgs}\n${baseIndent}${')'}${afterMethod}`;
}

export function deactivate() {}