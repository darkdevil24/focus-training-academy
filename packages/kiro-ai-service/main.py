from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="Kiro AI Service",
    description="AI coaching and training plan generation for Focus Training Academy",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:3000", "https://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Kiro AI Service is running"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "kiro-ai"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)