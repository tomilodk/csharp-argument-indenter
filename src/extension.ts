import * as vscode from 'vscode';
import { TextEditor, TextEditorEdit, Selection, Position } from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating csharp-argument-indenter extension');

    // Register the argument formatting command
    let formatArgs = vscode.commands.registerCommand('csharp-argument-indenter.indentArguments', () => {
        console.log('indentArguments command triggered');
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        formatArgumentsInEditor(editor);
    });

    // Register the chain formatting command
    let formatChain = vscode.commands.registerCommand('csharp-argument-indenter.formatChain', () => {
        console.log('formatChain command triggered');
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        formatMethodChainInEditor(editor);
    });

    context.subscriptions.push(formatArgs, formatChain);
    console.log('Commands registered');
}

function formatMethodChainInEditor(editor: TextEditor) {
    editor.edit(editBuilder => {
        for (const selection of editor.selections) {
            const lineText = editor.document.lineAt(selection.active.line).text;
            const formattedText = handleMethodChain(lineText);
            
            if (formattedText !== lineText) {
                const lineRange = editor.document.lineAt(selection.active.line).range;
                editBuilder.replace(lineRange, formattedText);
            }
        }
    });
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

function handleMethodChain(text: string): string {
    // Improved regex to handle assignments and complex expressions
    const assignmentMatch = text.match(/^(\s*)(.+?=\s*)?(.+?)(\.[\w<>]+\([^()]*(?:\([^()]*\)[^()]*)*\))+$/);
    if (!assignmentMatch) return text;

    const [fullMatch, indent = '', assignment = '', firstPart] = assignmentMatch;

    // Find start of the chain (where we have the cursor)
    const chain = text.substring(indent.length);
    
    // Split the chain into parts while preserving nested parentheses
    const parts: string[] = [];
    let currentPart = '';
    let parenCount = 0;
    let inChain = false;

    for (let i = 0; i < chain.length; i++) {
        const char = chain[i];
        
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        
        if (char === '.' && parenCount === 0) {
            if (currentPart.trim()) {
                parts.push(currentPart);
                currentPart = '';
            }
            inChain = true;
            continue;
        }
        
        currentPart += char;
    }
    
    if (currentPart.trim()) {
        parts.push(currentPart);
    }

    if (parts.length <= 1) return text;

    // Get the base indentation and calculate alignment
    const firstPartWithAssignment = parts[0].trim();
    const dotAlignPosition = indent.length + firstPartWithAssignment.length;
    const dotIndent = ' '.repeat(dotAlignPosition);

    // Format the chain
    return parts
        .map((part, index) => {
            if (index === 0) return indent + part.trim();
            return `\n${dotIndent}.${part.trim()}`;
        })
        .join('');
}

function formatMethodArguments(text: string): string {
    // First try to format as a method chain
    const chainFormatted = handleMethodChain(text);
    if (chainFormatted !== text) return chainFormatted;

    // If not a chain, proceed with regular argument formatting
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
    const argumentIndent = baseIndent + ' '.repeat(4); // One level of indentation (4 spaces)

    // Format arguments
    const formattedArgs = splitArgs
        .map((arg, index) => index === 0 
            ? `\n${argumentIndent}${arg}`
            : `${argumentIndent}${arg}`
        )
        .join(',\n');

    return `${beforeMethod}${methodName}${formattedArgs}\n${baseIndent})${afterMethod}`;
}

export function deactivate() {}