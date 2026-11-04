# Automated Wood Timber Surface Knot and Decay Defect Sorting System

A modern, responsive deep learning web application designed for automated lumber inspection and timber surface quality grading. Powered by a trained **MobileNetV3-Large** neural network, **FastAPI**, **PyTorch**, and **Chart.js**.

---

## 🌲 Overview

In timber processing and lumber manufacturing, automated defect sorting ensures structural integrity, optimizes grade yield, and eliminates manual inspection bottlenecks. This application provides real-time classification of timber surfaces across five industrial defect categories:

1. **Sound Knot**: Firmly intergrown branch junction; structurally stable for framing lumber.
2. **Dead Knot**: Loose or bark-encased knot with void gaps; risk of fallout and stress notches.
3. **Crack**: Longitudinal split/check caused by drying shrinkage or mechanical tension.
4. **Pin Hole**: Fine ambrosia beetle / wood-boring insect perforations (< 2 mm).
5. **Rot / Decay**: Cellular fungal breakdown of lignin and cellulose; severe structural compromise requiring immediate culling.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) | Vanilla CSS with wood-industry theme, responsive grid |
| **Data Visualization**| Chart.js 4.4 | Real-time five-class probability distribution bar chart |
| **Backend API** | FastAPI, Python 3.10+ | Asynchronous REST API, CORS-enabled, image validation |
| **Deep Learning** | PyTorch, Torchvision | MobileNetV3-Large classifier with trained weights |
| **ASGI Server** | Uvicorn | High-performance ASGI server on port 8000 |

---

## 📂 Project Directory Structure

```text
wood-defect-system/
├── backend/
│   ├── main.py              # FastAPI server, PyTorch model loader & /predict endpoint
│   ├── requirements.txt     # Python dependencies
│   ├── best_model.pth       # Trained PyTorch model weights (MobileNetV3-Large)
│   ├── class_config.json    # 5 Defect classes configuration
│   └── model_config.json    # Architecture & input tensor configuration (224x224)
├── frontend/
│   ├── index.html           # Modern dashboard with status badge & results cards
│   ├── style.css            # Responsive styles, cream & timber palette, micro-animations
│   ├── script.js            # API client with fetch(), status polling & Chart.js rendering
│   └── samples/             # Bundled sample images for 1-click test verification
│       ├── sample_sound_knot.jpg
│       ├── sample_dead_knot.jpg
│       ├── sample_crack.jpg
│       └── sample_rot_decay.jpg
└── README.md                # Installation and usage instructions
```

---

## 🚀 Quick Start Guide

### Step 1: Clone or Navigate to the Project

```bash
cd /path/to/wood_project
```

### Step 2: Set Up a Python Virtual Environment (Recommended)

```bash
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
```

### Step 3: Install Required Dependencies

Install the backend dependencies listed in `backend/requirements.txt`:

```bash
pip install -r backend/requirements.txt
```

*(Ensure `torch`, `torchvision`, `fastapi`, `uvicorn`, `pillow`, and `python-multipart` are installed).*

### Step 4: Start the FastAPI Backend Server

Run the Uvicorn server from the project root:

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

You should see:
```text
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Step 5: Launch the Frontend

You have two convenient options to access the dashboard:

#### Option A: Direct Web Server (Recommended)
Open your browser and navigate directly to:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

*(The FastAPI application automatically serves the frontend at the root URL).*

#### Option B: Standalone File / Live Server
Simply double-click or open `frontend/index.html` in any modern web browser, or serve it using VS Code Live Server. The frontend connects to the backend API via CORS at `http://127.0.0.1:8000`.

---

## 🧪 Testing the Application

1. **Verify Connection**: Check the status badge in the header; it will display a pulsating green indicator: **"Backend Online"**.
2. **Choose an Image**:
   - **Option 1**: Click on one of the **Quick Test Samples** at the bottom of the upload card (*Sound Knot*, *Dead Knot*, *Crack*, or *Rot / Decay*).
   - **Option 2**: Drag and drop any `.jpg`, `.png`, or `.webp` image into the upload box.
   - **Option 3**: Click **"Browse Image"** and choose a timber surface photo from your computer.
3. **Run Prediction**: Click the green **"Predict Defect"** button.
4. **Inspect Analysis**:
   - Primary defect name and color-coded severity.
   - Model confidence percentage and confidence gauge.
   - Industrial lumber grading / handling recommendation.
   - Interactive horizontal probability distribution chart across all 5 classes.
   - Inference latency timer (e.g. `45 ms`).
5. **Reset**: Click **"Upload Another Timber Surface"** to inspect another sample.

---

## 📡 API Reference

### 1. Health Check
- **Endpoint**: `GET /health`
- **Description**: Verifies backend availability, model status, and device info.
- **Response Example**:
```json
{
  "status": "healthy",
  "service": "Wood Timber Defect Classification API",
  "model_loaded": true,
  "device": "cpu",
  "architecture": "MobileNetV3_Large",
  "input_size": 224,
  "num_classes": 5,
  "classes": [
    "sound_knot",
    "dead_knot",
    "crack",
    "pin_hole",
    "rot_decay"
  ]
}
```

### 2. Defect Prediction
- **Endpoint**: `POST /predict`
- **Payload**: `multipart/form-data` with `file: [binary image]`
- **Curl Example**:
```bash
curl -X POST "http://127.0.0.1:8000/predict" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@frontend/samples/sample_dead_knot.jpg"
```
- **Response Example**:
```json
{
  "success": true,
  "filename": "sample_dead_knot.jpg",
  "prediction": {
    "class_index": 1,
    "class_key": "dead_knot",
    "display_name": "Dead Knot",
    "confidence": 0.8924,
    "confidence_percentage": 89.24,
    "severity": "Moderate to High",
    "description": "An encased, loose, or bark-ringed knot formed from dead branches; lacks tissue cohesion.",
    "industrial_recommendation": "Risk of dislodgement and stress concentration; inspect before structural use.",
    "color": "#d97706"
  },
  "probabilities": {
    "sound_knot": 0.0512,
    "dead_knot": 0.8924,
    "crack": 0.0341,
    "pin_hole": 0.0121,
    "rot_decay": 0.0102
  },
  "probabilities_breakdown": [
    {
      "index": 0,
      "key": "sound_knot",
      "display_name": "Sound Knot",
      "probability": 0.0512,
      "confidence_percentage": 5.12,
      "severity": "Low to Moderate",
      "color": "#2e7d32"
    },
    ...
  ],
  "inference_time_ms": 42.15,
  "device": "cpu"
}
```

---

## ⚙️ Model Architecture & Preprocessing

- **Backbone**: `torchvision.models.mobilenet_v3_large(weights=None)`
- **Classifier Head**:
  - `classifier[0]`: `Linear(in_features=960, out_features=1280)`
  - `classifier[1]`: `Hardswish()`
  - `classifier[2]`: `Dropout(p=0.2, inplace=True)`
  - `classifier[3]`: `Linear(in_features=1280, out_features=5)`
- **Preprocessing Pipeline**:
  ```python
  transforms.Compose([
      transforms.Resize((224, 224)),
      transforms.ToTensor(),
      transforms.Normalize(
          mean=[0.485, 0.456, 0.406],
          std=[0.229, 0.224, 0.225]
      )
  ])
  ```
- **Inference Mode**: `model.eval()`, `torch.no_grad()`, `softmax` over logits.
- **Hardware Acceleration**: Automatically selects CUDA if an NVIDIA GPU is detected; defaults gracefully to CPU.

---

## 🪵 Defect Grading Reference

| Defect Class | Physical Characteristics | Grading & Sorting Action |
| :--- | :--- | :--- |
| **Sound Knot** | Living branch junction intergrown with wood grain | Acceptable for framing and structural lumber |
| **Dead Knot** | Encased/loose knot ringed with bark/voids | Requires resin filling or cross-cutting trim |
| **Crack** | Longitudinal check / rupture along grain | Reject for load-bearing members |
| **Pin Hole** | Tiny perforations (< 2 mm) from beetles | Verify beetle inactivity; kiln heat-treat |
| **Rot / Decay** | Cellular fungal decay & crumbly discoloration | Immediate cull; discard from inventory |

---

## ❓ FAQ & Troubleshooting

- **Backend Status Shows "Backend Offline"**:
  Make sure Uvicorn is running in your terminal:
  ```bash
  uvicorn backend.main:app --reload --port 8000
  ```
- **Port 8000 is Already in Use**:
  Launch on another port (e.g. 8080):
  ```bash
  uvicorn backend.main:app --reload --port 8080
  ```
  *(Then open `http://127.0.0.1:8080` in your browser)*.
- **Can I change the API URL?**:
  Yes! In `frontend/script.js`, edit the `API_BASE_URL` constant on line 18.
