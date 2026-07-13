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
const progressBar = document.getElementById("progressBar");
const percentText = document.getElementById("percentText");
const recentStates = document.getElementById("recentStates");
const progressContainer = document.querySelector(".progress-container");

let selectedStates = {};
let statePaths;

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
    .attr("d", path)
    .attr("fill", d => selectedStates[normalizeId(d.id)] ? "#22c55e" : "#cbd5e1")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.2)
    .style("cursor", "pointer")
    .on("mouseenter", function (event, d) {
      d3.select(this).attr("opacity", 0.8);
      const id = normalizeId(d.id);
      tooltip.textContent = stateNames[id] || "Unknown state";
      tooltip.style.display = "block";
    })
    .on("mousemove", function (event) {
      tooltip.style.left = `${event.clientX + 12}px`;
      tooltip.style.top = `${event.clientY + 12}px`;
    })
    .on("mouseleave", function () {
      d3.select(this).attr("opacity", 1);
      tooltip.style.display = "none";
    })
    .on("click", async function (event, d) {
      const id = normalizeId(d.id);
      selectedStates[id] = !selectedStates[id];
      updateDisplay();

      try {
        await saveStates(selectedStates);
      } catch (error) {
        console.error("Could not save state changes:", error);
        alert("The map could not save your change. Check your Firebase configuration and Firestore rules.");
      }
    });

  svg
    .append("path")
    .datum(nation)
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#64748b")
    .attr("stroke-width", 1.5)
    .attr("pointer-events", "none");

  updateDisplay();
}

function updateDisplay() {
  const selectedIds = Object.keys(selectedStates).filter(id => selectedStates[id]);
  const count = selectedIds.length;
  const percent = Math.round((count / 50) * 100);

  if (statePaths) {
    statePaths.attr("fill", d =>
      selectedStates[normalizeId(d.id)] ? "#22c55e" : "#cbd5e1"
    );
  }

  stateCount.textContent = `${count} / 50`;
  progressBar.style.width = `${percent}%`;
  percentText.textContent = `${percent}%`;
  progressContainer.setAttribute("aria-valuenow", String(count));

  recentStates.innerHTML = "";

  selectedIds
    .slice(-8)
    .reverse()
    .forEach(id => {
      const item = document.createElement("li");
      item.textContent = stateNames[id] || id;
      recentStates.appendChild(item);
    });

  if (count === 0) {
    const item = document.createElement("li");
    item.textContent = "No states selected yet.";
    recentStates.appendChild(item);
  }
}

watchStates(states => {
  selectedStates = states || {};
  updateDisplay();
});

buildMap();
