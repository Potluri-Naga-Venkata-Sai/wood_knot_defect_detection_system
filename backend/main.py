import io
import json
import os
import time
from typing import Dict, Any

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from PIL import Image
import torch
import torch.nn as nn
from torchvision import models, transforms

# ---------------------------------------------------------------------------
# Application Initialization & Setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Wood Timber Defect Sorting API",
    description="Automated Surface Knot & Decay Defect Classification with MobileNetV3-Large",
    version="1.0.0",
)

# Enable CORS for seamless interaction from local HTML frontends or web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Path Resolution & Configurations
# ---------------------------------------------------------------------------
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)


def resolve_path(filename: str) -> str:
    """Find file in backend directory or project root."""
    backend_path = os.path.join(CURRENT_DIR, filename)
    if os.path.exists(backend_path):
        return backend_path
    root_path = os.path.join(PROJECT_ROOT, filename)
    if os.path.exists(root_path):
        return root_path
    raise FileNotFoundError(f"Configuration or weights file '{filename}' could not be found.")


# Load configurations
CLASS_CONFIG_PATH = resolve_path("class_config.json")
MODEL_CONFIG_PATH = resolve_path("model_config.json")
MODEL_WEIGHTS_PATH = resolve_path("best_model.pth")

with open(CLASS_CONFIG_PATH, "r") as f:
    class_config = json.load(f)

with open(MODEL_CONFIG_PATH, "r") as f:
    model_config = json.load(f)

CLASS_NAMES = class_config.get("class_names", [
    "sound_knot",
    "dead_knot",
    "crack",
    "pin_hole",
    "rot_decay"
])
NUM_CLASSES = class_config.get("num_classes", len(CLASS_NAMES))

# Friendly human-readable names and defect characterization
DEFECT_METADATA = {
    "sound_knot": {
        "display_name": "Sound Knot",
        "description": "An intergrown knot formed by living branches, firmly bonded to the wood fiber matrix.",
        "severity": "Low to Moderate",
        "status": "Structurally stable for framing; suitable for standard grade timber.",
        "color": "#388e3c"
    },
    "dead_knot": {
        "display_name": "Dead Knot",
        "description": "An encased, loose, or bark-ringed knot formed from dead branches; lacks tissue cohesion.",
        "severity": "Moderate to High",
        "status": "Risk of dislodgement and stress concentration; inspect before structural use.",
        "color": "#d97706"
    },
    "crack": {
        "display_name": "Crack",
        "description": "Longitudinal split or check resulting from uneven drying shrinkage or mechanical stress.",
        "severity": "High",
        "status": "Significantly impairs tensile & shear strength; reject for load-bearing members.",
        "color": "#dc2626"
    },
    "pin_hole": {
        "display_name": "Pin Hole",
        "description": "Small circular perforations (< 2mm) caused by ambrosia beetles or wood-boring insects.",
        "severity": "Moderate",
        "status": "Assess infestation activity; requires drying or chemical treatment if active.",
        "color": "#0284c7"
    },
    "rot_decay": {
        "display_name": "Rot / Decay",
        "description": "Severe cellular breakdown and fungal decomposition of wood cellulose and lignin.",
        "severity": "Critical",
        "status": "Severe structural loss; immediately cull or discard affected wood stock.",
        "color": "#7c2d12"
    }
}

# ---------------------------------------------------------------------------
# Device & Model Architecture Initialization
# ---------------------------------------------------------------------------
# Requirement: Use CPU if CUDA is unavailable
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def create_model() -> nn.Module:
    """
    Recreates the exact MobileNetV3-Large classifier architecture used during training
    and loads the saved state dictionary.
    """
    # Instantiate base MobileNetV3-Large
    model = models.mobilenet_v3_large(weights=None)
    
    # In torchvision's mobilenet_v3_large, classifier is:
    # (0): Linear(in_features=960, out_features=1280)
    # (1): Hardswish()
    # (2): Dropout(p=0.2, inplace=True)
    # (3): Linear(in_features=1280, out_features=1000)
    #
    # Replaced layer 3 with Linear(1280, NUM_CLASSES)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, NUM_CLASSES)
    
    # Load trained state dictionary safely
    state_dict = torch.load(MODEL_WEIGHTS_PATH, map_location=device)
    model.load_state_dict(state_dict)
    
    # Set to evaluation mode
    model.to(device)
    model.eval()
    return model

# Load model once on startup
try:
    classifier_model = create_model()
    model_loaded = True
except Exception as e:
    classifier_model = None
    model_loaded = False
    model_load_error = str(e)
    print(f"Error loading model weights: {e}")

# ---------------------------------------------------------------------------
# Image Preprocessing Transform
# ---------------------------------------------------------------------------
# Requirement: Resize to 224x224, convert to tensor, apply ImageNet normalization
INPUT_SIZE = model_config.get("input_size", 224)
preprocess_transform = transforms.Compose([
    transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check() -> Dict[str, Any]:
    """
    Health check endpoint to verify backend status, model readiness,
    and runtime environment details.
    """
    return {
        "status": "healthy" if model_loaded else "unhealthy",
        "service": "Wood Timber Defect Classification API",
        "model_loaded": model_loaded,
        "device": str(device),
        "architecture": model_config.get("architecture", "MobileNetV3_Large"),
        "input_size": INPUT_SIZE,
        "num_classes": NUM_CLASSES,
        "classes": CLASS_NAMES,
    }


@app.post("/predict")
async def predict_defect(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Predict wood timber surface defect from an uploaded image.
    Performs validation, preprocessing, PyTorch inference, and returns
    class probabilities and defect analysis.
    """
    if not model_loaded or classifier_model is None:
        raise HTTPException(
            status_code=500,
            detail="The deep learning model failed to load. Please inspect the server logs."
        )

    # Validate content type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload a valid image file (JPG, PNG, WebP, etc.)."
        )

    try:
        # Read uploaded image bytes
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file uploaded. Please select a valid timber surface image."
            )

        # Open and ensure 3-channel RGB image
        try:
            pil_image = Image.open(io.BytesIO(image_bytes))
            pil_image = pil_image.convert("RGB")
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Could not decode the image file. Ensure it is a non-corrupted image."
            )

        # Preprocess image into tensor
        start_time = time.perf_counter()
        input_tensor = preprocess_transform(pil_image)
        input_tensor = input_tensor.unsqueeze(0).to(device)  # Add batch dimension [1, 3, 224, 224]

        # PyTorch Inference with no_grad
        with torch.no_grad():
            logits = classifier_model(input_tensor)
            probabilities_tensor = torch.softmax(logits, dim=1)[0]

        inference_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Convert probabilities to Python list
        probs = probabilities_tensor.cpu().numpy().tolist()

        # Determine predicted defect class
        predicted_index = int(torch.argmax(probabilities_tensor).item())
        predicted_class_key = CLASS_NAMES[predicted_index]
        predicted_confidence = float(probs[predicted_index])

        # Construct probabilities dictionary and formatted list
        probabilities_dict = {}
        probabilities_list = []

        for idx, class_key in enumerate(CLASS_NAMES):
            prob = float(probs[idx])
            meta = DEFECT_METADATA.get(class_key, {
                "display_name": class_key.replace("_", " ").title(),
                "description": "",
                "severity": "Unknown",
                "status": "",
                "color": "#64748b"
            })
            probabilities_dict[class_key] = round(prob, 4)
            probabilities_list.append({
                "index": idx,
                "key": class_key,
                "display_name": meta["display_name"],
                "probability": round(prob, 4),
                "confidence_percentage": round(prob * 100, 2),
                "severity": meta["severity"],
                "color": meta["color"]
            })

        # Top prediction details
        top_meta = DEFECT_METADATA.get(predicted_class_key, {
            "display_name": predicted_class_key.replace("_", " ").title(),
            "description": "Timber surface defect detected.",
            "severity": "Standard",
            "status": "Review recommended.",
            "color": "#388e3c"
        })

        return {
            "success": True,
            "filename": file.filename,
            "prediction": {
                "class_index": predicted_index,
                "class_key": predicted_class_key,
                "display_name": top_meta["display_name"],
                "confidence": round(predicted_confidence, 4),
                "confidence_percentage": round(predicted_confidence * 100, 2),
                "severity": top_meta["severity"],
                "description": top_meta["description"],
                "industrial_recommendation": top_meta["status"],
                "color": top_meta["color"]
            },
            "probabilities": probabilities_dict,
            "probabilities_breakdown": probabilities_list,
            "inference_time_ms": inference_time_ms,
            "device": str(device)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference error occurred: {str(e)}"
        )


# ---------------------------------------------------------------------------
# Static Files & Frontend Serving (Convenience & unified access)
# ---------------------------------------------------------------------------
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
if os.path.exists(FRONTEND_DIR):
    @app.api_route("/", methods=["GET", "HEAD"])
    def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.api_route("/style.css", methods=["GET", "HEAD"])
    def serve_css():
        return FileResponse(os.path.join(FRONTEND_DIR, "style.css"))

    @app.api_route("/script.js", methods=["GET", "HEAD"])
    def serve_js():
        return FileResponse(os.path.join(FRONTEND_DIR, "script.js"))

    @app.api_route("/samples/{filename}", methods=["GET", "HEAD"])
    def serve_samples(filename: str):
        file_path = os.path.join(FRONTEND_DIR, "samples", filename)
        if os.path.exists(file_path):
            return FileResponse(file_path)
        raise HTTPException(status_code=404, detail="Sample file not found")


