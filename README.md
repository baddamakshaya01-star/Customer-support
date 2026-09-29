# AI Customer Support Agent with Persistent Memory

A Microsoft Hackathon MVP project that demonstrates a customer support AI with long-term memory. It remembers past conversations, environment details, what solutions worked/failed, and tracks customer frustration to trigger human escalation.

## Architecture

```mermaid
graph TD
    UI[Frontend (HTML/JS/CSS)] <-->|REST API| FastAPI[FastAPI Backend]
    
    FastAPI <--> Agent[Agent Service]
    FastAPI <--> MemService[Memory Service]
    
    Agent -->|1. Fetch Context| MemService
    Agent -->|2. Generate Prompt| LLM[Azure OpenAI / OpenAI]
    Agent -->|3. Check Escalation| EscService[Escalation Service]
    Agent -->|4. Extract New Facts| LLM
    Agent -->|5. Save New Facts| MemService
    
    MemService <--> DB[(SQLite Database)]
```

## Setup Instructions

1. **Navigate to the backend directory**
   ```bash
   cd backend
   ```

2. **Create a virtual environment and install dependencies**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your `OPENAI_API_KEY` (or configure Azure OpenAI variables).

4. **Seed the Database**
   This generates 5 realistic demo customers with past tickets and memory facts.
   ```bash
   python seed_data.py
   ```

5. **Run the Backend Server**
   ```bash
   uvicorn main:app --reload
   ```
   The API will run at `http://localhost:8000`.

6. **Run the Frontend**
   - Open `frontend/index.html` in your browser. (No build step required, it's vanilla HTML/JS/CSS).

## Core Features Implemented
- **Context Assembly:** AI never asks for OS or plan because it's injected into the prompt.
- **Memory Extraction:** After each turn, the LLM analyzes the chat to extract new facts and update the frustration score.
- **Smart Escalation:** Automatically flags for human handoff if frustration is high or issues recur.
- **Dynamic UI:** Side panel updates live as memory facts are extracted.
