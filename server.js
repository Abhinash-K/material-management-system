require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const materialSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  unit: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0.01 },
  netPrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const requestSchema = new mongoose.Schema({
  prNo: { type: Number, unique: true, index: true },
  department: { type: String, required: true, trim: true },
  rankingBy: { type: String, required: true, trim: true },
  materials: {
    type: [materialSchema],
    validate: {
      validator: rows => rows.length > 0,
      message: "Add at least one material."
    }
  },
  status: {
    type: String,
    enum: ["Draft", "Pending", "Accepted", "Rejected"],
    default: "Pending"
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

requestSchema.pre("validate", async function () {
  if (this.prNo) return;
  const latest = await mongoose.model("PurchaseRequest").findOne().sort({ prNo: -1 }).select("prNo").lean();
  this.prNo = latest ? latest.prNo + 1 : 10001;
});

const PurchaseRequest = mongoose.model("PurchaseRequest", requestSchema);

function validateRequestBody(body) {
  if (!body || !/^[0-9]+$/.test(String(body.prNo || ""))) return "PR No. must contain numbers only.";
  if (!String(body.department || "").trim()) return "Select a department.";
  if (!String(body.rankingBy || "").trim()) return "Enter a ranking.";
  if (!Array.isArray(body.materials) || body.materials.length === 0) return "Add at least one material.";
  for (const row of body.materials) {
    if (!String(row.description || "").trim()) return "Every material needs a description.";
    if (!String(row.unit || "").trim()) return "Every material needs a unit.";
    if (!Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0) return "Quantity must be greater than zero.";
    if (!Number.isFinite(Number(row.netPrice)) || Number(row.netPrice) < 0) return "Net price cannot be negative.";
  }
  return null;
}

app.get("/api/requests", async (req, res) => {
  try {
    const requests = await PurchaseRequest.find().sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Could not load requests." });
  }
});

app.get("/api/requests/:id", async (req, res) => {
  try {
    const request = await PurchaseRequest.findById(req.params.id).lean();
    if (!request) return res.status(404).json({ message: "Request not found." });
    res.json(request);
  } catch (err) {
    res.status(400).json({ message: "Invalid request ID." });
  }
});

app.post("/api/requests", async (req, res) => {
  try {
    const problem = validateRequestBody(req.body);
    if (problem) return res.status(400).json({ message: problem });

    const requestedPrNo = Number(req.body.prNo);
    if (!Number.isSafeInteger(requestedPrNo) || requestedPrNo <= 0) {
      return res.status(400).json({ message: "PR No. must be a positive whole number." });
    }
    const existingPrNo = await PurchaseRequest.findOne({ prNo: requestedPrNo }).select("_id").lean();
    if (existingPrNo) return res.status(409).json({ message: "That PR No. already exists. Please enter a different number." });

    const request = new PurchaseRequest({
      prNo: requestedPrNo,
      department: req.body.department,
      rankingBy: req.body.rankingBy,
      materials: req.body.materials.map(row => ({
        description: String(row.description).trim(),
        unit: String(row.unit).trim(),
        quantity: Number(row.quantity),
        netPrice: Number(row.netPrice)
      })),
      status: req.body.status === "Draft" ? "Draft" : "Pending"
    });
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save the request. Check server logs." });
  }
});

app.patch("/api/requests/:id/status", async (req, res) => {
  try {
    const status = req.body.status;
    if (!["Accepted", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({ message: "Status must be Accepted, Rejected or Pending." });
    }
    const request = await PurchaseRequest.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!request) return res.status(404).json({ message: "Request not found." });
    res.json(request);
  } catch (err) {
    res.status(400).json({ message: "Could not update request status." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI. Copy .env.example to .env and add your Atlas connection string.");
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas.");
    app.listen(PORT, () => console.log(`App running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}
start();
