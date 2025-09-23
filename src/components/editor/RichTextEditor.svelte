<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Editor } from "@tiptap/core";
    import StarterKit from "@tiptap/starter-kit";
    import TextAlign from "@tiptap/extension-text-align";

    // Markdown conversion utilities
    function htmlToMarkdown(html: string): string {
        // Basic HTML to Markdown conversion
        let markdown = html;

        // Replace heading tags
        markdown = markdown.replace(/<h1>(.*?)<\/h1>/g, "# $1\n");
        markdown = markdown.replace(/<h2>(.*?)<\/h2>/g, "## $1\n");
        markdown = markdown.replace(/<h3>(.*?)<\/h3>/g, "### $1\n");

        // Replace paragraph tags
        markdown = markdown.replace(/<p>(.*?)<\/p>/g, "$1\n\n");

        // Replace bold tags
        markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, "**$1**");

        // Replace italic tags
        markdown = markdown.replace(/<em>(.*?)<\/em>/g, "*$1*");

        // Replace strike tags
        markdown = markdown.replace(/<s>(.*?)<\/s>/g, "~~$1~~");

        // Replace unordered list
        markdown = markdown.replace(
            /<ul>(.*?)<\/ul>/gs,
            function (match: string, content: string) {
                return content.replace(/<li>(.*?)<\/li>/g, "- $1\n");
            },
        );

        // Replace ordered list
        markdown = markdown.replace(
            /<ol>(.*?)<\/ol>/gs,
            function (match: string, content: string) {
                let index = 1;
                return content.replace(
                    /<li>(.*?)<\/li>/g,
                    function (match: string, item: string) {
                        return `${index++}. ${item}\n`;
                    },
                );
            },
        );

        // Clean up any remaining HTML tags
        markdown = markdown.replace(/<[^>]*>/g, "");

        // Fix extra newlines
        markdown = markdown.replace(/\n{3,}/g, "\n\n");

        return markdown.trim();
    }

    function markdownToHtml(markdown: string): string {
        // Basic Markdown to HTML conversion
        let html = markdown;

        // Convert headings
        html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");
        html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
        html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");

        // Convert bold
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Convert italic
        html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

        // Convert strikethrough
        html = html.replace(/~~(.*?)~~/g, "<s>$1</s>");

        // Convert unordered lists
        html = html.replace(/^- (.*?)$/gm, "<li>$1</li>");
        html = html.replace(/(<li>.*?<\/li>\n)+/gs, function (match: string) {
            return "<ul>" + match + "</ul>";
        });

        // Convert ordered lists
        html = html.replace(/^\d+\. (.*?)$/gm, "<li>$1</li>");
        html = html.replace(/(<li>.*?<\/li>\n)+/gs, function (match: string) {
            return "<ol>" + match + "</ol>";
        });

        // Convert paragraphs (lines not already in a block element)
        html = html.replace(/^([^<].*?)$/gm, "<p>$1</p>");

        // Clean up any duplicate paragraph tags
        html = html.replace(/<p><p>/g, "<p>");
        html = html.replace(/<\/p><\/p>/g, "</p>");

        return html;
    }

    // Props
    export let content = "";
    export let onChange = (html: string) => {};
    export let isMarkdown = true; // Default to markdown mode

    // Editor instance
    let element: HTMLElement;
    let editor: any; // Using any for Editor type to simplify
    let currentContent = content; // Track current content for reactivity

    // Watch for content changes from parent component
    $: if (content !== currentContent && editor) {
        currentContent = content;
        // Convert markdown to HTML if in markdown mode
        const newContent =
            isMarkdown && content
                ? markdownToHtml(content)
                : content || "<p>Enter your prompt here...</p>";

        // Only update if the content is actually different
        if (editor.getHTML() !== newContent) {
            editor.commands.setContent(newContent);
        }
    }

    // Initialize editor
    onMount(() => {
        // Convert markdown to HTML if in markdown mode and content is provided
        const initialContent =
            isMarkdown && content
                ? markdownToHtml(content)
                : content || "<p>Enter your prompt here...</p>";

        editor = new Editor({
            element: element,
            extensions: [
                StarterKit,
                TextAlign.configure({
                    types: ["heading", "paragraph"],
                }),
            ],
            content: initialContent,
            onUpdate: ({ editor }) => {
                // Convert to markdown if in markdown mode
                if (isMarkdown) {
                    const html = editor.getHTML();
                    const markdown = htmlToMarkdown(html);
                    currentContent = markdown;
                    onChange(markdown);
                } else {
                    currentContent = editor.getHTML();
                    onChange(editor.getHTML());
                }
            },
            editorProps: {
                attributes: {
                    class: "rich-text-content",
                },
            },
        });
    });

    // Cleanup on destroy
    onDestroy(() => {
        if (editor) {
            editor.destroy();
        }
    });

    // Toggle functions
    function toggleBold() {
        editor.chain().focus().toggleBold().run();
    }

    function toggleItalic() {
        editor.chain().focus().toggleItalic().run();
    }

    function toggleStrike() {
        editor.chain().focus().toggleStrike().run();
    }

    function toggleHeading(level: number) {
        editor.chain().focus().toggleHeading({ level }).run();
    }

    function toggleBulletList() {
        editor.chain().focus().toggleBulletList().run();
    }

    function toggleOrderedList() {
        editor.chain().focus().toggleOrderedList().run();
    }

    function setTextAlign(align: string) {
        editor.chain().focus().setTextAlign(align).run();
    }

    function undo() {
        editor.chain().focus().undo().run();
    }

    function redo() {
        editor.chain().focus().redo().run();
    }
</script>

<div class="rich-text-editor">
    {#if isMarkdown}
        <div class="markdown-badge">Markdown</div>
    {/if}
    <div class="editor-menubar">
        <div class="toolbar-group">
            <button
                class="toolbar-button"
                class:active={editor?.isActive("bold")}
                on:click={toggleBold}
                title="Bold"
                aria-label="Bold"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                </svg>
            </button>

            <button
                class="toolbar-button"
                class:active={editor?.isActive("italic")}
                on:click={toggleItalic}
                title="Italic"
                aria-label="Italic"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="19" y1="4" x2="10" y2="4"></line>
                    <line x1="14" y1="20" x2="5" y2="20"></line>
                    <line x1="15" y1="4" x2="9" y2="20"></line>
                </svg>
            </button>

            <button
                class="toolbar-button"
                class:active={editor?.isActive("strike")}
                on:click={toggleStrike}
                title="Strikethrough"
                aria-label="Strikethrough"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M17 9V6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3"></path>
                    <path d="M16 15v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2"></path>
                    <line x1="4" y1="12" x2="20" y2="12"></line>
                </svg>
            </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group">
            <button
                class="toolbar-button"
                class:active={editor?.isActive("heading", { level: 1 })}
                on:click={() => toggleHeading(1)}
                title="Heading 1"
                aria-label="Heading 1"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M6 12h12"></path>
                    <path d="M6 20V4"></path>
                    <path d="M18 20V4"></path>
                </svg>
            </button>

            <button
                class="toolbar-button"
                class:active={editor?.isActive("heading", { level: 2 })}
                on:click={() => toggleHeading(2)}
                title="Heading 2"
                aria-label="Heading 2"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M6 12h12"></path>
                    <path d="M6 20V4"></path>
                    <path d="M18 20V4"></path>
                </svg>
            </button>

            <button
                class="toolbar-button"
                class:active={editor?.isActive("bulletList")}
                on:click={toggleBulletList}
                title="Bullet List"
                aria-label="Bullet List"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
            </button>

            <button
                class="toolbar-button"
                class:active={editor?.isActive("orderedList")}
                on:click={toggleOrderedList}
                title="Ordered List"
                aria-label="Ordered List"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="10" y1="6" x2="21" y2="6"></line>
                    <line x1="10" y1="12" x2="21" y2="12"></line>
                    <line x1="10" y1="18" x2="21" y2="18"></line>
                    <path d="M4 6h1v4"></path>
                    <path d="M4 10h2"></path>
                    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
                </svg>
            </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group">
            <button
                class="toolbar-button"
                class:active={editor?.isActive({ textAlign: "left" })}
                on:click={() => setTextAlign("left")}
                title="Align Left"
                aria-label="Align Left"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="21" y1="6" x2="3" y2="6"></line>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                    <line x1="17" y1="18" x2="3" y2="18"></line>
                </svg>
            </button>

            <button
                class="toolbar-button"
                class:active={editor?.isActive({ textAlign: "center" })}
                on:click={() => setTextAlign("center")}
                title="Align Center"
                aria-label="Align Center"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="21" y1="6" x2="3" y2="6"></line>
                    <line x1="18" y1="12" x2="6" y2="12"></line>
                    <line x1="21" y1="18" x2="3" y2="18"></line>
                </svg>
            </button>

            <button
                class="toolbar-button"
                class:active={editor?.isActive({ textAlign: "right" })}
                on:click={() => setTextAlign("right")}
                title="Align Right"
                aria-label="Align Right"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="21" y1="6" x2="3" y2="6"></line>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                    <line x1="21" y1="18" x2="7" y2="18"></line>
                </svg>
            </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group">
            <button
                class="toolbar-button"
                on:click={undo}
                disabled={!editor?.can().undo()}
                title="Undo"
                aria-label="Undo"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M3 7v6h6"></path>
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
                </svg>
            </button>

            <button
                class="toolbar-button"
                on:click={redo}
                disabled={!editor?.can().redo()}
                title="Redo"
                aria-label="Redo"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M21 7v6h-6"></path>
                    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
                </svg>
            </button>
        </div>
    </div>

    <div bind:this={element} class="editor-content"></div>
</div>

<style>
    .rich-text-editor {
        border: 1px solid var(--color-232426);
        border-radius: 4px;
        background-color: var(--color-121214);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        position: relative;
    }

    .editor-menubar {
        display: flex;
        flex-wrap: wrap;
        padding: 8px;
        gap: 4px;
        background-color: var(--color-232426);
        border-bottom: 1px solid var(--color-232426);
    }

    .toolbar-group {
        display: flex;
        gap: 4px;
    }

    .toolbar-button {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: 1px solid transparent;
        border-radius: 4px;
        color: var(--color-fff);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .toolbar-button:hover {
        background-color: rgba(83, 5, 73, 0.2);
    }

    .toolbar-button.active {
        background-color: rgba(83, 5, 73, 0.4);
        border-color: var(--color-530549);
    }

    .toolbar-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .toolbar-divider {
        width: 1px;
        height: 24px;
        margin: 4px 8px;
        background-color: var(--color-232426);
    }

    .editor-content {
        flex: 1;
        padding: 16px;
        min-height: 300px;
        color: var(--color-fff);
    }

    :global(.rich-text-content) {
        min-height: 300px;
        outline: none;
        line-height: 1.5;
    }

    :global(.rich-text-content p) {
        margin: 0.5em 0;
    }

    :global(.rich-text-content h1) {
        font-size: 1.5em;
        margin: 0.67em 0;
    }

    :global(.rich-text-content h2) {
        font-size: 1.3em;
        margin: 0.75em 0;
    }

    :global(.rich-text-content ul, .rich-text-content ol) {
        padding-left: 1.5em;
    }

    :global(.rich-text-content li) {
        margin: 0.25em 0;
    }

    .markdown-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        background-color: var(--color-530549);
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        z-index: 10;
        opacity: 0.7;
    }
</style>
