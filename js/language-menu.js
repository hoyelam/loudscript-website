document.addEventListener("click", (event) => {
    document.querySelectorAll(".mac-language-menu details[open]").forEach((menu) => {
        if (!menu.contains(event.target)) menu.removeAttribute("open");
    });
});

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    document.querySelectorAll(".mac-language-menu details[open]").forEach((menu) => {
        menu.removeAttribute("open");
        menu.querySelector("summary")?.focus();
    });
});
