import { GoogleGenerativeAI } from '@google/generative-ai';

// Image analysis result interface
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
  private client: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;

  async initialize(apiKey: string): Promise<boolean> {
    try {
      this.apiKey = apiKey;
      this.client = new GoogleGenerativeAI(apiKey);
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
      // Simple test with minimal token usage
      const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const response = await model.generateContent('Hello');
      return response.response.text() ? response.response.text().length > 0 : false;
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
      
      const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const response = await model.generateContent([
        {
          inlineData: {
            data: imageData,
            mimeType: 'image/jpeg'
          }
        },
        prompt
      ]);

      const analysisText = response.response.text() || '';

      return this.parseAnalysisResult(analysisText);
    } catch (error) {
      console.error('Gemini image analysis failed:', error);
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
    try {
      // Parse keywords from simple text response
      const keywords = analysisText.trim().split(/\s+/).filter(word => word.length > 0);
      
      if (keywords.length === 0) {
        throw new Error('No keywords found in response');
      }

      // Return simplified analysis with focus on search keywords
      return {
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
    } catch (error) {
      console.error('Failed to parse Gemini analysis result:', error);
      
      // Return error state with no keywords
      return {
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
    }
  }

}