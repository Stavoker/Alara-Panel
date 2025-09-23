<script lang="ts">
    import { onMount } from "svelte";
    import { fade, slide } from "svelte/transition";
    import RichTextEditor from "../../components/editor/RichTextEditor.svelte";
    import WhatsApp from "../../lib/images/filters/whatsApp.png";
    import Telegram from "../../lib/images/filters/telega.png";
    import Instagram from "../../lib/images/filters/instagram.png";
    import Messenger from "../../lib/images/filters/messenger.png";
    import Web from "../../lib/images/filters/web.png";
    import {
        getBots,
        getAgentPrompts,
        saveAgentPrompt,
    } from "../../lib/supabase";
    import type { Bot, AgentPrompt } from "../../lib/supabase";

    // Platform data
    const platforms = [
        { id: "All" },
        { id: "telegram", icon: Telegram },
        { id: "whatsapp", icon: WhatsApp },
        { id: "instagram", icon: Instagram },
        { id: "messenger", icon: Messenger },
        { id: "web", icon: Web },
    ];

    // Agent types
    const agentTypes = [
        { id: "call_human" as const, name: "Call Human" },
        { id: "company" as const, name: "Company" },
        { id: "sales" as const, name: "Sales" },
    ];

    // Types
    type AgentType = "call_human" | "company" | "sales";
    type NotificationType = "success" | "error";

    interface Prompt {
        text: string;
    }

    interface Agent {
        id: number;
        name: string;
        type: AgentType;
        platform: string;
        lastUpdate: string;
        updatedBy: string;
        prompts: {
            call_human: Prompt;
            company: Prompt;
            sales: Prompt;
        };
    }

    // State variables
    let selectedPlatform = "All"; // Default to showing all platforms
    let searchQuery = "";
    let agents: Agent[] = [];
    let filteredAgents: Agent[] = [];
    let selectedAgent: Agent | null = null;
    let activePromptType: AgentType = "call_human";
    let showNotification = false;
    let notificationMessage = "";
    let notificationType: NotificationType = "success";
    let editedPrompts: Record<AgentType, string> = {
        call_human: "",
        company: "",
        sales: "",
    };
    let isLoading = true;

    // Filter agents based on selected platform and search query
    $: {
        filteredAgents = agents.filter((agent): boolean => {
            const matchesPlatform =
                selectedPlatform === "All" ||
                agent.platform === selectedPlatform;
            const matchesSearch =
                searchQuery === "" ||
                agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(agent.id)
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());

            return matchesPlatform && matchesSearch;
        });
    }

    // Format date to readable string
    function formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    // Render markdown content
    function renderMarkdown(text: string): string {
        if (!text) return "";

        // Check if it's already HTML
        if (text.startsWith("<")) {
            return text;
        }

        // Simple markdown rendering
        let html = text;

        // Convert bold text
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // Convert italic text
        html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

        // Convert line breaks
        html = html.replace(/\n/g, "<br>");

        return `<div class="markdown-content">${html}</div>`;
    }

    // Select an agent for editing
    function selectAgent(agent: Agent): void {
        if (!agent) return;
        selectedAgent = agent;
        activePromptType = "call_human";
        // Initialize edited prompts with current values
        editedPrompts = {
            call_human: agent.prompts.call_human.text,
            company: agent.prompts.company.text,
            sales: agent.prompts.sales.text,
        };
    }

    // Save prompt changes
    async function savePrompts(): Promise<void> {
        // Validate that prompts are not empty
        if (
            !editedPrompts[activePromptType] ||
            editedPrompts[activePromptType].trim() === ""
        ) {
            showNotification = true;
            notificationMessage = "Prompt cannot be empty";
            notificationType = "error";

            setTimeout(() => {
                showNotification = false;
            }, 3000);

            return;
        }

        // Update the agent's prompts
        if (selectedAgent) {
            try {
                const agent = selectedAgent; // Create a non-null reference
                const currentTime = new Date().toISOString();
                const currentUser = "current_user@alara.ai"; // This would come from auth in a real app

                // Update local state
                agent.prompts[activePromptType].text =
                    editedPrompts[activePromptType];
                agent.lastUpdate = currentTime;

                // Find existing prompt in database or create new structure
                const allPrompts = await getAgentPrompts(agent.id);
                const existingPrompt = allPrompts.find(
                    (p) => p.bot_id === agent.id,
                );

                // Prepare the prompt data for Supabase
                const promptData: Partial<AgentPrompt> = {
                    id: existingPrompt?.id,
                    bot_id: agent.id,
                    prompts: {
                        call_human: {
                            text: agent.prompts.call_human.text,
                        },
                        company: {
                            text: agent.prompts.company.text,
                        },
                        sales: {
                            text: agent.prompts.sales.text,
                        },
                    },
                    updated_at: currentTime,
                    updated_by: currentUser,
                };

                // Save to Supabase
                await saveAgentPrompt(promptData);

                // Update the agents list
                const currentAgent = selectedAgent; // Create a non-null reference
                agents = agents.map((a) =>
                    a.id === currentAgent.id ? currentAgent : a,
                ) as Agent[];

                // Show success notification
                showNotification = true;
                notificationMessage = "Prompt saved successfully";
                notificationType = "success";

                setTimeout(() => {
                    showNotification = false;
                }, 3000);
            } catch (error) {
                console.error("Error saving prompt:", error);
                showNotification = true;
                notificationMessage = "Failed to save prompt";
                notificationType = "error";

                setTimeout(() => {
                    showNotification = false;
                }, 3000);
            }
        }
    }

    // Close the agent details panel
    function closeAgentDetails(): void {
        selectedAgent = null;
    }

    // Handle prompt type change
    function changePromptType(type: string): void {
        if (type === "call_human" || type === "company" || type === "sales") {
            activePromptType = type;
            // Make sure the editor content is updated with the selected prompt type
            if (selectedAgent) {
                // Force update with the content for the selected prompt type
                editedPrompts = {
                    ...editedPrompts,
                    [type]: selectedAgent.prompts[type].text,
                };
            }
        }
    }

    onMount(async () => {
        try {
            isLoading = true;
            await loadAgents();
        } catch (error) {
            console.error("Error loading data:", error);
            showNotification = true;
            notificationMessage = "Failed to load data";
            notificationType = "error";
        } finally {
            isLoading = false;
        }
    });

    async function loadAgents() {
        // Fetch bots from Supabase
        const bots = await getBots();

        // Fetch all agent prompts
        const allPrompts = await getAgentPrompts();

        // Map bots to our Agent interface
        agents = bots.map((bot) => {
            // Find prompts for this bot
            const botPrompt = allPrompts.find((p) => p.bot_id === bot.id);

            // Default empty prompts if none found
            const defaultPrompts = {
                call_human: {
                    text: "",
                },
                company: {
                    text: "",
                },
                sales: {
                    text: "",
                },
            };

            const prompts = botPrompt?.prompts || defaultPrompts;

            // Map to our Agent interface
            return {
                id: bot.id,
                name: bot.name || "Unnamed Bot",
                type: "call_human" as AgentType, // Default type
                platform: bot.platform || "unknown",
                lastUpdate: botPrompt?.updated_at || new Date().toISOString(),
                updatedBy: botPrompt?.updated_by || "Unknown",
                prompts: {
                    call_human: {
                        text: prompts.call_human.text,
                    },
                    company: {
                        text: prompts.company.text,
                    },
                    sales: {
                        text: prompts.sales.text,
                    },
                },
            };
        });

        // Update filtered agents
        filteredAgents = [...agents];
    }
</script>

<div class="prompts-container">
    {#if isLoading}
        <div class="loading-overlay">
            <div class="loading-spinner"></div>
            <p>Loading data...</p>
        </div>
    {/if}

    <!-- Platform Selector -->
    <div class="platform-selector">
        <h1>Agent Prompts Management</h1>
        <div class="selector-tabs">
            {#each platforms as platform}
                <button
                    class="platform-tab"
                    class:active={selectedPlatform === platform.id}
                    on:click={() => (selectedPlatform = platform.id)}
                >
                    {#if platform.icon}
                        <div class="block-img">
                            <img src={platform.icon} alt={platform.id} />
                        </div>
                        {#if platform.id !== "all"}
                            {platform.id}
                        {/if}
                    {:else}
                        <span>{platform.id}</span>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <!-- Agent List Section -->
    <div class="agent-section">
        <div class="agent-filters">
            <div class="search-bar">
                <svg
                    class="search-icon"
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
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    placeholder="Search agents..."
                    bind:value={searchQuery}
                />
            </div>
        </div>

        <div class="agent-table">
            <div class="table-header">
                <div class="col-id">Platform</div>
                <div class="col-name">Name</div>
                <div class="col-type">Last Update</div>
                <div class="col-date">Updated By</div>
            </div>

            <div class="table-body">
                {#if filteredAgents.length === 0}
                    <div class="no-agents">
                        {isLoading
                            ? "Loading agents..."
                            : "No agents found for the selected filters"}
                    </div>
                {:else}
                    {#each filteredAgents as agent}
                        <div
                            class="table-row"
                            class:selected={selectedAgent &&
                                selectedAgent.id === agent.id}
                            on:click={() => selectAgent(agent)}
                            on:keydown={(e) =>
                                e.key === "Enter" && selectAgent(agent)}
                            role="button"
                            tabindex="0"
                        >
                            <div class="col-id">{agent.platform}</div>
                            <div class="col-name">{agent.name}</div>
                            <div class="col-type">
                                <span class="agent-type {agent.type}"
                                    >{agent.lastUpdate}
                                </span>
                            </div>
                            <div class="col-date">
                                {agent.updatedBy}
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>

    <!-- Agent Details Panel -->
    {#if selectedAgent}
        <div
            class="agent-details"
            transition:slide={{ duration: 300, axis: "x" }}
        >
            <div class="details-header">
                <h2>{selectedAgent.name}</h2>
                <button
                    class="close-button"
                    on:click={closeAgentDetails}
                    aria-label="Close details panel"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div class="prompt-tabs">
                {#each agentTypes as type}
                    <button
                        class="prompt-tab"
                        class:active={activePromptType === type.id}
                        on:click={() => changePromptType(type.id)}
                    >
                        {type.name}
                        <div class="info-tooltip">
                            <svg
                                class="info-icon"
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            <span class="tooltip-text">
                                {#if type.id === "call_human"}
                                    Instructions for when to transfer to a human
                                    agent
                                {:else if type.id === "company"}
                                    General company information and bot
                                    personality
                                {:else if type.id === "sales"}
                                    Product details and sales strategies
                                {/if}
                            </span>
                        </div>
                    </button>
                {/each}
            </div>

            <div class="prompt-editor">
                <div class="prompt-section active">
                    <h3 class="prompt-section-title">
                        {activePromptType === "call_human"
                            ? "Call Human"
                            : activePromptType === "company"
                              ? "Company"
                              : "Sales"} Prompt
                    </h3>
                    <RichTextEditor
                        content={editedPrompts[activePromptType]}
                        onChange={(html) => {
                            editedPrompts[activePromptType] = html;
                        }}
                    />
                </div>

                <div class="editor-footer">
                    <button class="save-button" on:click={savePrompts}>
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Notification -->
    {#if showNotification}
        <div
            class="notification {notificationType}"
            transition:fade={{ duration: 200 }}
        >
            {notificationMessage}
        </div>
    {/if}
</div>

<style>
    .prompts-container {
        position: relative;
        height: 100vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        color: var(--color-fff);
    }

    /* Platform Selector Styles */
    .platform-selector {
        padding: 24px 32px;
        border-bottom: 1px solid var(--color-232426);
    }

    .platform-selector h1 {
        font-size: 24px;
        font-weight: 500;
        margin: 0 0 16px 0;
    }

    .selector-tabs {
        display: flex;
        gap: 8px;
    }

    .platform-tab {
        padding: 8px 16px;
        background-color: var(--color-121214);
        border: 1px solid var(--color-232426);
        border-radius: 4px;
        color: var(--color-fff);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .platform-tab.active {
        background-color: var(--color-530549);
        border-color: var(--color-530549);
    }

    .platform-tab:hover:not(.active) {
        background-color: var(--color-232426);
    }

    .block-img {
        width: 20px;
        height: 20px;
    }

    .block-img img {
        width: 100%;
        height: 100%;
    }

    /* Agent Section Styles */
    .agent-section {
        padding: 24px 32px;
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .agent-filters {
        margin-bottom: 16px;
    }

    .search-bar {
        position: relative;
        width: 96%;
    }

    .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-9b9ca3);
    }

    .search-bar input {
        width: 100%;
        padding: 10px 10px 10px 36px;
        background-color: var(--color-121214);
        border: 1px solid var(--color-232426);
        border-radius: 4px;
        color: var(--color-fff);
    }

    .search-bar input:focus {
        outline: none;
        border-color: var(--color-530549);
    }

    /* Agent Table Styles */
    .agent-table {
        flex: 1;
        background-color: var(--color-121214);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--color-232426);
    }

    .table-header {
        display: flex;
        padding: 16px;
        background-color: var(--color-232426);
        font-weight: 500;
    }

    .table-body {
        max-height: calc(100vh - 300px);
        overflow-y: auto;
    }

    .table-row {
        display: flex;
        padding: 16px;
        border-bottom: 1px solid var(--color-232426);
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .table-row:hover {
        background-color: rgba(83, 5, 73, 0.1);
    }

    .table-row.selected {
        background-color: rgba(83, 5, 73, 0.2);
    }

    .col-id {
        width: 15%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .col-name {
        width: 35%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .col-type {
        width: 20%;
    }

    .col-date {
        width: 30%;
        color: var(--color-9b9ca3);
        font-size: 14px;
    }

    .agent-type {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        text-transform: uppercase;
    }

    .agent-type.call_human {
        background-color: rgba(0, 123, 255, 0.2);
        color: #0d6efd;
    }

    .agent-type.company {
        background-color: rgba(108, 117, 125, 0.2);
        color: #adb5bd;
    }

    .agent-type.sales {
        background-color: rgba(40, 167, 69, 0.2);
        color: #28a745;
    }

    .no-agents {
        padding: 32px;
        text-align: center;
        color: var(--color-9b9ca3);
    }

    /* Agent Details Panel Styles */
    .agent-details {
        position: fixed;
        top: 0;
        right: 0;
        width: 50%;
        height: 100vh;
        background-color: var(--color-070709);
        border-left: 1px solid var(--color-232426);
        padding: 24px;
        display: flex;
        flex-direction: column;
        z-index: 10;
    }

    .details-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
    }

    .details-header h2 {
        font-size: 20px;
        font-weight: 500;
        margin: 0;
    }

    .close-button {
        background: none;
        border: none;
        color: var(--color-9b9ca3);
        cursor: pointer;
        padding: 4px;
    }

    .close-button:hover {
        color: var(--color-fff);
    }

    .prompt-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        border-bottom: 1px solid var(--color-232426);
        padding-bottom: 16px;
    }

    .prompt-tab {
        padding: 8px 16px;
        background-color: var(--color-121214);
        border: 1px solid var(--color-232426);
        border-radius: 4px;
        color: var(--color-fff);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .prompt-tab.active {
        background-color: var(--color-530549);
        border-color: var(--color-530549);
    }

    .prompt-tab:hover:not(.active) {
        background-color: var(--color-232426);
    }

    .info-tooltip {
        position: relative;
        display: inline-block;
    }

    .info-icon {
        color: var(--color-9b9ca3);
    }

    .tooltip-text {
        visibility: hidden;
        width: 200px;
        background-color: var(--color-232426);
        color: var(--color-fff);
        text-align: center;
        border-radius: 4px;
        padding: 8px;
        position: absolute;
        z-index: 1;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: opacity 0.3s;
        font-size: 12px;
        pointer-events: none;
    }

    .info-tooltip:hover .tooltip-text {
        visibility: visible;
        opacity: 1;
    }

    .prompt-editor {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
    }

    .prompt-section {
        margin-bottom: 24px;
        border: 1px solid var(--color-232426);
        border-radius: 4px;
        padding: 16px;
        background-color: var(--color-121214);
    }

    .prompt-section:last-of-type {
        margin-bottom: 0;
    }

    .prompt-section.active {
        border-color: var(--color-530549);
    }

    .prompt-section-title {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 16px;
        font-weight: 500;
    }

    .prompt-preview {
        padding: 12px;
        background-color: rgba(35, 36, 38, 0.5);
        border-radius: 4px;
        min-height: 100px;
        max-height: 200px;
        overflow-y: auto;
    }

    .markdown-content {
        white-space: pre-wrap;
        font-family:
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            sans-serif;
        line-height: 1.5;
    }

    .editor-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 16px;
    }

    .save-button {
        padding: 10px 20px;
        background-color: var(--color-530549);
        border: none;
        border-radius: 4px;
        color: var(--color-fff);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .save-button:hover {
        background-color: #6b0a5e;
    }

    /* Notification Styles */
    .notification {
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .notification.success {
        background-color: #28a745;
    }

    .notification.error {
        background-color: #dc3545;
    }

    /* Loading Styles */
    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top: 4px solid var(--color-530549);
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    /* Responsive Styles */
    @media (max-width: 1200px) {
        .agent-details {
            width: 60%;
        }
    }

    @media (max-width: 992px) {
        .agent-details {
            width: 70%;
        }

        .platform-selector {
            padding: 16px 24px;
        }

        .agent-section {
            padding: 16px 24px;
        }
    }

    @media (max-width: 768px) {
        .agent-details {
            width: 100%;
        }

        .platform-selector {
            padding: 16px;
        }

        .agent-section {
            padding: 16px;
        }

        .selector-tabs {
            overflow-x: auto;
            padding-bottom: 8px;
        }

        .platform-tab {
            white-space: nowrap;
        }

        .col-id {
            width: 20%;
        }

        .col-name {
            width: 40%;
        }

        .col-type {
            width: 20%;
        }

        .col-date {
            width: 20%;
        }
    }

    @media (max-width: 576px) {
        .table-header,
        .table-row {
            font-size: 14px;
        }

        .col-id {
            width: 25%;
        }

        .col-name {
            width: 45%;
        }

        .col-type {
            width: 30%;
        }

        .col-date {
            display: none;
        }

        .prompt-tabs {
            overflow-x: auto;
            padding-bottom: 8px;
        }
    }
</style>
