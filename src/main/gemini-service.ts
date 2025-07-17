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
      this.apiKey = apiKey;
      this.client = new GoogleGenAI({ apiKey });
      return true;
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: 'Hello'
      });
      return response.text ? response.text.length > 0 : false;
    } catch (error) {
      console.error('Gemini API connection test failed:', error);
      return false;
    }
  }

  async analyzeImage(imageData: string, userQuery?: string): Promise<ImageAnalysis> {
    if (!this.client) {
      throw new Error('Gemini client not initialized. Please set API key first.');
    }

    try {
      const prompt = this.buildAnalysisPrompt(userQuery || '');
      
      const response = await this.client.models.generateContent({
        model: 'gemini-2.0-flash-exp',
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

      const analysisText = response.text;

      return this.parseAnalysisResult(analysisText || '');
    } catch (error) {
      console.error('Gemini image analysis failed:', error);
      throw error;
    }
  }

  private buildAnalysisPrompt(userQuery: string): string {
    return `
Analyze this product image for e-commerce shopping. Extract the following information and respond in JSON format:

{
  "style": "product style (casual, formal, sporty, elegant, etc.)",
  "colors": ["dominant color 1", "color 2", "color 3"],
  "materials": ["material 1", "material 2"],
  "occasion": "suitable occasion (work, casual, party, outdoor, etc.)",
  "priceRange": "estimated price range (budget, mid-range, premium, luxury)",
  "category": "product category (clothing, shoes, electronics, home, accessories, etc.)",
  "confidence": 0.95,
  "searchKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "description": "Brief description of the product"
}

User's specific request: "${userQuery}"

Focus on:
1. Visual style and aesthetic
2. Color palette (up to 3 main colors)
3. Material/fabric if visible
4. Appropriate use context
5. Quality indicators for price estimation
6. Product categorization
7. Search-optimized keywords for product matching

Respond only with valid JSON.
    `;
  }

  private parseAnalysisResult(analysisText: string): ImageAnalysis {
    try {
      // Clean the response text to extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonString = jsonMatch[0];
      const parsed = JSON.parse(jsonString);

      // Validate and provide defaults
      return {
        style: parsed.style || 'casual',
        colors: Array.isArray(parsed.colors) ? parsed.colors.slice(0, 3) : ['gray'],
        materials: Array.isArray(parsed.materials) ? parsed.materials.slice(0, 2) : ['unknown'],
        occasion: parsed.occasion || 'casual',
        priceRange: parsed.priceRange || 'mid-range',
        category: parsed.category || 'general',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        searchKeywords: Array.isArray(parsed.searchKeywords) ? parsed.searchKeywords.slice(0, 5) : ['product'],
        description: parsed.description || 'Product image analysis'
      };
    } catch (error) {
      console.error('Failed to parse Gemini analysis result:', error);
      
      // Fallback analysis
      return {
        style: 'casual',
        colors: ['gray', 'black'],
        materials: ['unknown'],
        occasion: 'casual',
        priceRange: 'mid-range',
        category: 'general',
        confidence: 0.3,
        searchKeywords: ['product', 'item'],
        description: 'Analysis failed - using fallback data'
      };
    }
  }
}