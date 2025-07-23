export interface ParsedConstraints {
  priceRange?: {
    min?: number;
    max?: number;
  };
  colors?: string[];
  styles?: string[];
  sizes?: string[];
  gender?: 'men' | 'women' | 'unisex';
  otherConstraints?: string[];
  productKeywords?: string[];
}

export class NaturalLanguageParser {
  // Common color terms
  private readonly colorTerms = [
    'white', 'black', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 
    'gray', 'grey', 'brown', 'orange', 'navy', 'beige', 'cream', 'tan',
    'gold', 'silver', 'metallic', 'multicolor', 'dark', 'light', 'bright'
  ];

  // Style descriptors
  private readonly styleTerms = [
    'casual', 'formal', 'sport', 'sporty', 'athletic', 'elegant', 'classic',
    'modern', 'vintage', 'retro', 'minimalist', 'luxury', 'professional',
    'comfortable', 'stylish', 'trendy', 'traditional', 'similar style'
  ];

  // Size terms
  private readonly sizeTerms = [
    'small', 'medium', 'large', 'xl', 'xxl', 'xs', 'size',
    '6', '7', '8', '9', '10', '11', '12', '13' // Common shoe sizes
  ];

  // Gender indicators
  private readonly genderTerms = {
    men: ['men', 'mens', "men's", 'male', 'guy', 'boys'],
    women: ['women', 'womens', "women's", 'female', 'ladies', 'girls'],
    unisex: ['unisex', 'both', 'anyone']
  };

  // Product keywords that should be used for search
  private readonly productKeywords = [
    'shoes', 'sneakers', 'boots', 'shirt', 'pants', 'jacket', 'dress',
    'phone', 'laptop', 'computer', 'tv', 'television', 'camera', 'headphones',
    'watch', 'bag', 'backpack', 'accessories', 'jewelry', 'sunglasses'
  ];

  /**
   * Parse natural language query and extract constraints
   */
  parse(query: string): ParsedConstraints {
    const lowerQuery = query.toLowerCase();
    const result: ParsedConstraints = {};

    // Extract price constraints
    const priceRange = this.extractPriceRange(lowerQuery);
    if (priceRange) {
      result.priceRange = priceRange;
    }

    // Extract colors
    const colors = this.extractColors(lowerQuery);
    if (colors.length > 0) {
      result.colors = colors;
    }

    // Extract styles
    const styles = this.extractStyles(lowerQuery);
    if (styles.length > 0) {
      result.styles = styles;
    }

    // Extract sizes
    const sizes = this.extractSizes(lowerQuery);
    if (sizes.length > 0) {
      result.sizes = sizes;
    }

    // Extract gender
    const gender = this.extractGender(lowerQuery);
    if (gender) {
      result.gender = gender;
    }

    // Extract product keywords
    const keywords = this.extractProductKeywords(lowerQuery);
    if (keywords.length > 0) {
      result.productKeywords = keywords;
    }

    // Extract other constraints (things that don't fit other categories)
    const otherConstraints = this.extractOtherConstraints(lowerQuery);
    if (otherConstraints.length > 0) {
      result.otherConstraints = otherConstraints;
    }

    return result;
  }

  /**
   * Extract price range from query
   */
  private extractPriceRange(query: string): { min?: number; max?: number } | null {
    const patterns = [
      // "under $100", "less than $50"
      /(?:under|less than|below|cheaper than|max|maximum)\s*\$?\s*(\d+)/i,
      // "over $50", "more than $100"
      /(?:over|more than|above|minimum|min|at least)\s*\$?\s*(\d+)/i,
      // "$50-$100", "$50 to $100"
      /\$?\s*(\d+)\s*(?:-|to)\s*\$?\s*(\d+)/i,
      // "between $50 and $100"
      /between\s*\$?\s*(\d+)\s*and\s*\$?\s*(\d+)/i,
      // "around $50", "about $100"
      /(?:around|about|approximately)\s*\$?\s*(\d+)/i
    ];

    let min: number | undefined;
    let max: number | undefined;

    // Check for upper limit patterns
    const upperMatch = query.match(patterns[0]);
    if (upperMatch) {
      max = parseInt(upperMatch[1]);
    }

    // Check for lower limit patterns
    const lowerMatch = query.match(patterns[1]);
    if (lowerMatch) {
      min = parseInt(lowerMatch[1]);
    }

    // Check for range patterns
    const rangeMatch = query.match(patterns[2]) || query.match(patterns[3]);
    if (rangeMatch) {
      min = parseInt(rangeMatch[1]);
      max = parseInt(rangeMatch[2]);
    }

    // Check for approximate patterns
    const approxMatch = query.match(patterns[4]);
    if (approxMatch && !min && !max) {
      const value = parseInt(approxMatch[1]);
      min = Math.floor(value * 0.8);
      max = Math.ceil(value * 1.2);
    }

    return (min !== undefined || max !== undefined) ? { min, max } : null;
  }

  /**
   * Extract color terms from query
   */
  private extractColors(query: string): string[] {
    const words = query.split(/\s+/);
    const colors: string[] = [];

    for (const word of words) {
      if (this.colorTerms.includes(word.toLowerCase())) {
        colors.push(word.toLowerCase());
      }
    }

    // Check for compound colors like "dark blue", "light gray"
    const compoundColorPattern = /(?:dark|light|bright)\s+(?:blue|gray|grey|green|red|brown)/gi;
    const compoundMatches = query.match(compoundColorPattern);
    if (compoundMatches) {
      colors.push(...compoundMatches.map(c => c.toLowerCase()));
    }

    return [...new Set(colors)]; // Remove duplicates
  }

  /**
   * Extract style terms from query
   */
  private extractStyles(query: string): string[] {
    const styles: string[] = [];

    for (const style of this.styleTerms) {
      if (query.includes(style)) {
        styles.push(style);
      }
    }

    return styles;
  }

  /**
   * Extract size information from query
   */
  private extractSizes(query: string): string[] {
    const sizes: string[] = [];
    const words = query.split(/\s+/);

    // Check for explicit size terms
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      
      // Check for "size X" pattern
      if (word === 'size' && i + 1 < words.length) {
        sizes.push(words[i + 1]);
      }
      
      // Check for standalone size terms
      if (this.sizeTerms.includes(word)) {
        sizes.push(word);
      }
    }

    // Check for shoe size patterns
    const shoeSizePattern = /\b(size\s+)?(\d{1,2}(?:\.\d)?)\b/gi;
    const matches = query.match(shoeSizePattern);
    if (matches) {
      for (const match of matches) {
        const sizeMatch = match.match(/\d{1,2}(?:\.\d)?/);
        if (sizeMatch) {
          const size = parseFloat(sizeMatch[0]);
          if (size >= 4 && size <= 15) { // Common shoe size range
            sizes.push(sizeMatch[0]);
          }
        }
      }
    }

    return [...new Set(sizes)];
  }

  /**
   * Extract gender from query
   */
  private extractGender(query: string): 'men' | 'women' | 'unisex' | undefined {
    for (const [gender, terms] of Object.entries(this.genderTerms)) {
      for (const term of terms) {
        if (query.includes(term)) {
          return gender as 'men' | 'women' | 'unisex';
        }
      }
    }
    return undefined;
  }

  /**
   * Extract product keywords that should be used for search
   */
  private extractProductKeywords(query: string): string[] {
    const keywords: string[] = [];
    const words = query.split(/\s+/);

    for (const word of words) {
      if (this.productKeywords.includes(word.toLowerCase())) {
        keywords.push(word.toLowerCase());
      }
    }

    // Also extract brand names if they appear
    const commonBrands = [
      'Nike', 'Adidas', 'Apple', 'Samsung', 'Sony', 'Microsoft', 'Dell', 'HP',
      'Canon', 'Nikon', 'LG', 'Panasonic', 'Reebok', 'Puma', 'New Balance'
    ];

    for (const brand of commonBrands) {
      if (query.toLowerCase().includes(brand.toLowerCase())) {
        keywords.push(brand);
      }
    }

    return [...new Set(keywords)];
  }

  /**
   * Extract other constraints that don't fit into specific categories
   */
  private extractOtherConstraints(query: string): string[] {
    const constraints: string[] = [];

    // Quality indicators
    const qualityTerms = ['quality', 'durable', 'premium', 'cheap', 'affordable', 'budget'];
    for (const term of qualityTerms) {
      if (query.includes(term)) {
        constraints.push(term);
      }
    }

    // Condition
    if (query.includes('new') || query.includes('used') || query.includes('refurbished')) {
      constraints.push(query.includes('new') ? 'new' : query.includes('used') ? 'used' : 'refurbished');
    }

    // Shipping
    if (query.includes('free shipping') || query.includes('fast shipping')) {
      constraints.push(query.includes('free') ? 'free shipping' : 'fast shipping');
    }

    return constraints;
  }

  /**
   * Remove constraint terms from the original query to get clean search terms
   */
  cleanQuery(query: string, constraints: ParsedConstraints): string {
    let cleanedQuery = query;

    // Remove price-related terms
    const pricePatterns = [
      /(?:under|less than|below|cheaper than|max|maximum|over|more than|above|minimum|min|at least|around|about|approximately|between)\s*\$?\s*\d+(?:\s*(?:and|to|-)\s*\$?\s*\d+)?/gi,
      /\$\s*\d+(?:\s*(?:to|-)\s*\$?\s*\d+)?/gi
    ];

    for (const pattern of pricePatterns) {
      cleanedQuery = cleanedQuery.replace(pattern, '');
    }

    // Remove extracted colors, styles, sizes, gender terms
    const allTermsToRemove = [
      ...(constraints.colors || []),
      ...(constraints.styles || []),
      ...(constraints.sizes || []),
      ...(constraints.otherConstraints || [])
    ];

    if (constraints.gender) {
      const genderTerms = this.genderTerms[constraints.gender];
      allTermsToRemove.push(...genderTerms);
    }

    // Remove size patterns
    cleanedQuery = cleanedQuery.replace(/\bsize\s+\S+/gi, '');

    // Remove each term
    for (const term of allTermsToRemove) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      cleanedQuery = cleanedQuery.replace(regex, '');
    }

    // Remove common filler words
    const fillerWords = ['for', 'with', 'that', 'has', 'have', 'similar', 'like', 'style', 'looking', "i'm", 'find', 'one', 'can', 'you'];
    for (const word of fillerWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleanedQuery = cleanedQuery.replace(regex, '');
    }

    // Clean up extra spaces and punctuation
    cleanedQuery = cleanedQuery
      .replace(/[.,!?]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleanedQuery;
  }
}