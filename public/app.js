const API = "/api/requests";
const form = document.getElementById("requestForm");
const materialsBody = document.getElementById("materialsBody");
const grandTotal = document.getElementById("grandTotal");
const formMessage = document.getElementById("formMessage");
const reviewMessage = document.getElementById("reviewMessage");
let requestsCache = [];

function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
}
function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}
function addMaterialRow(data = {}) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td class="serial"></td>
    <td><input class="description" type="text" placeholder="e.g. Laptop" required maxlength="180"></td>
    <td><input class="unit" type="text" placeholder="e.g. Nos" required maxlength="40"></td>
    <td><input class="quantity" type="number" min="0.01" step="0.01" value="1" required></td>
    <td><input class="net-price" type="number" min="0" step="0.01" value="0" required></td>
    <td class="line-total">₹0.00</td>
    <td><button type="button" class="remove-row" title="Remove material" aria-label="Remove material">×</button></td>`;
  row.querySelector(".description").value = data.description || "";
  row.querySelector(".unit").value = data.unit || "";
  row.querySelector(".quantity").value = data.quantity ?? 1;
  row.querySelector(".net-price").value = data.netPrice ?? 0;
  row.querySelectorAll("input").forEach(input => input.addEventListener("input", updateTotals));
  row.querySelector(".remove-row").addEventListener("click", () => {
    if (materialsBody.children.length === 1) {
      row.querySelectorAll("input").forEach(input => input.value = "");
      row.querySelector(".quantity").value = 1;
      row.querySelector(".net-price").value = 0;
    } else row.remove();
    updateTotals();
  });
  materialsBody.appendChild(row);
  updateTotals();
}
function updateTotals() {
  let sum = 0;
  [...materialsBody.rows].forEach((row, index) => {
    row.querySelector(".serial").textContent = index + 1;
    const qty = Number(row.querySelector(".quantity").value) || 0;
    const price = Number(row.querySelector(".net-price").value) || 0;
    const total = qty * price;
    row.querySelector(".line-total").textContent = money(total);
    sum += total;
  });
  grandTotal.textContent = money(sum);
}
function collectForm() {
  const materials = [...materialsBody.rows].map(row => ({
    description: row.querySelector(".description").value.trim(),
    unit: row.querySelector(".unit").value.trim(),
    quantity: Number(row.querySelector(".quantity").value),
    netPrice: Number(row.querySelector(".net-price").value)
  }));
  return {
    prNo: document.getElementById("prNo").value.trim(),
    department: document.getElementById("department").value,
    rankingBy: document.getElementById("rankingBy").value.trim(),
    materials
  };
}
async function saveRequest(status) {
  showMessage(formMessage, "");
  const payload = collectForm();
  if (!payload.prNo || !/^[0-9]+$/.test(payload.prNo)) {
    showMessage(formMessage, "PR No. must contain numbers only.", true);
    return;
  }
  if (!payload.department || !payload.rankingBy) {
    showMessage(formMessage, "Please enter a department and ranking.", true);
    return;
  }
  if (payload.materials.some(m => !m.description || !m.unit || !Number.isFinite(m.quantity) || m.quantity <= 0 || !Number.isFinite(m.netPrice) || m.netPrice < 0)) {
    showMessage(formMessage, "Complete each material row. Quantity must be greater than zero and net price cannot be negative.", true);
    return;
  }
  if (!payload.materials.length) {
    showMessage(formMessage, "Please add at least one material.", true);
    return;
  }
  payload.status = status;
  try {
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not save request.");
    showMessage(formMessage, `PR No. ${result.prNo} ${status === "Draft" ? "saved as a draft" : "submitted for review"}.`);
    form.reset();
    materialsBody.innerHTML = "";
    addMaterialRow();
    document.getElementById("prNo").value = "";
    await loadRequests();
  } catch (error) {
    showMessage(formMessage, error.message || "Server connection failed. Is the server running?", true);
  }
}
async function loadRequests() {
  try {
    const response = await fetch(API);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not load requests.");
    requestsCache = result;
    renderRequests();
    showMessage(reviewMessage, "");
  } catch (error) {
    showMessage(reviewMessage, `${error.message} Check your server and MongoDB Atlas connection.`, true);
  }
}
function renderRequests() {
  const filter = document.getElementById("statusFilter").value;
  const filtered = requestsCache.filter(request => filter === "All" || request.status === filter);
  document.getElementById("totalCount").textContent = requestsCache.length;
  document.getElementById("pendingCount").textContent = requestsCache.filter(r => r.status === "Pending").length;
  document.getElementById("acceptedCount").textContent = requestsCache.filter(r => r.status === "Accepted").length;
  document.getElementById("rejectedCount").textContent = requestsCache.filter(r => r.status === "Rejected").length;
  requestsBody.innerHTML = "";
  if (!filtered.length) {
    requestsBody.innerHTML = `<tr><td colspan="9" class="empty">No requests found. Submit a request on Dashboard 1 first.</td></tr>`;
    return;
  }
  filtered.forEach(request => {
    request.materials.forEach((material, index) => {
      const tr = document.createElement("tr");
      const cells = [
        index === 0 ? `PR-${request.prNo}` : "",
        index === 0 ? request.department : "",
        index === 0 ? request.rankingBy : "",
        material.description,
        material.unit,
        material.quantity,
        money(material.netPrice),
        money(material.quantity * material.netPrice)
      ];
      cells.forEach(value => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });
      if (index === 0) {
        const td = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `status status-${request.status}`;
        badge.textContent = request.status;
        td.appendChild(badge);
        if (request.status === "Pending") {
          const actions = document.createElement("div");
          actions.className = "action-stack";
          const accept = document.createElement("button");
          accept.className = "button button-success button-small";
          accept.textContent = "Accept";
          accept.addEventListener("click", () => updateStatus(request._id, "Accepted"));
          const reject = document.createElement("button");
          reject.className = "button button-danger button-small";
          reject.textContent = "Reject";
          reject.addEventListener("click", () => updateStatus(request._id, "Rejected"));
          actions.append(accept, reject);
          td.appendChild(actions);
        }
        tr.appendChild(td);
      } else {
        const td = document.createElement("td");
        td.textContent = "↳ Same request";
        td.style.color = "#8491a4";
        tr.appendChild(td);
      }
      requestsBody.appendChild(tr);
    });
  });
}
async function updateStatus(id, status) {
  showMessage(reviewMessage, "");
  try {
    const response = await fetch(`${API}/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Status update failed.");
    showMessage(reviewMessage, `PR No. ${result.prNo} marked ${status.toLowerCase()}.`);
    await loadRequests();
  } catch (error) {
    showMessage(reviewMessage, error.message, true);
  }
}
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(item => item.classList.toggle("active", item === tab));
    document.querySelectorAll(".view").forEach(view => view.classList.toggle("hidden", view.id !== tab.dataset.view));
    if (tab.dataset.view === "reviewView") loadRequests();
  });
});
document.getElementById("addRowBtn").addEventListener("click", () => addMaterialRow());
document.getElementById("saveDraftBtn").addEventListener("click", () => saveRequest("Draft"));
form.addEventListener("submit", event => {
  event.preventDefault();
  saveRequest("Pending");
});
document.getElementById("refreshBtn").addEventListener("click", loadRequests);
document.getElementById("statusFilter").addEventListener("change", renderRequests);
addMaterialRow();
