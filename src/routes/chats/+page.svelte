<script lang="ts">
    import { onMount } from "svelte";
    import UserChat from "./UserChat.svelte";
    import Filters from "./Filters.svelte";
    import { themeStore } from "../../lib/store/theme";
    import type { User } from "../../lib/types/type";

    let selectedUser: User | null = null;
    let isFullscreen: boolean = false;
    let backgroundImage: string | null = null;

    onMount(() => {
        const saved = localStorage.getItem("chatBackgroundImage");
        if (saved) {
            backgroundImage = saved;
        }
    });

    function handleUserSelect(user: User): void {
        selectedUser = user;
    }

    function handleBackToList(): void {
        selectedUser = null;
        isFullscreen = false;
    }

    function toggleFullscreen(): void {
        isFullscreen = !isFullscreen;
    }

    function handleBackgroundChange(event: CustomEvent): void {
        backgroundImage = event.detail.backgroundImage;
    }
</script>

<div
    class="main-container"
    class:dark={$themeStore === "dark"}
    class:light={$themeStore === "light"}
>
    {#if !isFullscreen}
        <Filters onUserSelect={handleUserSelect} />
    {/if}
    {#if selectedUser}
        <UserChat
            {selectedUser}
            {backgroundImage}
            onBackToList={handleBackToList}
            onToggleFullscreen={toggleFullscreen}
            {isFullscreen}
            on:backgroundChange={handleBackgroundChange}
        />
    {:else}
        <div
            class="chats-container"
            class:dark={$themeStore === "dark"}
            class:light={$themeStore === "light"}
        >
            <h1>Your Chats</h1>
            <div class="chat-list">
                <p>
                    Watch, write and edit Alara's conversation with your
                    customers
                </p>
            </div>
        </div>
    {/if}
</div>

<style>
    .main-container {
        display: flex;
        height: 100vh;
        transition: background-color 0.3s ease;
    }

    /* Темна тема */
    .main-container.dark {
        background-color: #070709;
    }

    /* Світла тема */
    .main-container.light {
        background-color: #ffffff;
    }

    .chats-container {
        flex: 1;
        padding-top: 4.2%;
        padding-left: 5%;
        transition:
            color 0.3s ease,
            background-color 0.3s ease;
    }

    /* Темна тема для контейнера чатів */
    .chats-container.dark {
        color: #fff;
        background-color: #070709;
    }

    /* Світла тема для контейнера чатів */
    .chats-container.light {
        color: #1a1a1a;
        background-color: #ffffff;
    }

    h1 {
        font-size: 30px;
        margin: 0 0 25px 0;
        transition: color 0.3s ease;
    }

    /* Темна тема для заголовка */
    .chats-container.dark h1 {
        color: #fff;
    }

    /* Світла тема для заголовка */
    .chats-container.light h1 {
        color: #1a1a1a;
    }

    .chat-list {
        margin-top: 25px;
    }

    .chat-list p {
        font-size: 14px;
        margin: 0;
        font-weight: 500;
        transition: color 0.3s ease;
    }

    /* Темна тема для опису */
    .chats-container.dark .chat-list p {
        color: #9b9ca3;
    }

    /* Світла тема для опису */
    .chats-container.light .chat-list p {
        color: #6b7280;
    }

    /* Адаптивність */
    @media (max-width: 768px) {
        .chats-container {
            padding-top: 3%;
            padding-left: 4%;
            padding-right: 4%;
        }

        h1 {
            font-size: 24px;
        }

        .chat-list p {
            font-size: 13px;
        }
    }

    @media (max-width: 480px) {
        .chats-container {
            padding-top: 2%;
            padding-left: 3%;
            padding-right: 3%;
        }

        h1 {
            font-size: 20px;
            margin-bottom: 16px;
        }

        .chat-list {
            margin-top: 16px;
        }

        .chat-list p {
            font-size: 12px;
            line-height: 1.4;
        }
    }
</style>
