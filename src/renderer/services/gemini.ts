import { GoogleGenAI } from '@google/genai';

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
      // Simple test with minimal token usage
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
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

      const analysisText = response.text || '';

      return this.parseAnalysisResult(analysisText);
    } catch (error) {
      console.error('Gemini image analysis failed:', error);
      throw error;
    }
  }

  private buildAnalysisPrompt(userQuery: string): string {
    return `
画像に写っている商品を分析し、オンラインショッピングで類似商品を検索するための最適なキーワードを生成してください。

ユーザーのリクエスト: "${userQuery}"

以下の形式で検索キーワードを5〜10個提供してください：
- 商品のタイプ（例：スニーカー、ランニングシューズ、ブーツなど）
- スタイル（例：カジュアル、スポーティ、フォーマルなど）
- 色
- ブランド（識別可能な場合）
- 特徴的なデザイン要素

キーワードのみをスペース区切りで返してください。
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