/**
 * Spiritual Content API Integration
 * Handles external API calls to access Prabhupada's books dataset
 */

export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  sanskrit: string;
  translation: string;
  purport?: string;
  synonyms?: string;
}

export interface SearchResult {
  verses: Verse[];
  totalCount: number;
  query: string;
}

export interface BookInfo {
  title: string;
  chapters: number;
  description: string;
}

export class SpiritualAPI {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = process.env.SPIRITUAL_API_URL || '', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || process.env.SPIRITUAL_API_KEY;
  }

  /**
   * Search for verses by topic or keywords
   */
  async searchVerses(query: string, limit: number = 10): Promise<SearchResult> {
    try {
      const url = new URL(`${this.baseUrl}/search`);
      url.searchParams.set('q', query);
      url.searchParams.set('limit', limit.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        verses: data.verses || [],
        totalCount: data.totalCount || 0,
        query,
      };
    } catch (error) {
      console.error('Error searching verses:', error);
      throw new Error(`Failed to search verses: ${error.message}`);
    }
  }

  /**
   * Get a specific verse by book, chapter, and verse number
   */
  async getVerse(book: string, chapter: number, verse: number): Promise<Verse | null> {
    try {
      const url = `${this.baseUrl}/verse/${book}/${chapter}/${verse}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting verse:', error);
      throw new Error(`Failed to get verse: ${error.message}`);
    }
  }

  /**
   * Get book information
   */
  async getBookInfo(book: string): Promise<BookInfo | null> {
    try {
      const url = `${this.baseUrl}/book/${book}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting book info:', error);
      throw new Error(`Failed to get book info: ${error.message}`);
    }
  }

  /**
   * Get available books
   */
  async getAvailableBooks(): Promise<BookInfo[]> {
    try {
      const url = `${this.baseUrl}/books`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.books || [];
    } catch (error) {
      console.error('Error getting available books:', error);
      throw new Error(`Failed to get available books: ${error.message}`);
    }
  }

  /**
   * Get chapter content
   */
  async getChapter(book: string, chapter: number): Promise<Verse[]> {
    try {
      const url = `${this.baseUrl}/chapter/${book}/${chapter}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.verses || [];
    } catch (error) {
      console.error('Error getting chapter:', error);
      throw new Error(`Failed to get chapter: ${error.message}`);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Check if the API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/health`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error('API availability check failed:', error);
      return false;
    }
  }
}

// Singleton instance
let spiritualAPIInstance: SpiritualAPI | null = null;

export function getSpiritualAPI(): SpiritualAPI {
  if (!spiritualAPIInstance) {
    const baseUrl = process.env.SPIRITUAL_API_URL;
    const apiKey = process.env.SPIRITUAL_API_KEY;

    if (!baseUrl) {
      throw new Error('SPIRITUAL_API_URL environment variable is required');
    }

    spiritualAPIInstance = new SpiritualAPI(baseUrl, apiKey);
  }
  return spiritualAPIInstance;
}