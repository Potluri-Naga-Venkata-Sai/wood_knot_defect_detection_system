# 🪵 How to Run This Project (Step-by-Step Guide)

Follow these simple steps whenever you open this project in the future.

---

## ⚡ Method 1: The 1-Click Fast Method (Recommended)

Whenever you open the project in your terminal, simply run:

```bash
cd /Users/pnvsai/Projects/wood_project
./run.sh
```

> **What this does:** Automatically launches the backend server on port `8000` and opens **http://127.0.0.1:8000** in your default web browser!

---

## 🛠️ Method 2: Standard Step-by-Step Manual Method

If you prefer to run each step manually:

### Step 1: Open Your Terminal
Open the **Terminal** app on your Mac (or open the integrated terminal in your code editor / IDE with `Ctrl + ~`).

### Step 2: Navigate to the Project Folder
Type the following command and press **Enter**:
```bash
cd /Users/pnvsai/Projects/wood_project
```

### Step 3: (First Time or if packages are missing) Install Dependencies
Ensure all required Python packages are installed:
```bash
python3 -m pip install -r backend/requirements.txt
```

### Step 4: Start the FastAPI Backend Server
Run this command to start Uvicorn:
```bash
python3 -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

You will see terminal output similar to this:
```text
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Step 5: Open the Web Application
Open Google Chrome, Safari, or any browser and navigate to:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

*(Alternatively, you can double-click and open `frontend/index.html` directly in your browser).*

---

## 🛑 How to Stop the Application

When you are done testing or working on the project:
1. Go to the terminal window running the server.
2. Press **`Ctrl + C`** on your keyboard.
3. The server will shut down gracefully.

---

## 🧪 Quick Test Checklist in the Browser

1. Look at the top right header: The status dot should be **green** showing **"Backend Online"**.
2. Under **Quick Test Samples**, click any of the 5 defect buttons:
   - **Sound Knot** → Classifies as **Sound Knot** (~74% confidence)
   - **Dead Knot** → Classifies as **Dead Knot** (~79% confidence)
   - **Crack** → Classifies as **Crack** (~89% confidence)
   - **Pin Hole** → Classifies as **Pin Hole** (~59% confidence)
   - **Rot / Decay** → Classifies as **Rot / Decay** (~83% confidence)
3. Or drag and drop any wooden surface photo from your computer and click **"Predict Defect"**.

---

## ❓ Troubleshooting & FAQs

### Problem: `Address already in use` (Port 8000 is occupied)
If port 8000 is occupied from a previously running process, free it with:
```bash
kill -9 $(lsof -ti:8000)
```
Then start the server again:
```bash
python3 -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### Problem: Browser says `Backend Offline`
Make sure you ran the `uvicorn backend.main:app` command in **Step 4** and that the terminal window remains open while using the browser.
