import os
from openai import OpenAI, AzureOpenAI
import json

class LLMService:
    def __init__(self):
        # Check if using Azure, Groq, or standard OpenAI
        self.use_azure = bool(os.getenv("AZURE_OPENAI_API_KEY"))
        self.use_groq = bool(os.getenv("GROQ_API_KEY"))
        
        if self.use_azure:
            api_key = os.getenv("AZURE_OPENAI_API_KEY")
            endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
            deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
            if not endpoint or not deployment:
                raise ValueError("AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT_NAME must be set if using Azure OpenAI")
            self.client = AzureOpenAI(
                api_key=api_key,
                api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
                azure_endpoint=endpoint
            )
            self.deployment_name = deployment
        elif self.use_groq:
            api_key = os.getenv("GROQ_API_KEY")
            self.client = OpenAI(
                api_key=api_key,
                base_url="https://api.groq.com/openai/v1"
            )
            self.model_name = os.getenv("GROQ_MODEL_NAME", "openai/gpt-oss-20b")
        else:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key or api_key == "your_api_key_here":
                raise ValueError("OPENAI_API_KEY environment variable is missing or invalid.")
            self.client = OpenAI(
                api_key=api_key
            )
            self.model_name = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini") # default to mini for speed/cost

    def get_chat_response(self, messages, max_tokens=500, temperature=0.7):
        kwargs = {
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        if self.use_azure:
            kwargs["model"] = self.deployment_name
        else:
            kwargs["model"] = self.model_name

        response = self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content

    def extract_structured_data(self, messages, response_format, max_tokens=500):
        # Using JSON mode. The prompt must instruct it to output JSON matching the format.
        kwargs = {
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.0, # Deterministic for data extraction
            "response_format": {"type": "json_object"}
        }
        if self.use_azure:
            kwargs["model"] = self.deployment_name
        else:
            kwargs["model"] = self.model_name
            
        response = self.client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {}

llm_service = LLMService()
