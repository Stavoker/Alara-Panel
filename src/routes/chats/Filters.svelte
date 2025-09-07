<script lang="ts">
    import { onMount } from "svelte";
    import WhatsApp from "../../lib/images/filters/whatsApp.png";
    import Telegram from "../../lib/images/filters/telega.png";
    import Instagram from "../../lib/images/filters/instagram.png";
    import Messenger from "../../lib/images/filters/messenger.png";
    import Online from "../../lib/images/filters/onine.png";
    import Offline from "../../lib/images/filters/offline.png";
    import Web from "../../lib/images/filters/web.png";
    import Meta from "../../lib/images/filters/meta.png";
    import HumRequired from "../../lib/images/filters/flag.png";
    import UserSelect from "./UserSelect.svelte";
    import type { User } from "../../lib/types/type";

    type Platform =
        | "WhatsApp"
        | "Telegram"
        | "Instagram"
        | "Messenger"
        | "Web"
        | null;
    type Status = "Online" | "Offline" | "Human Required" | null;

    export let onUserSelect: (user: User) => void = () => {};
    export let clientId: number | undefined = undefined;

    let isMetaDropdownOpen: boolean = false;
    let metaDropdownRef: HTMLDivElement;

    let activePlatform: Platform = null;
    let activeStatus: Status = null;
    let selectedUserId: string | null = null;
    let userSelectRef: UserSelect;

    let unreadMessages: Record<string, number> = {};
    let lastMessageTimes: Record<string, Date> = {};

    let websocket: WebSocket | null = null;

    const metaPlatforms = [
        { name: "WhatsApp", icon: WhatsApp },
        { name: "Instagram", icon: Instagram },
        { name: "Messenger", icon: Messenger },
    ];

    const otherPlatforms = [
        { name: "Telegram", icon: Telegram },
        { name: "Web", icon: Web },
    ];

    const statuses = [
        { name: "Online", icon: Online },
        { name: "Offline", icon: Offline },
        { name: "Human Required", icon: HumRequired },
    ];

    function toggleMetaDropdown() {
        isMetaDropdownOpen = !isMetaDropdownOpen;
    }

    function closeMetaDropdown() {
        isMetaDropdownOpen = false;
    }

    onMount(() => {
        // Ініціалізуємо WebSocket з'єднання для отримання нових повідомлень
        initializeWebSocket();
        function handleClickOutside(event: MouseEvent) {
            if (
                metaDropdownRef &&
                !metaDropdownRef.contains(event.target as Node)
            ) {
                closeMetaDropdown();
            }
        }

        document.addEventListener("click", handleClickOutside);

        loadUnreadMessagesFromStorage();

        return () => {
            if (websocket) {
                websocket.close();
            }
            document.removeEventListener("click", handleClickOutside);
        };
    });

    function initializeWebSocket() {
        try {
            websocket = new WebSocket("ws://your-websocket-url");

            websocket.onopen = () => {
                console.log("WebSocket connected");
            };

            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error("Error parsing WebSocket message:", error);
                }
            };

            websocket.onclose = () => {
                console.log("WebSocket disconnected");

                setTimeout(() => {
                    initializeWebSocket();
                }, 5000);
            };

            websocket.onerror = (error) => {
                console.error("WebSocket error:", error);
            };
        } catch (error) {
            console.error("Failed to initialize WebSocket:", error);
        }
    }

    function handleWebSocketMessage(data: any) {
        switch (data.type) {
            case "new_message":
                handleNewMessage(data.userId, data.messageTime);
                break;
            case "messages_read":
                handleMessagesRead(data.userId);
                break;
            case "bulk_messages":
                handleBulkMessages(data.messages);
                break;
            default:
                console.log("Unknown message type:", data.type);
        }
    }

    function handleNewMessage(userId: string, messageTime?: string) {
        unreadMessages[userId] = (unreadMessages[userId] || 0) + 1;
        lastMessageTimes[userId] = messageTime
            ? new Date(messageTime)
            : new Date();

        if (userSelectRef) {
            userSelectRef.updateUnreadMessages(
                userId,
                unreadMessages[userId],
                lastMessageTimes[userId],
            );
        }

        saveUnreadMessagesToStorage();

        console.log(
            `New message for user ${userId}. Total unread: ${unreadMessages[userId]}`,
        );
    }

    function handleMessagesRead(userId: string) {
        unreadMessages[userId] = 0;

        if (userSelectRef) {
            userSelectRef.updateUnreadMessages(userId, 0);
        }

        saveUnreadMessagesToStorage();
        console.log(`Messages marked as read for user ${userId}`);
    }

    function handleBulkMessages(
        messages: Array<{
            userId: string;
            count: number;
            lastMessageTime?: string;
        }>,
    ) {
        messages.forEach(({ userId, count, lastMessageTime }) => {
            unreadMessages[userId] = count;
            if (lastMessageTime) {
                lastMessageTimes[userId] = new Date(lastMessageTime);
            }

            if (userSelectRef) {
                userSelectRef.updateUnreadMessages(
                    userId,
                    count,
                    lastMessageTimes[userId],
                );
            }
        });

        saveUnreadMessagesToStorage();
    }

    function saveUnreadMessagesToStorage() {
        try {
            localStorage.setItem(
                "unreadMessages",
                JSON.stringify(unreadMessages),
            );
            localStorage.setItem(
                "lastMessageTimes",
                JSON.stringify(
                    Object.fromEntries(
                        Object.entries(lastMessageTimes).map(([key, value]) => [
                            key,
                            value.toISOString(),
                        ]),
                    ),
                ),
            );
        } catch (error) {
            console.error(
                "Failed to save unread messages to localStorage:",
                error,
            );
        }
    }

    function loadUnreadMessagesFromStorage() {
        try {
            const savedUnread = localStorage.getItem("unreadMessages");
            const savedTimes = localStorage.getItem("lastMessageTimes");

            if (savedUnread) {
                unreadMessages = JSON.parse(savedUnread);
            }

            if (savedTimes) {
                const parsedTimes = JSON.parse(savedTimes);
                lastMessageTimes = Object.fromEntries(
                    Object.entries(parsedTimes).map(([key, value]) => [
                        key,
                        new Date(value as string),
                    ]),
                );
            }
        } catch (error) {
            console.error(
                "Failed to load unread messages from localStorage:",
                error,
            );
        }
    }

    function selectFilter(type: "platform" | "status", value: string) {
        if (type === "platform") {
            activePlatform =
                activePlatform === value ? null : (value as Platform);
        } else {
            activeStatus = activeStatus === value ? null : (value as Status);
        }
        filterContent();
    }

    function filterContent() {
        console.log("Filtering by:", {
            platform: activePlatform,
            status: activeStatus,
        });
    }

    function clearAllFilters() {
        activePlatform = null;
        activeStatus = null;
        filterContent();
    }

    function handleUserSelect(user: User): void {
        console.log("Вибрано користувача:", user);

        if (unreadMessages[user.id] > 0) {
            handleMessagesRead(user.id);

            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(
                    JSON.stringify({
                        type: "mark_as_read",
                        userId: user.id,
                        timestamp: new Date().toISOString(),
                    }),
                );
            }
        }

        onUserSelect(user);
    }

    $: if (clientId !== undefined && userSelectRef) {
        userSelectRef.refreshUsers();
    }

    $: activeFiltersCount = (activePlatform ? 1 : 0) + (activeStatus ? 1 : 0);

    $: totalUnreadCount = Object.values(unreadMessages).reduce(
        (sum, count) => sum + count,
        0,
    );

    export function addNewMessage(userId: string, messageTime?: Date) {
        handleNewMessage(userId, messageTime?.toISOString());
    }

    export function markUserMessagesAsRead(userId: string) {
        handleMessagesRead(userId);
    }

    export function updateUnreadCount(userId: string, count: number) {
        unreadMessages[userId] = count;
        if (userSelectRef) {
            userSelectRef.updateUnreadMessages(userId, count);
        }
        saveUnreadMessagesToStorage();
    }

    function simulateNewMessage() {
        const testUserId = "test-user-1";
        handleNewMessage(testUserId);
    }

    let searchQuery: string = "";
    let isSearchExpanded: boolean = false;
    let searchInputRef: HTMLInputElement;

    function toggleSearch() {
        isSearchExpanded = !isSearchExpanded;
        if (isSearchExpanded) {
            setTimeout(() => {
                searchInputRef?.focus();
            }, 300);
        } else {
            searchQuery = "";
        }
    }

    function handleSearchInput(event: Event) {
        const target = event.target as HTMLInputElement;
        searchQuery = target.value;
    }

    function clearSearch() {
        searchQuery = "";
        isSearchExpanded = false;
    }
</script>

<div class="filters-container">
    <div class="filters">
        <div class="filter-hdr">
            <h1>Filters</h1>
            {#if totalUnreadCount > 0}{/if}
            {#if activeFiltersCount > 0}
                <button
                    class="clear-filters"
                    on:click={clearAllFilters}
                    title="Clear all filters"
                >
                    Clear ({activeFiltersCount})
                </button>
            {/if}
        </div>
        <div class="filters-block">
            <!-- Platforms -->
            <div class="block">
                <div class="block-title">
                    <span>Platforms</span>
                </div>

                <!-- Meta Platforms Dropdown -->
                <div
                    class="meta-dropdown-container"
                    bind:this={metaDropdownRef}
                >
                    <button
                        class="block-content dropdown-trigger"
                        class:active={metaPlatforms.some(
                            (p) => activePlatform === p.name,
                        )}
                        on:click={toggleMetaDropdown}
                        type="button"
                        aria-expanded={isMetaDropdownOpen}
                    >
                        <div class="block-img">
                            <img src={Meta} alt="Meta" />
                        </div>
                        <p class="block-text">Meta</p>
                        <svg
                            class="dropdown-arrow"
                            class:rotated={isMetaDropdownOpen}
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="m6 9 6 6 6-6"
                                stroke="currentColor"
                                stroke-width="2"
                            />
                        </svg>
                    </button>

                    {#if isMetaDropdownOpen}
                        <div class="dropdown-menu">
                            {#each metaPlatforms as { name, icon }}
                                <button
                                    class="dropdown-item"
                                    class:active={activePlatform === name}
                                    on:click={() => {
                                        selectFilter("platform", name);
                                        closeMetaDropdown();
                                    }}
                                    type="button"
                                >
                                    <div class="block-img">
                                        <img src={icon} alt={name} />
                                    </div>
                                    <p class="block-text">{name}</p>
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- Other Platforms -->
                {#each otherPlatforms as { name, icon }}
                    <button
                        class="block-content"
                        class:active={activePlatform === name}
                        on:click={() => selectFilter("platform", name)}
                        type="button"
                        aria-pressed={activePlatform === name}
                    >
                        <div class="block-img">
                            <img src={icon} alt={name} />
                        </div>
                        <p class="block-text">{name}</p>
                    </button>
                {/each}
            </div>
            <!-- Statuses -->
            <div class="block">
                <div class="block-title">
                    <span>Status</span>
                </div>
                {#each statuses as { name, icon }}
                    <button
                        class="block-content"
                        class:active={activeStatus === name}
                        on:click={() => selectFilter("status", name)}
                        type="button"
                        aria-pressed={activeStatus === name}
                    >
                        <div class="block-img">
                            <img src={icon} alt={name} />
                        </div>
                        <p class="block-text">{name}</p>
                    </button>
                {/each}
            </div>
        </div>
    </div>
    <div class="select-user">
        <div class="users-header">
            <h2>Users</h2>
            <div class="search-container">
                <div class="search-wrapper" class:expanded={isSearchExpanded}>
                    {#if isSearchExpanded}
                        <input
                            bind:this={searchInputRef}
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            on:input={handleSearchInput}
                            on:blur={() => {
                                if (!searchQuery) {
                                    setTimeout(() => {
                                        isSearchExpanded = false;
                                    }, 150);
                                }
                            }}
                            class="search-input"
                        />
                    {/if}
                    <button
                        class="search-button"
                        class:active={isSearchExpanded}
                        on:click={toggleSearch}
                        aria-label={isSearchExpanded
                            ? "Close search"
                            : "Search users"}
                        title={isSearchExpanded
                            ? "Close search"
                            : "Search users"}
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <circle
                                cx="11"
                                cy="11"
                                r="8"
                                stroke="currentColor"
                                stroke-width="2"
                            />
                            <path
                                d="m21 21-4.35-4.35"
                                stroke="currentColor"
                                stroke-width="2"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <div class="user-list-block">
            <UserSelect
                bind:this={userSelectRef}
                {activePlatform}
                {activeStatus}
                {searchQuery}
                bind:selectedUserId
                bind:unreadMessages
                bind:lastMessageTimes
                onUserSelect={handleUserSelect}
                {clientId}
            />
        </div>
    </div>

    <!-- Кнопка для тестування (видаліть у продакшені) -->
    <!-- <button class="test-btn" on:click={simulateNewMessage}>
        Test New Message
    </button> -->
</div>

<style>
    .filters {
        width: 100%;
        margin: 0 auto;
        font-family: "Inter", sans-serif;
        background-color: var(--color-070709);
    }

    .meta-dropdown-container {
        position: relative;
    }

    .dropdown-trigger {
        position: relative;
        justify-content: space-between;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        background: none;
        border: none;
        padding: 6px;
        padding-left: 0;
        text-align: left;
        border-radius: 6px;
        transition: all 0.2s ease;
        width: 100%;
    }

    .dropdown-trigger:hover {
        background-color: var(--color-232426);
    }

    .dropdown-trigger.active .block-text {
        color: var(--color-fff);
        font-weight: 500;
    }

    .dropdown-arrow {
        transition: transform 0.2s ease;
        margin-left: auto;
        color: var(--color-9b9ca3);
        flex-shrink: 0;
    }

    .dropdown-arrow.rotated {
        transform: rotate(180deg);
    }

    .dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--color-121213);
        border: 1px solid var(--color-232426);
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10;
        margin-top: 4px;
        overflow: hidden;
    }

    .dropdown-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 8px 12px;
        border: none;
        background: none;
        cursor: pointer;
        transition: background-color 0.2s ease;
        text-align: left;
    }

    .dropdown-item:hover {
        background-color: var(--color-232426);
    }

    .dropdown-item.active {
        background-color: var(--color-232426);
    }

    .dropdown-item.active .block-text {
        color: var(--color-fff);
        font-weight: 500;
    }

    .dropdown-item .block-img {
        background-color: var(--color-070709);
        border-radius: 6px;
        width: 26px;
        height: 26px;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: background-color 0.2s ease;
    }

    .dropdown-item .block-img img {
        width: 16px;
        height: 16px;
    }

    .dropdown-item .block-text {
        color: var(--color-9b9ca3);
        font-size: 12px;
        font-weight: 400;
        transition: color 0.2s ease;
        margin: 0;
    }

    .filters-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        max-width: 400px;
        padding: 12px;
        padding-top: 2%;
        border-right: 1px solid var(--color-232426);
        font-family: "Inter", sans-serif;
        background-color: var(--color-070709);
    }

    .filter-hdr {
        background-color: var(--color-121213);
        border: 1px solid var(--color-232426);
        text-align: center;
        padding: 8px;
        border-radius: 12px;
        color: var(--color-fff);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .filter-hdr h1 {
        letter-spacing: 0.5px;
        font-size: 14px;
        font-weight: 400;
        margin: 0;
        color: var(--color-fff);
    }

    .unread-indicator {
        background: #4de944;
        color: #000;
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 10px;
        animation: pulse 2s infinite;
    }

    .clear-filters {
        background: #e00909;
        color: #fff;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .clear-filters:hover {
        background: #af0000;
    }

    .filters-block {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
        gap: 16px;
    }

    .block {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
    }

    .block-title {
        margin-bottom: 5px;
    }

    .block-title span {
        color: var(--color-9b9ca3);
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .block-content {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        background: none;
        border: none;
        padding: 6px;
        padding-left: 0;
        text-align: left;
        border-radius: 6px;
        transition: all 0.2s ease;
        position: relative;
    }

    .block-content:hover {
        background-color: var(--color-232426);
    }

    .block-content.active .block-text {
        color: var(--color-fff);
        font-weight: 500;
    }

    .block-img {
        background-color: var(--color-121213);
        border-radius: 6px;
        width: 26px;
        height: 26px;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: background-color 0.2s ease;
    }

    .block-img img {
        width: 16px;
        height: 16px;
    }

    .block-text {
        color: var(--color-9b9ca3);
        font-size: 12px;
        font-weight: 400;
        transition: color 0.2s ease;
        margin: 0;
    }

    .select-user {
        margin-top: 40px;
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding-bottom: 10%;
    }

    .user-list-block {
        max-width: 100%;
        overflow-y: auto;
    }

    /* Стилізація скролбару */
    .user-list-block::-webkit-scrollbar {
        width: 8px;
    }

    .user-list-block::-webkit-scrollbar-track {
        background: none;
        border-radius: 4px;
    }

    .user-list-block::-webkit-scrollbar-thumb {
        background-color: #4b4b4b62;
        border-radius: 4px;
        border: 2px solid transparent;
        background-clip: content-box;
    }

    .user-list-block::-webkit-scrollbar-thumb:hover {
        background-color: #4b4b4b62;
    }

    .users-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding: 0 4px;
    }

    .users-header h2 {
        color: var(--color-fff);
        font-size: 14px;
        font-weight: 600;
        margin: 0;
        letter-spacing: 0.5px;
    }

    .search-container {
        display: flex;
        align-items: center;
    }

    .search-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: var(--color-121213);
        border: 1px solid var(--color-232426);
        border-radius: 20px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        width: 26px;
        height: 26px;
    }

    .search-wrapper.expanded {
        width: 100%;
        background-color: var(--color-131416);
        border-color: var(--color-530549);
    }

    .search-input {
        background: none;
        border: none;
        outline: none;
        color: var(--color-fff);
        font-size: 12px;
        padding: 0 12px;
        flex: 1;
        opacity: 0;
        animation: fadeIn 0.3s ease-in-out 0.1s forwards;
    }

    .search-input::placeholder {
        color: var(--color-9b9ca3);
    }

    .search-button {
        background: none;
        border: none;
        color: var(--color-9b9ca3);
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        flex-shrink: 0;
    }

    .search-button:hover {
        color: var(--color-fff);
        background-color: var(--color-232426);
    }

    .search-button.active {
        color: #fff;
        background-color: var(--color-530549);
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    /* Адаптивність для пошуку */
    @media (max-width: 768px) {
        .search-wrapper.expanded {
            width: 150px;
        }

        .users-header {
            gap: 8px;
        }
    }

    /* Анімації */
    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.05);
            opacity: 0.8;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }

    /* Адаптивність */
    @media (max-width: 768px) {
        .filters {
            max-width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--color-232426);
        }

        .filters-block {
            flex-direction: column;
            gap: 20px;
        }

        .block {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
        }

        .block-title {
            width: 100%;
            margin-bottom: 8px;
        }

        .filter-hdr {
            flex-wrap: wrap;
            gap: 4px;
        }
    }
</style>
