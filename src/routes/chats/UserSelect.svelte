<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { themeStore } from "../../lib/store/theme";
    import {
        getFilteredUsers,
        getCurrentUserInfo,
    } from "../client-login/userService";
    import { sortUsers, getUserStatus } from "../../lib/utils/userSorting";
    import type { User } from "../../lib/types/type";

    interface CurrentUserInfo {
        id: number;
        name: string;
        email?: string;
        role: "alara_admin" | "user_admin" | "client_admin";
        table: "panel_admins" | "clients" | "client_users";
        client_id: number | null;
        canViewAllUsers: boolean;
    }

    interface UserWithMessages extends User {
        unreadCount?: number;
        alara_status?: boolean;
        human_required?: boolean;
    }

    export let selectedUserId: string | null = null;
    export let onUserSelect: (user: User) => void = () => {};
    export let activePlatform:
        | "WhatsApp"
        | "Telegram"
        | "Instagram"
        | "Messenger"
        | "Web"
        | null = null;
    export let activeStatus: "Online" | "Offline" | "Human Required" | null =
        null;
    export let clientId: number | undefined = undefined;
    export let unreadMessages: Record<string, number> = {};
    // Keep this as a reference but don't use it for sorting
    export const lastMessageTimes: Record<string, Date> = {};

    let users: UserWithMessages[] = [];
    let isLoading = true;
    let error: string | null = null;
    let currentUserInfo: CurrentUserInfo | null = getCurrentUserInfo();
    let refreshInterval: NodeJS.Timeout | null = null;

    // Оновлені статуси та їх кольори
    const statusConfig: Record<string, { color: string; label: string }> = {
        online: { color: "#4DE944", label: "Online" },
        offline: { color: "#E94447", label: "Offline" },
        "human-required": { color: "#E9D644", label: "Human Required" },
        "no-info": { color: "#6b7280", label: "No Info" },
    };

    const platformMapping: Record<string, string[]> = {
        WhatsApp: ["WhatsApp", "whatsapp", "WHATSAPP"],
        Telegram: ["Telegram", "telegram", "TELEGRAM"],
        Instagram: ["Instagram", "instagram", "INSTAGRAM"],
        Messenger: ["Messenger", "messenger", "MESSENGER"],
        Web: ["Web", "web", "WEB"],
    };

    // Оновлений маппінг статусів фільтра до статусів користувачів
    const statusMapping: Record<string, string> = {
        Online: "online",
        Offline: "offline",
        "Human Required": "human-required",
    };

    // Використовуємо централізовану функцію для визначення статусу користувача

    // Генерація рандомного градієнта для аватара
    function generateGradient(): string {
        const colors = [
            "#fbbf24",
            "#4DE944",
            "#8b5cf6",
            "#ec4899",
            "#3b82f6",
            "#2097F0",
            "#D0523B",
            "#9B84BA",
            "#C48C55",
            "#B13EB0",
            "#81589E",
            "#DAEBF9",
            "#D042C2",
            "#B85124",
            "#1F3C27",
            "#E1B310",
            "#2CF2A1",
            "#FFFFFF",
        ];
        const color1 = colors[Math.floor(Math.random() * colors.length)];
        let color2 = colors[Math.floor(Math.random() * colors.length)];
        while (color2 === color1) {
            color2 = colors[Math.floor(Math.random() * colors.length)];
        }
        const angle = Math.floor(Math.random() * 360);
        return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
    }

    const gradientCache = new Map<string, string>();
    function getUserGradient(userId: string): string {
        if (!gradientCache.has(userId)) {
            gradientCache.set(userId, generateGradient());
        }
        return gradientCache.get(userId)!;
    }

    function startRefreshInterval() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        // Змінено інтервал на 1 секунду для реального часу
        refreshInterval = setInterval(() => {
            console.log("Auto-refreshing users...");
            loadUsers();
        }, 1000); // 1 секунда замість 2 секунд
    }

    function stopRefreshInterval() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    onMount(async () => {
        await loadUsers();
        startRefreshInterval();
    });

    onDestroy(() => {
        stopRefreshInterval();
    });

    async function loadUsers() {
        try {
            if (!refreshInterval) {
                isLoading = true;
            }
            error = null;
            console.log(
                "Loading users for:",
                currentUserInfo,
                "clientId:",
                clientId,
            );

            const loadedUsers = await getFilteredUsers();

            // Process users and set correct statuses
            users = loadedUsers.map((user) => {
                const userWithMessages = user as UserWithMessages;
                // Use lastMessageTime from Supabase (set in userService.js) as the primary source
                // Fall back to lastMessageTimes from props only if needed
                const userWithStatus = {
                    ...userWithMessages,
                    unreadCount: unreadMessages[userWithMessages.id] || 0,
                    // Only use lastMessageTime from Supabase, not from frontend
                    lastMessageTime: userWithMessages.lastMessageTime,
                };
                // Set status based on database fields
                const calculatedStatus = getUserStatus(userWithStatus);
                userWithStatus.status = calculatedStatus;
                return userWithStatus;
            });

            console.log(
                `Loaded ${users.length} users with statuses:`,
                users.map((u) => ({
                    id: u.id,
                    status: u.status,
                    alara_status: u.alara_status,
                    human_required: u.human_required,
                })),
            );
        } catch (err) {
            console.error("Error loading users:", err);
            error = err instanceof Error ? err.message : "Failed to load users";
            users = [];
        } finally {
            isLoading = false;
        }
    }

    function handleUserSelect(user: UserWithMessages): void {
        selectedUserId = user.id;
        onUserSelect(user);
        if (user.unreadCount && user.unreadCount > 0) {
            unreadMessages[user.id] = 0;
            updateUserUnreadCount(user.id, 0);
        }
    }

    function updateUserUnreadCount(userId: string, count: number) {
        users = users.map((user) =>
            user.id === userId ? { ...user, unreadCount: count } : user,
        );
    }

    function sortUsersList(users: UserWithMessages[]): UserWithMessages[] {
        return sortUsers(users);
    }

    export let searchQuery: string = "";

    // Оновлена фільтрація користувачів з правильними статусами
    $: filteredAndSortedUsers = sortUsersList(
        users.filter((user) => {
            let platformMatch = true;
            let statusMatch = true;
            let searchMatch = true;

            if (activePlatform) {
                const possiblePlatforms = platformMapping[activePlatform] || [
                    activePlatform,
                ];
                platformMatch = possiblePlatforms.includes(user.platform);
            }

            if (activeStatus) {
                const mappedStatus = statusMapping[activeStatus];
                const userStatus = getUserStatus(user);
                statusMatch = userStatus === mappedStatus;
            }

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const searchableText = [
                    user.nickname,
                    user.name,
                    user.username,
                    user.phone,
                    user.email,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                searchMatch = searchableText.includes(query);
            }

            return platformMatch && statusMatch && searchMatch;
        }),
    );

    $: if (Object.keys(unreadMessages).length > 0) {
        users = users.map((user) => ({
            ...user,
            unreadCount: unreadMessages[user.id] || 0,
            // Keep the original lastMessageTime from Supabase
            // Don't override with frontend data
        }));
    }

    $: if (clientId !== undefined) {
        loadUsers();
    }

    export function refreshUsers() {
        loadUsers();
    }

    export function updateUnreadMessages(
        userId: string,
        count: number,
        lastMessageTime?: Date,
    ) {
        unreadMessages[userId] = count;
        // Don't update lastMessageTimes anymore - rely on Supabase data only
        updateUserUnreadCount(userId, count);
    }

    export function pauseAutoRefresh() {
        stopRefreshInterval();
    }

    export function resumeAutoRefresh() {
        startRefreshInterval();
    }

    $: {
        console.log("Filter Debug:", {
            activePlatform,
            activeStatus,
            totalUsers: users.length,
            filteredUsers: filteredAndSortedUsers.length,
            userPlatforms: [...new Set(users.map((u) => u.platform))],
            userStatuses: [...new Set(users.map((u) => getUserStatus(u)))],
            humanRequiredUsers: filteredAndSortedUsers.filter(
                (u) => getUserStatus(u) === "human-required",
            ).length,
            unreadCounts: users.map((u) => ({
                id: u.id,
                unread: u.unreadCount,
                status: getUserStatus(u),
                alara_status: u.alara_status,
                human_required: u.human_required,
            })),
        });
    }
</script>

<div
    class="block-users"
    class:dark={$themeStore === "dark"}
    class:light={$themeStore === "light"}
>
    {#if isLoading}
        <div class="loading">
            <p>Loading users...</p>
        </div>
    {:else if error}
        <div class="error">
            <p>Error: {error}</p>
            <button on:click={loadUsers} class="retry-btn">Retry</button>
        </div>
    {:else if filteredAndSortedUsers.length === 0}
        <div class="no-users">
            {#if users.length === 0}
                <p>No users available</p>
                {#if currentUserInfo}
                    <small>
                        Logged in as: {currentUserInfo.name}
                        ({currentUserInfo.role})
                        {#if currentUserInfo.client_id}
                            | Client ID: {currentUserInfo.client_id}
                        {/if}
                    </small>
                {/if}
            {:else}
                <p>No users match current filters</p>
            {/if}
        </div>
    {:else}
        {#each filteredAndSortedUsers as user (user.id)}
            {@const userStatus = getUserStatus(user)}
            <div
                class="user"
                class:selected={selectedUserId === user.id}
                class:has-unread={user.unreadCount && user.unreadCount > 0}
                class:human-required={userStatus === "human-required"}
                class:dark={$themeStore === "dark"}
                class:light={$themeStore === "light"}
                on:click={() => handleUserSelect(user)}
                role="button"
                tabindex="0"
                on:keydown={(e) => e.key === "Enter" && handleUserSelect(user)}
            >
                <div class="avatar-container">
                    <div
                        class="avatar"
                        style="background: {getUserGradient(user.id)}"
                    ></div>
                    {#if user.unreadCount && user.unreadCount > 0}
                        <div class="unread-badge">
                            {user.unreadCount > 99 ? "99+" : user.unreadCount}
                        </div>
                    {/if}
                    {#if userStatus === "human-required"}
                        <div
                            class="human-required-indicator"
                            title="Human Required"
                        ></div>
                    {/if}
                </div>
                <div class="text">
                    <h3>
                        {user.nickname ||
                            user.name ||
                            user.username ||
                            "no info"}
                    </h3>
                    <div class="status">
                        <p>{statusConfig[userStatus]?.label || "no info"}</p>
                        <div
                            class="status-indicator"
                            style="background-color: {statusConfig[userStatus]
                                ?.color || '#6b7280'}"
                        ></div>
                    </div>
                </div>
            </div>
        {/each}
    {/if}
</div>

<!-- Стилі залишаються без змін -->
<style>
    .block-users {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 800px;
        overflow-y: auto;
        transition: background-color 0.3s ease;
    }

    .user {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
        position: relative;
        background-color: transparent;
    }

    .user:hover {
        background-color: var(--color-232426);
    }

    .user.selected {
        background-color: var(--color-530549);
        color: var(--color-fff);
    }

    .user.selected h3 {
        color: var(--color-ffffff);
    }

    .user.selected .status p {
        color: var(--color-ffffff);
    }

    .user.has-unread {
        border-left: 3px solid #4de944;
    }

    .avatar-container {
        position: relative;
        flex-shrink: 0;
    }

    .avatar {
        width: 34px;
        height: 34px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .unread-badge {
        position: absolute;
        top: -6px;
        right: -6px;
        background-color: #e94447;
        color: white;
        border-radius: 10px;
        min-width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        padding: 0 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 1;
        animation: pulse 2s infinite;
    }

    .text {
        flex: 1;
        min-width: 0;
    }

    .text h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 400;
        color: var(--color-fff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 0.3s ease;
    }

    .user.has-unread .text h3 {
        font-weight: 600;
    }

    .status {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
    }

    .status p {
        margin: 0;
        font-size: 12px;
        color: var(--color-9b9ca3);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 0.3s ease;
    }

    .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .no-users,
    .loading,
    .error {
        text-align: center;
        padding: 32px 16px;
    }

    .no-users p,
    .loading p,
    .error p {
        margin: 0 0 8px 0;
        color: var(--color-9b9ca3);
        font-size: 16px;
        transition: color 0.3s ease;
    }

    .no-users small {
        color: var(--color-9b9ca3);
        font-size: 12px;
        display: block;
        margin-top: 8px;
        line-height: 1.4;
        transition: color 0.3s ease;
    }

    .retry-btn {
        background-color: var(--color-530549);
        color: var(--color-fff);
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 8px;
        transition: all 0.3s ease;
    }

    .retry-btn:hover {
        background-color: var(--color-8a0778);
    }

    /* Скролбар */
    .block-users::-webkit-scrollbar {
        width: 6px;
    }

    .block-users::-webkit-scrollbar-track {
        background: var(--color-131416);
        border-radius: 3px;
    }

    .block-users::-webkit-scrollbar-thumb {
        background: var(--color-232426);
        border-radius: 3px;
    }

    .block-users::-webkit-scrollbar-thumb:hover {
        background: var(--color-9b9ca3);
    }

    /* Анімація для нових повідомлень */
    @keyframes pulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.1);
        }
        100% {
            transform: scale(1);
        }
    }

    .user.has-unread:hover .unread-badge {
        animation: none;
    }
    /* Додаткові стилі для користувачів у світлій темі */
</style>
