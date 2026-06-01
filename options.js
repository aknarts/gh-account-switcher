const rulesList = document.getElementById("rules-list");
const addBtn = document.getElementById("add-rule");
const saveBtn = document.getElementById("save");
const toast = document.getElementById("toast");
const defaultInput = document.getElementById("default-account");

function createRuleRow(rule) {
  const row = document.createElement("div");
  row.className = "rule-row";
  const sel = document.createElement("select");
  ["org", "page_id", "path_prefix", "regex"].forEach(t => {
    const o = document.createElement("option");
    o.value = t;
    o.textContent = t;
    if (t === rule.type) o.selected = true;
    sel.appendChild(o);
  });
  const val = document.createElement("input");
  val.type = "text";
  val.value = rule.value || "";
  val.placeholder = "Match value";
  const acc = document.createElement("input");
  acc.type = "text";
  acc.value = rule.account || "";
  acc.placeholder = "Account login";
  const del = document.createElement("button");
  del.className = "btn-danger";
  del.textContent = "\u00D7";
  del.addEventListener("click", () => row.remove());
  row.appendChild(sel);
  row.appendChild(val);
  row.appendChild(acc);
  row.appendChild(del);
  return row;
}

function loadSettings() {
  chrome.storage.sync.get(["rules", "defaultAccount"], (data) => {
    defaultInput.value = data.defaultAccount || "";
    (data.rules || []).forEach(r => rulesList.appendChild(createRuleRow(r)));
  });
}

addBtn.addEventListener("click", () => {
  rulesList.appendChild(createRuleRow({ type: "org", value: "", account: "" }));
});

saveBtn.addEventListener("click", () => {
  const rows = rulesList.querySelectorAll(".rule-row");
  const rules = Array.from(rows).map(row => ({
    type: row.querySelector("select").value,
    value: row.querySelectorAll("input")[0].value,
    account: row.querySelectorAll("input")[1].value
  }));
  const defaultAccount = defaultInput.value.trim() || null;
  chrome.storage.sync.set({ rules, defaultAccount }, () => {
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2000);
  });
});

loadSettings();
