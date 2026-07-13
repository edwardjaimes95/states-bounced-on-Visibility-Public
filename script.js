import { saveStates, watchStates } from "./firebase.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm";
import us from "https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-albers-10m.json/+esm";

const stateNames = {
  "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas",
  "06": "California", "08": "Colorado", "09": "Connecticut", "10": "Delaware",
  "12": "Florida", "13": "Georgia", "15": "Hawaii", "16": "Idaho",
  "17": "Illinois", "18": "Indiana", "19": "Iowa", "20": "Kansas",
  "21": "Kentucky", "22": "Louisiana", "23": "Maine", "24": "Maryland",
  "25": "Massachusetts", "26": "Michigan", "27": "Minnesota", "28": "Mississippi",
  "29": "Missouri", "30": "Montana", "31": "Nebraska", "32": "Nevada",
  "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico", "36": "New York",
  "37": "North Carolina", "38": "North Dakota", "39": "Ohio", "40": "Oklahoma",
  "41": "Oregon", "42": "Pennsylvania", "44": "Rhode Island", "45": "South Carolina",
  "46": "South Dakota", "47": "Tennessee", "48": "Texas", "49": "Utah",
  "50": "Vermont", "51": "Virginia", "53": "Washington", "54": "West Virginia",
  "55": "Wisconsin", "56": "Wyoming"
};

const mapContainer = document.getElementById("map");
const tooltip = document.getElementById("tooltip");
const stateCount = document.getElementById("stateCount");
const percentageText = document.getElementById("percentText");
const remainingCount = document.getElementById("remainingCount");
const progressBar = document.getElementById("progressBar");
const progressMessage = document.getElementById("progressMessage");
const progressContainer = document.querySelector(".progress-container");
const recentStates = document.getElementById("recentStates");
const celebration = document.getElementById("celebration");
const mediaPopup = document.getElementById("mediaPopup");
const mediaPopupState = document.getElementById("mediaPopupState");
const stateSound = document.getElementById("stateSound");
let mediaPopupTimer;

let selectedStates = {};
let statePaths;
let previousCount = 0;
let hasCelebrated = false;

function normalizeId(id) {
  return String(id).padStart(2, "0");
}

function buildMap() {
  mapContainer.innerHTML = "";

  const svg = d3
    .select(mapContainer)
    .append("svg")
    .attr("viewBox", "0 0 975 610")
    .attr("role", "img")
    .attr("aria-label", "Interactive map of the United States");

  const states = feature(us, us.objects.states).features;
  const nation = feature(us, us.objects.nation);
  const path = d3.geoPath();

  statePaths = svg
    .append("g")
    .selectAll("path")
    .data(states)
    .join("path")
    .attr("class", "state-shape")
    .attr("d", path)
    .attr("data-state-id", d => normalizeId(d.id))
    .attr("fill", d =>
      selectedStates[normalizeId(d.id)] ? "#0ea66c" : "#c9d4e2"
    )
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.25)
    .style("cursor", "pointer")
    .on("mouseenter", function (event, d) {
      const id = normalizeId(d.id);
      tooltip.textContent = stateNames[id] || "Unknown state";
      tooltip.style.display = "block";
    })
    .on("mousemove", function (event) {
      tooltip.style.left = `${event.clientX + 12}px`;
      tooltip.style.top = `${event.clientY + 12}px`;
    })
    .on("mouseleave", function () {
      tooltip.style.display = "none";
    })
    .on("click", async function (event, d) {
      const id = normalizeId(d.id);
      const wasSelected = Boolean(selectedStates[id]);

      selectedStates[id] = !wasSelected;
      animateState(this);
      playStateMedia(stateNames[id] || "State", selectedStates[id]);
      updateDisplay();

      try {
        await saveStates(selectedStates);
      } catch (error) {
        selectedStates[id] = wasSelected;
        updateDisplay();
        console.error("Could not save state changes:", error);
        alert("The map could not save your change. Check your internet connection and Firebase setup.");
      }
    });

  svg
    .append("path")
    .datum(nation)
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#62748b")
    .attr("stroke-width", 1.6)
    .attr("pointer-events", "none");

  updateDisplay(false);
}


function playStateMedia(stateName, isSelected) {
  window.clearTimeout(mediaPopupTimer);

  mediaPopupState.textContent = isSelected
    ? `${stateName} bounced on!`
    : `${stateName} unmarked!`;

  mediaPopup.classList.remove("show");
  mediaPopup.setAttribute("aria-hidden", "false");

  void mediaPopup.getBoundingClientRect();
  mediaPopup.classList.add("show");

  try {
    stateSound.currentTime = 0;
    const playPromise = stateSound.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(error => {
        console.warn("Sound playback was blocked by the browser:", error);
      });
    }
  } catch (error) {
    console.warn("Sound playback failed:", error);
  }

  mediaPopupTimer = window.setTimeout(() => {
    mediaPopup.classList.remove("show");
    mediaPopup.setAttribute("aria-hidden", "true");
  }, 1500);
}

function animateState(element) {
  element.classList.remove("state-pop");
  void element.getBoundingClientRect();
  element.classList.add("state-pop");

  window.setTimeout(() => {
    element.classList.remove("state-pop");
  }, 500);
}

function animateMetric(element) {
  element.classList.remove("count-bump");
  void element.getBoundingClientRect();
  element.classList.add("count-bump");

  window.setTimeout(() => {
    element.classList.remove("count-bump");
  }, 420);
}

function getProgressMessage(count) {
  if (count === 0) return "Your map is ready to begin.";
  if (count < 10) return "A great start — keep bouncing.";
  if (count < 20) return "You are building momentum.";
  if (count < 30) return "More than a third of the country marked.";
  if (count < 40) return "You are closing in on the finish.";
  if (count < 50) return "Almost there — only a few states remain.";
  return "All 50 states completed!";
}

function updateDisplay(animate = true) {
  const selectedIds = Object.keys(selectedStates).filter(id => selectedStates[id]);
  const count = selectedIds.length;
  const percent = Math.round((count / 50) * 100);
  const remaining = 50 - count;

  if (statePaths) {
    statePaths.attr("fill", d =>
      selectedStates[normalizeId(d.id)] ? "#0ea66c" : "#c9d4e2"
    );
  }

  stateCount.textContent = `${count} / 50`;
  percentageText.textContent = `${percent}%`;
  remainingCount.textContent = String(remaining);
  progressBar.style.width = `${percent}%`;
  progressContainer.setAttribute("aria-valuenow", String(count));
  progressMessage.textContent = getProgressMessage(count);

  if (animate && count !== previousCount) {
    animateMetric(stateCount);
    animateMetric(percentageText);
    animateMetric(remainingCount);
  }

  recentStates.innerHTML = "";

  selectedIds
    .slice(-8)
    .reverse()
    .forEach((id, index) => {
      const item = document.createElement("li");
      item.textContent = stateNames[id] || id;
      item.style.animationDelay = `${index * 45}ms`;
      recentStates.appendChild(item);
    });

  if (count === 0) {
    const item = document.createElement("li");
    item.textContent = "No states selected yet.";
    item.className = "empty-state";
    recentStates.appendChild(item);
  }

  if (count === 50 && !hasCelebrated) {
    launchCelebration();
    hasCelebrated = true;
  }

  if (count < 50) {
    hasCelebrated = false;
  }

  previousCount = count;
}

function launchCelebration() {
  celebration.innerHTML = "";

  const colors = [
    "#0ea66c",
    "#123f8c",
    "#42cf96",
    "#f2b84b",
    "#d95c6a",
    "#ffffff"
  ];

  for (let i = 0; i < 90; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--fall-duration", `${2.6 + Math.random() * 2.2}s`);
    piece.style.setProperty("--drift", `${-100 + Math.random() * 200}px`);
    piece.style.animationDelay = `${Math.random() * 0.7}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    celebration.appendChild(piece);
  }

  window.setTimeout(() => {
    celebration.innerHTML = "";
  }, 5600);
}

watchStates(states => {
  selectedStates = states || {};
  updateDisplay();
});

buildMap();
