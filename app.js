
"use strict";

const button = document.getElementById("test-button");
const results = document.getElementById("results");
const browserStatus = document.getElementById("browser-status");

function updateBrowserStatus() {
  browserStatus.textContent = navigator.onLine
    ? "Browser reports: Online"
    : "Browser reports: Offline";
}

async function runTest() {
  button.disabled = true;
  results.textContent = "Testing connection...";

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    5000
  );

  const startTime = performance.now();

  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_test", crypto.randomUUID());

    const response = await fetch(url, {
      method: "GET",
      mode: "same-origin",
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: controller.signal
    });

    const latency = Math.round(
      performance.now() - startTime
    );

    if (!response.ok) {
      results.textContent =
        `HTTP error: ${response.status}\n` +
        `Request duration: ${latency} ms`;
      return;
    }

    results.textContent =
      "GitHub Pages: Reachable\n" +
      `HTTP status: ${response.status}\n` +
      `Request duration: ${latency} ms\n` +
      "HTTPS: Enabled";
  } catch (error) {
    results.textContent =
      error.name === "AbortError"
        ? "Request timed out after 5 seconds."
        : "Connection failed or was blocked.";
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
    updateBrowserStatus();
  }
}

button.addEventListener("click", runTest);
window.addEventListener("online", updateBrowserStatus);
window.addEventListener("offline", updateBrowserStatus);

updateBrowserStatus();
