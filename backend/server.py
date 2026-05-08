from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone

# --- Models ---
class MemoryEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MemoryCreate(BaseModel):
    content: str


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.post("/system/shutdown")
async def system_shutdown():
    logger.info("SYSTEM SHUTDOWN INITIATED")
    # For Windows: shutdown /s /t 5 (5 second delay to allow response to return)
    os.system("shutdown /s /t 5")
    return {"status": "shutdown_initiated"}

@api_router.post("/system/restart")
async def system_restart():
    logger.info("SYSTEM RESTART INITIATED")
    # For Windows: shutdown /r /t 5
    os.system("shutdown /r /t 5")
    return {"status": "restart_initiated"}

@api_router.post("/hardware/volume/up")
async def volume_up():
    os.system("powershell -Command \"(new-object -com wscript.shell).SendKeys([char]175)\"")
    return {"status": "volume_up"}

@api_router.post("/hardware/volume/down")
async def volume_down():
    os.system("powershell -Command \"(new-object -com wscript.shell).SendKeys([char]174)\"")
    return {"status": "volume_down"}

@api_router.post("/hardware/volume/mute")
async def volume_mute():
    os.system("powershell -Command \"(new-object -com wscript.shell).SendKeys([char]173)\"")
    return {"status": "volume_muted"}

@api_router.post("/hardware/brightness")
async def set_brightness(level: int):
    # level should be 0-100
    os.system(f"powershell -Command \"(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, {level})\"")
    return {"status": "brightness_set", "level": level}

@api_router.post("/memory", response_model=MemoryEntry)
async def add_memory(input: MemoryCreate):
    entry = MemoryEntry(content=input.content)
    doc = entry.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.memories.insert_one(doc)
    return entry

@api_router.get("/memory", response_model=List[MemoryEntry])
async def get_memories():
    memories = await db.memories.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    for m in memories:
        if isinstance(m['timestamp'], str):
            m['timestamp'] = datetime.fromisoformat(m['timestamp'])
    return memories

import psutil

@api_router.get("/system/status")
async def get_system_status():
    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory().percent
    battery = psutil.sensors_battery()
    battery_percent = battery.percent if battery else 100
    return {
        "cpu": cpu,
        "ram": ram,
        "battery": battery_percent,
        "temp": 40 + (cpu / 10) # Simulated temp based on CPU
    }

import pyautogui

@api_router.post("/system/screenshot")
async def take_screenshot():
    # Save to a temporary location or just trigger the action
    # For now, let's just trigger the Win+PrtSc or similar
    pyautogui.hotkey('win', 'prtsc')
    return {"status": "screenshot_taken"}

@api_router.post("/system/open")
async def open_app(app_name: str):
    apps = {
        "notepad": "notepad.exe",
        "calculator": "calc.exe",
        "settings": "start ms-settings:",
        "task manager": "taskmgr.exe",
        "chrome": "start chrome",
        "file explorer": "explorer.exe",
        "word": "start winword",
        "excel": "start excel",
        "powerpoint": "start powerpnt",
        "control panel": "start control"
    }
    cmd = apps.get(app_name.lower())
    if cmd:
        os.system(cmd)
        return {"status": "opened", "app": app_name}
    return {"status": "unknown_app"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()