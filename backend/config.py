import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Thresholds for escalation
    ESCALATION_FRUSTRATION_THRESHOLD = float(os.getenv("ESCALATION_FRUSTRATION_THRESHOLD", 4.0))
    ESCALATION_RECURRENCE_THRESHOLD = int(os.getenv("ESCALATION_RECURRENCE_THRESHOLD", 2))
    
    # Prompt behavior thresholds
    FRUSTRATION_EMPATHY_THRESHOLD = float(os.getenv("FRUSTRATION_EMPATHY_THRESHOLD", 3.5))

config = Config()
