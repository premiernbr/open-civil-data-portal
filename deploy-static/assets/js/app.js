const openIntroVideoButton = document.getElementById("openIntroVideo");
const introVideoModal = document.getElementById("introVideoModal");
const introVideoHost = document.getElementById("introVideoHost");

const INTRO_VIDEO_ID = "SvigDjAbe0A";
const INTRO_VIDEO_EMBED_URL = `https://www.youtube-nocookie.com/embed/${INTRO_VIDEO_ID}?rel=0&modestbranding=1&autoplay=1&playsinline=1`;
let introVideoScrollY = 0;

function openIntroVideo() {
  if (!introVideoModal || !introVideoHost) return;

  introVideoScrollY = window.scrollY;

  const iframe = document.createElement("iframe");
  iframe.src = INTRO_VIDEO_EMBED_URL;
  iframe.title = "شرح منصة النسيج المدني";
  iframe.loading = "lazy";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
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
