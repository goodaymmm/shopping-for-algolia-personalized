import { GoogleGenAI } from '@google/genai';

// Image analysis result interface (same as renderer)
export interface ImageAnalysis {
  style: string;
  colors: string[];
  materials: string[];
  occasion: string;
  priceRange: string;
  category: string;
  confidence: number;
  searchKeywords: string[];
  description: string;
}

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private apiKey: string | null = null;

  async initialize(apiKey: string): Promise<boolean> {
    try {
      console.log('[Gemini] Initializing with API key:', apiKey ? 'Present' : 'Missing');
      this.apiKey = apiKey;
      this.client = new GoogleGenAI({ apiKey });
      console.log('[Gemini] Successfully initialized');
      return true;
    } catch (error) {
      console.error('[Gemini] Failed to initialize:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    console.log('[Gemini] Testing connection...');
    if (!this.client) {
      console.log('[Gemini] Connection test failed: client not initialized');
      return false;
    }

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Hello'
      });
      const success = response.text ? response.text.length > 0 : false;
      console.log('[Gemini] Connection test result:', success ? 'Success' : 'Failed');
      return success;
    } catch (error) {
      console.error('[Gemini] Connection test failed:', error);
      return false;
    }
  }

  async analyzeImage(imageData: string, userQuery?: string): Promise<ImageAnalysis> {
    console.log('[Gemini] Starting image analysis...');
    console.log('[Gemini] User query:', userQuery || 'None');
    console.log('[Gemini] Image data length:', imageData ? imageData.length : 0);
    
    if (!this.client) {
      const error = 'Gemini client not initialized. Please set API key first.';
      console.error('[Gemini]', error);
      throw new Error(error);
    }

    try {
      const prompt = this.buildAnalysisPrompt(userQuery || '');
      console.log('[Gemini] Using prompt:', prompt);
      
      console.log('[Gemini] Sending request to Gemini API...');
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: imageData,
                  mimeType: 'image/jpeg'
                }
              },
              { text: prompt }
            ]
          }
        ]
      });

      console.log('[Gemini] Received response from API');
      const analysisText = response.text;
      console.log('[Gemini] Response text length:', analysisText ? analysisText.length : 0);

      return this.parseAnalysisResult(analysisText || '');
    } catch (error) {
      console.error('[Gemini] Image analysis failed:', error);
      console.error('[Gemini] Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
      throw error;
    }
  }

  private buildAnalysisPrompt(userQuery: string): string {
    return `
Analyze the product in this image and generate optimal search keywords for finding similar products in online shopping.

User's request: "${userQuery}"

Please provide 5-10 search keywords in the following format:
- Product type (e.g., sneakers, running shoes, boots, etc.)
- Style (e.g., casual, sporty, formal, etc.)
- Colors
- Brand (if identifiable)
- Distinctive design features

Return only the keywords separated by spaces.
    `;
  }

  private parseAnalysisResult(analysisText: string): ImageAnalysis {
    console.log('[Gemini] Raw analysis text:', analysisText);
    
    try {
      // Parse keywords from simple text response
      const keywords = analysisText.trim().split(/\s+/).filter(word => word.length > 0);
      
      console.log('[Gemini] Extracted keywords:', keywords);
      
      if (keywords.length === 0) {
        throw new Error('No keywords found in response');
      }

      // Return simplified analysis with focus on search keywords
      const result = {
        style: '',
        colors: [],
        materials: [],
        occasion: '',
        priceRange: '',
        category: '',
        confidence: 0.9,
        searchKeywords: keywords,
        description: `Image analysis: ${keywords.join(', ')}`
      };
      
      console.log('[Gemini] Parsed result:', result);
      return result;
    } catch (error) {
      console.error('[Gemini] Failed to parse analysis result:', error);
      
      // Return error state with no keywords
      const fallbackResult = {
        style: '',
        colors: [],
        materials: [],
        occasion: '',
        priceRange: '',
        category: '',
        confidence: 0,
        searchKeywords: [],
        description: 'Image analysis failed'
      };
      
      console.log('[Gemini] Using fallback result:', fallbackResult);
      return fallbackResult;
    }
  }
}