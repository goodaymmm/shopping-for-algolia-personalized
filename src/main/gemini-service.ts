import { GoogleGenerativeAI } from '@google/generative-ai';
import { Logger } from './logger';

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
  private client: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  async initialize(apiKey: string): Promise<boolean> {
    try {
      this.logger.info('Gemini', 'Initializing service', {
        hasApiKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        keyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'None'
      });
      
      if (!apiKey || apiKey.trim() === '') {
        this.logger.error('Gemini', 'API key is empty or missing');
        return false;
      }

      this.apiKey = apiKey;
      this.client = new GoogleGenerativeAI(apiKey);
      
      this.logger.info('Gemini', 'Service initialized successfully', {
        clientCreated: !!this.client
      });
      
      return true;
    } catch (error) {
      this.logger.error('Gemini', 'Failed to initialize service', {
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    this.logger.info('Gemini', 'Starting connection test');
    
    if (!this.client) {
      this.logger.error('Gemini', 'Connection test failed: client not initialized');
      return false;
    }

    try {
      this.logger.info('Gemini', 'Sending test request to API');
      const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const response = await model.generateContent('Hello');
      const responseText = response.response.text();
      const success = responseText ? responseText.length > 0 : false;
      
      this.logger.info('Gemini', 'Connection test completed', {
        success,
        responseLength: responseText ? responseText.length : 0,
        responsePreview: responseText ? responseText.substring(0, 100) : 'No response'
      });
      
      return success;
    } catch (error) {
      this.logger.error('Gemini', 'Connection test failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
      return false;
    }
  }

  async analyzeImage(imageData: string, userQuery?: string): Promise<ImageAnalysis> {
    this.logger.info('Gemini', 'Starting image analysis', {
      hasImageData: !!imageData,
      imageDataLength: imageData ? imageData.length : 0,
      userQuery: userQuery || 'None',
      imageDataPrefix: imageData ? imageData.substring(0, 50) + '...' : 'None'
    });
    
    if (!this.client) {
      const error = 'Gemini client not initialized. Please set API key first.';
      this.logger.error('Gemini', error);
      throw new Error(error);
    }

    try {
      const prompt = this.buildAnalysisPrompt(userQuery || '');
      
      this.logger.info('Gemini', 'Prepared analysis request', {
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + '...',
        model: 'gemini-2.5-flash'
      });
      
      this.logger.info('Gemini', 'Sending image analysis request to API');
      const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const requestStartTime = Date.now();
      const response = await model.generateContent([
        {
          inlineData: {
            data: imageData,
            mimeType: 'image/jpeg'
          }
        },
        prompt
      ]);
      const requestDuration = Date.now() - requestStartTime;

      this.logger.info('Gemini', 'Received response from API', {
        requestDurationMs: requestDuration,
        hasResponse: !!response,
        hasResponseText: !!response.response?.text
      });
      
      const analysisText = response.response.text();
      
      this.logger.info('Gemini', 'Processing API response', {
        responseTextLength: analysisText ? analysisText.length : 0,
        responsePreview: analysisText ? analysisText.substring(0, 200) + '...' : 'No response text'
      });

      const result = this.parseAnalysisResult(analysisText || '');
      
      this.logger.info('Gemini', 'Image analysis completed successfully', {
        resultKeywordsCount: result.searchKeywords.length,
        keywords: result.searchKeywords,
        confidence: result.confidence
      });
      
      return result;
    } catch (error) {
      this.logger.error('Gemini', 'Image analysis failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name,
        userQuery,
        hasImageData: !!imageData
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
    this.logger.info('Gemini', 'Parsing analysis result', {
      rawTextLength: analysisText.length,
      rawTextPreview: analysisText.substring(0, 300) + '...'
    });
    
    try {
      // Parse keywords from simple text response
      const keywords = analysisText.trim().split(/\s+/).filter(word => word.length > 0);
      
      this.logger.info('Gemini', 'Extracted keywords from response', {
        keywordCount: keywords.length,
        keywords: keywords.slice(0, 10), // Log first 10 keywords
        allKeywords: keywords
      });
      
      if (keywords.length === 0) {
        this.logger.warn('Gemini', 'No keywords found in API response');
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
      
      this.logger.info('Gemini', 'Successfully parsed analysis result', {
        resultConfidence: result.confidence,
        keywordCount: result.searchKeywords.length,
        description: result.description
      });
      
      return result;
    } catch (error) {
      this.logger.error('Gemini', 'Failed to parse analysis result', {
        error: (error as Error).message,
        rawText: analysisText,
        rawTextLength: analysisText.length
      });
      
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
      
      this.logger.warn('Gemini', 'Using fallback result due to parsing failure', {
        fallbackResult
      });
      
      return fallbackResult;
    }
  }
}