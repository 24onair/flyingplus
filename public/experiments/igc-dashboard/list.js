const uploadForm = document.getElementById("upload-form");
const uploadInput = document.getElementById("upload-input");
const uploadStatus = document.getElementById("upload-status");
const flightList = document.getElementById("flight-list");
const searchParams = new URLSearchParams(window.location.search);
const selectedFlightId = searchParams.get("selected");

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatDuration(seconds) {
  if (typeof seconds !== "number") {
    return "-";
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === "string") node.textContent = text;
  return node;
}

function renderFlights(flights) {
  flightList.innerHTML = "";

  if (!flights.length) {
    flightList.append(el("div", "empty", "아직 업로드된 IGC 비행이 없습니다."));
    return;
  }

  flights.forEach((flight) => {
    const link = document.createElement("a");
    link.className = "segment-card flight-link";
    link.href = `./index.html?flight=${encodeURIComponent(flight.id)}`;
    if (selectedFlightId === flight.id) {
      link.classList.add("is-selected");
    }

    const title = el("h3", "", flight.title);
    const meta = el(
      "p",
      "",
      `날짜 ${flight.flightDate ?? "-"} | 조종사 ${flight.pilot ?? "-"} | 거리 ${typeof flight.distanceKm === "number" ? `${formatNumber(flight.distanceKm, 2)}km` : "-"} | 비행시간 ${formatDuration(flight.durationSeconds)}`,
    );
    const sub = el(
      "p",
      "list-meta",
      `${flight.sourceFileName} | 업로드 ${new Date(flight.uploadedAt).toLocaleString("ko-KR")}`,
    );

    link.append(title, meta, sub);
    flightList.append(link);
  });

  if (selectedFlightId) {
    const selectedNode = flightList.querySelector(".flight-link.is-selected");
    selectedNode?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

async function loadFlights() {
  const response = await fetch("/api/igc-flights", { cache: "no-store" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "flight list error");
  }

  renderFlights(data.flights ?? []);
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = uploadInput.files?.[0];

  if (!file) {
    uploadStatus.textContent = "업로드할 IGC 파일을 먼저 선택하세요.";
    return;
  }

  uploadStatus.textContent = "업로드 중...";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/igc-flights", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "upload error");
    }

    uploadStatus.textContent = "업로드 완료. 리스트를 새로고침했습니다.";
    uploadInput.value = "";
    await loadFlights();
  } catch (error) {
    uploadStatus.textContent =
      error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.";
  }
});

loadFlights().catch((error) => {
  flightList.innerHTML = "";
  flightList.append(
    el(
      "div",
      "error",
      error instanceof Error ? error.message : "리스트를 불러오지 못했습니다.",
    ),
  );
});
