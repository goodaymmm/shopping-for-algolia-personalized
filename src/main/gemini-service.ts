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
Analyze this product image and generate search keywords and category.

User query: "${userQuery}"

Provide response in this format:
CATEGORY: [electronics|fashion|books|home|sports|beauty|food|general]
KEYWORDS: [3-5 keywords under 50 characters total]

Examples:
CATEGORY: fashion
KEYWORDS: Nike sneakers black

CATEGORY: electronics  
KEYWORDS: iPhone smartphone Apple

Focus on brand, product type, key features. Keep keywords concise and searchable.
    `;
  }

  private parseAnalysisResult(analysisText: string): ImageAnalysis {
    this.logger.info('Gemini', 'Parsing analysis result', {
      rawTextLength: analysisText.length,
      rawTextPreview: analysisText.substring(0, 300) + '...'
    });
    
    try {
      // Parse structured response with category and keywords
      const lines = analysisText.trim().split('\n');
      let category = 'general';
      let keywords: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('CATEGORY:')) {
          const categoryMatch = trimmedLine.match(/CATEGORY:\s*(\w+)/i);
          if (categoryMatch) {
            category = categoryMatch[1].toLowerCase();
          }
        } else if (trimmedLine.startsWith('KEYWORDS:')) {
          const keywordsMatch = trimmedLine.match(/KEYWORDS:\s*(.+)/i);
          if (keywordsMatch) {
            keywords = keywordsMatch[1].trim().split(/\s+/).filter(word => word.length > 0);
          }
        }
      }

      // Fallback: if structured parsing fails, try simple text parsing
      if (keywords.length === 0) {
        this.logger.warn('Gemini', 'Structured parsing failed, trying simple parsing');
        keywords = analysisText.trim().split(/\s+/).filter(word => 
          word.length > 0 && !word.toLowerCase().includes('category') && !word.toLowerCase().includes('keywords')
        );
      }

      // Ensure keywords are under 50 characters total
      const keywordString = keywords.join(' ');
      if (keywordString.length > 50) {
        keywords = keywords.slice(0, 3); // Reduce to top 3 keywords if too long
      }
      
      this.logger.info('Gemini', 'Extracted category and keywords from response', {
        category: category,
        keywordCount: keywords.length,
        keywords: keywords,
        totalKeywordLength: keywords.join(' ').length
      });
      
      if (keywords.length === 0) {
        this.logger.warn('Gemini', 'No keywords found in API response');
        throw new Error('No keywords found in response');
      }

      // Return simplified analysis with focus on search keywords and category
      const result = {
        style: '',
        colors: [],
        materials: [],
        occasion: '',
        priceRange: '',
        category: category,
        confidence: 0.9,
        searchKeywords: keywords,
        description: `Image analysis: ${keywords.join(', ')}`
      };
      
      this.logger.info('Gemini', 'Successfully parsed analysis result', {
        category: result.category,
        keywordCount: result.searchKeywords.length,
        totalKeywordLength: result.searchKeywords.join(' ').length,
        confidence: result.confidence
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