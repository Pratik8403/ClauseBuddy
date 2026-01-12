import os
from fastapi import FastAPI
from supabase import create_client
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv() # Loads keys from your .env file

app = FastAPI()

# 1. Connect to Supabase
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# 2. Connect to Gemini AI
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

@app.get("/")
def read_root():
    return {"status": "ClauseBuddy Backend is Live!"}