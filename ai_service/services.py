import os
import logging
from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)

class AIEmailTransformer:
    """
    Service for transforming emails using AI
    """
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def transform_email(self, original_text, tone, context, intent, intensity):
        """
        Transform email text using OpenAI
        """
        word_count = len(original_text.split())
        
        transformed_text = self._transform_with_openai(
            original_text, tone, context, intent, intensity
        )
        
        return transformed_text, word_count
    
    def _transform_with_openai(self, original_text, tone, context, intent, intensity):
        """
        Transform email using OpenAI
        """
        try:
            # Create the prompt
            prompt = self._generate_prompt(
                original_text, tone, context, intent, intensity
            )
            
            # Call the OpenAI API
            response = self.client.chat.completions.create(
                model="gpt-4",  # Can be configured based on requirements
                messages=[
                    {"role": "system", "content": "You are an expert email writer who can transform emails into different tones while preserving the original meaning."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            return "Error in email transformation. Please try again."
    
    def _generate_prompt(self, original_text, tone, context, intent, intensity):
        """
        Generate a prompt for the AI based on user inputs
        """
        intensity_desc = ""
        if intensity == "1":
            intensity_desc = "a mild adjustment"
        elif intensity == "2":
            intensity_desc = "a moderate adjustment"
        elif intensity == "3":
            intensity_desc = "a significant adjustment"
        elif intensity == "4":
            intensity_desc = "a strong adjustment"
        elif intensity == "5":
            intensity_desc = "a complete transformation"
        
        prompt = f"""
        Transform the following email to have a {tone.lower()} tone.
        
        CONTEXT: This is a {context.lower()} email.
        INTENT: The purpose is to {intent.lower()}.
        INTENSITY: Make {intensity_desc} to the tone.
        
        Original email:
        {original_text}
        
        Please rewrite the email maintaining the same meaning, but with the requested tone adjustments.
        Only return the transformed email text without additional commentary.
        """
        
        return prompt 