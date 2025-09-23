<script>
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { themeStore } from "../../lib/store/theme";
    import imgChats from "../../lib/images/chats.png";
    import imgAnalytics from "../../lib/images/analytics.png";
    import imgSettings from "../../lib/images/settings.png";
    import imgWidget from "../../lib/images/widget.png";

    import imgChats2 from "../../lib/images/envelope (2).png";
    import imgAnalytics2 from "../../lib/images/analytics.png";
    import logOut from "../../lib/images/logout.png";
    import agent from "../../lib/images/agent.png";

    $: currentPath = $page.url.pathname;

    // @ts-ignore
    function navigateTo(path) {
        goto(path);
    }

    function handleLogout() {
        // Очищуємо localStorage/sessionStorage якщо потрібно
        localStorage.clear();
        sessionStorage.clear();

        // Перенаправляємо на головну сторінку та повністю перезавантажуємо
        window.location.href = "/";

        // Альтернативно можна використати:
        // window.location.replace('/');
    }
</script>

<div class="sidebar">
    <div
        class="block-bar chats"
        class:active={currentPath === "/chats"}
        on:click={() => navigateTo("/chats")}
        on:keydown={(e) => e.key === "Enter" && navigateTo("/chats")}
        role="button"
        tabindex="0"
    >
        <img src={imgChats2} alt="Chats" />
    </div>
    <div
        class="block-bar analyt"
        class:active={currentPath === "/analytics"}
        on:click={() => navigateTo("/analytics")}
        on:keydown={(e) => e.key === "Enter" && navigateTo("/analytics")}
        role="button"
        tabindex="0"
    >
        <img src={imgAnalytics2} alt="Analytics" />
    </div>
    <div
        class="block-bar prompts"
        class:active={currentPath === "/prompts"}
        on:click={() => navigateTo("/prompts")}
        on:keydown={(e) => e.key === "Enter" && navigateTo("/prompts")}
        role="button"
        tabindex="0"
    >
        <img src={agent} class="prompts-img" alt="Prompts" />
    </div>
    <!-- <div
        class="block-bar settings"
        class:active={currentPath === '/widgets'}
        on:click={() => navigateTo("/widgets")}
        on:keydown={(e) => e.key === "Enter" && navigateTo("/widgets")}
        role="button"
        tabindex="0"
    >
        <img src={imgWidget} alt="Widget" />
    </div>-->
    <div
        class="block-bar settings"
        class:active={currentPath === "/settings"}
        on:click={() => navigateTo("/settings")}
        on:keydown={(e) => e.key === "Enter" && navigateTo("/settings")}
        role="button"
        tabindex="0"
    >
        <img src={imgSettings} alt="Settings" />
    </div>

    <div
        class="block-bar logout"
        on:click={handleLogout}
        on:keydown={(e) => e.key === "Enter" && handleLogout()}
        role="button"
        tabindex="0"
        title="Log Out"
    >
        <img src={logOut} alt="logout" />
    </div>
</div>

<style>
    .sidebar {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 60px;
        padding-top: 2%;
        border-right: 1px solid var(--color-232426);
        align-items: center;
        background-color: var(--color-070709);
        transition: all 0.3s ease;
    }

    .block-bar {
        width: 100%;
        max-width: 40px;
        height: 100%;
        max-height: 40px;
        background-color: var(--color-262629);
        border-radius: 4px;
        margin-bottom: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .block-bar.active {
        background-color: var(--color-530549);
    }

    .block-bar img {
        width: 20px;
        height: 20px;
        transition: all 0.3s ease;
    }
    .block-bar .prompts-img {
        width: 30px;
        height: 35px;
        transition: all 0.3s ease;
    }

    /* Адаптивність для великих ноутбуків */
    @media (max-width: 1440px) {
        .sidebar {
            max-width: 65px;
            padding-top: 1.8%;
        }
        .block-bar {
            max-width: 42px;
            max-height: 42px;
            margin-bottom: 16px;
        }
        .block-bar img {
            width: 18px;
            height: 18px;
        }
    }

    /* Адаптивність для стандартних ноутбуків */
    @media (max-width: 1366px) {
        .sidebar {
            max-width: 60px;
            padding-top: 1.5%;
        }
        .block-bar {
            max-width: 38px;
            max-height: 38px;
            margin-bottom: 14px;
        }
        .block-bar img {
            width: 16px;
            height: 16px;
        }
    }

    /* Адаптивність для менших ноутбуків */
    @media (max-width: 1280px) {
        .sidebar {
            max-width: 55px;
            padding-top: 1.2%;
        }
        .block-bar {
            max-width: 36px;
            max-height: 36px;
            margin-bottom: 12px;
        }
        .block-bar img {
            width: 15px;
            height: 15px;
        }
    }

    @media (max-width: 1024px) {
        .sidebar {
            max-width: 50px;
            padding-top: 1%;
        }
        .block-bar {
            max-width: 34px;
            max-height: 34px;
            margin-bottom: 10px;
        }
        .block-bar img {
            width: 14px;
            height: 14px;
        }
    }

    /* Адаптивність для планшетів та мобільних */
    @media (max-width: 768px) {
        .sidebar {
            flex-direction: row;
            max-width: 100%;
            width: 100%;
            height: auto;
            padding: 12px;
            border-right: none;
            border-bottom: 1px solid var(--color-232426);
            justify-content: center;
            gap: 8px;
        }
        .block-bar {
            max-width: 40px;
            max-height: 40px;
            margin-bottom: 0;
            flex-shrink: 0;
        }
        .block-bar img {
            width: 16px;
            height: 16px;
        }
    }

    @media (max-width: 480px) {
        .sidebar {
            padding: 8px;
            gap: 6px;
        }
        .block-bar {
            max-width: 36px;
            max-height: 36px;
        }
        .block-bar img {
            width: 14px;
            height: 14px;
        }
    }
</style>
