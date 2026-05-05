const openIntroVideoButton = document.getElementById("openIntroVideo");
const introVideoModal = document.getElementById("introVideoModal");
const introVideoHost = document.getElementById("introVideoHost");

const INTRO_VIDEO_ID = "SvigDjAbe0A";
const INTRO_VIDEO_EMBED_URL = `https://www.youtube-nocookie.com/embed/${INTRO_VIDEO_ID}?rel=0&autoplay=1&playsinline=1&vq=hd720`;
let introVideoScrollY = 0;

function openIntroVideo() {
  if (!introVideoModal || !introVideoHost) return;

  introVideoScrollY = window.scrollY;

  const iframe = document.createElement("iframe");
  iframe.src = INTRO_VIDEO_EMBED_URL;
  iframe.title = "فيديو تعريفي بمنصة النسيج المدني";
  iframe.loading = "eager";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  introVideoHost.replaceChildren(iframe);

  introVideoModal.hidden = false;
  introVideoModal.scrollTop = 0;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function closeIntroVideo() {
  if (!introVideoModal || !introVideoHost) return;

  introVideoHost.replaceChildren();
  introVideoModal.hidden = true;
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  window.scrollTo(0, introVideoScrollY);
}

if (openIntroVideoButton) {
  openIntroVideoButton.addEventListener("click", openIntroVideo);
}

document.querySelectorAll("[data-close-video]").forEach((element) => {
  element.addEventListener("click", closeIntroVideo);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && introVideoModal && !introVideoModal.hidden) {
    closeIntroVideo();
  }
});

function loadQrWidget() {
  if (window.nsijQrWidgetLoaded || document.querySelector('script[src*="nsij-qr-widget.js"]')) {
    return;
  }

  const script = document.createElement("script");
  script.src = "./assets/js/nsij-qr-widget.js";
  script.async = true;
  document.body.appendChild(script);
}

function scheduleQrWidget() {
  window.setTimeout(() => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadQrWidget, { timeout: 2500 });
      return;
    }

    loadQrWidget();
  }, 4200);
}

if (document.readyState === "complete") {
  scheduleQrWidget();
} else {
  window.addEventListener("load", scheduleQrWidget, { once: true });
}
