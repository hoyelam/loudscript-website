const openLinkedRelease = () => {
    if (!window.location.hash.startsWith("#version-")) {
        return;
    }

    const release = document.getElementById(window.location.hash.slice(1));
    if (release instanceof HTMLDetailsElement) {
        release.open = true;
    }
};

openLinkedRelease();
window.addEventListener("hashchange", openLinkedRelease);
