import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { app } from 'electron';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class AlgoliaMCPClient {
  private mcpProcess?: ChildProcess;
  private requestId = 0;
  private pendingRequests = new Map<number | string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }>();
  private isInitialized = false;
  private applicationId?: string;
  private rl?: readline.Interface;

  async initialize(applicationId: string, apiKey: string) {
    if (this.isInitialized) {
      console.log('[AlgoliaMCP Client] Already initialized');
      return;
    }

    this.applicationId = applicationId;
    
    // Determine the path to the MCP executable
    const mcpPath = this.getMCPExecutablePath();
    console.log('[AlgoliaMCP Client] MCP executable path:', mcpPath);
    
    try {
      // Start the MCP server process with credentials
      if (process.platform === 'win32') {
        // Windows: Execute according to official Algolia MCP Server README Development section
        const appTsPath = path.join(
          path.dirname(mcpPath), 
          'algolia-mcp-source', 
          'src', 
          'app.ts'
        );
        
        // Use system Node.js (not Electron's) with exact command line from official README
        this.mcpProcess = spawn('node', [
          '--experimental-strip-types',
          '--no-warnings=ExperimentalWarning',
          appTsPath,
          'start-server',
          '--credentials', `${applicationId}:${apiKey}`,
          '--allow-tools', 'getUserInfo,getApplications,listIndices,searchSingleIndex,saveObject,setSettings,getSettings'
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: path.join(path.dirname(mcpPath), 'algolia-mcp-source'),
          env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined } // Ensure pure Node.js environment
        });
      } else {
        // Other platforms: Direct execution
        this.mcpProcess = spawn(mcpPath, [
          'start-server',
          '--credentials', `${applicationId}:${apiKey}`,
          '--allow-tools', 'getUserInfo,getApplications,listIndices,searchSingleIndex,saveObject,setSettings,getSettings'
        ], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }

      // Set up readline interface for parsing JSON-RPC messages
      this.rl = readline.createInterface({
        input: this.mcpProcess.stdout!,
        crlfDelay: Infinity
      });

      // Handle incoming messages
      this.rl.on('line', (line) => {
        try {
          const message = JSON.parse(line) as MCPResponse;
          this.handleResponse(message);
        } catch (error) {
          console.error('[AlgoliaMCP Client] Failed to parse message:', line, error);
        }
      });

      // Handle stderr
      this.mcpProcess.stderr?.on('data', (data) => {
        console.error('[AlgoliaMCP Client] MCP Server stderr:', data.toString());
      });

      // Handle process exit
      this.mcpProcess.on('exit', (code, signal) => {
        console.log('[AlgoliaMCP Client] MCP process exited:', { code, signal });
        this.cleanup();
      });

      // Wait for initialization
      await this.waitForInitialization();
      
      this.isInitialized = true;
      console.log('[AlgoliaMCP Client] Successfully initialized');
      
    } catch (error) {
      console.error('[AlgoliaMCP Client] Failed to initialize:', error);
      this.cleanup();
      throw error;
    }
  }

  private getMCPExecutablePath(): string {
    const platform = process.platform;
    const isProduction = app.isPackaged;
    
    let mcpFileName = 'algolia-mcp';
    
    // Windows uses batch file that wraps Node.js implementation
    if (platform === 'win32') {
      mcpFileName = 'algolia-mcp.bat';
    }
    
    const mcpPath = isProduction
      ? path.join(process.resourcesPath, 'resources', 'algolia-mcp', mcpFileName)
      : path.join(__dirname, '..', '..', 'resources', 'algolia-mcp', mcpFileName);
    
    // Check if file exists and has reasonable size
    try {
      const stats = fs.statSync(mcpPath);
      if (stats.size < 100) {
        console.error(`[AlgoliaMCP Client] MCP executable too small (${stats.size} bytes): ${mcpPath}`);
        throw new Error(`Invalid MCP executable at ${mcpPath} (file size: ${stats.size} bytes)`);
      }
    } catch (error) {
      console.error('[AlgoliaMCP Client] MCP executable not found or invalid:', mcpPath);
      throw new Error(`MCP executable not found at ${mcpPath}`);
    }
    
    return mcpPath;
  }

  private async waitForInitialization(): Promise<void> {
    // Send initialize request
    const initResponse = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'shopping-for-algolia',
        version: '1.0.0'
      }
    });

    if (!initResponse) {
      throw new Error('Failed to initialize MCP connection');
    }

    // Send initialized notification
    await this.sendNotification('initialized', {});
  }

  private handleResponse(message: MCPResponse) {
    if (message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    }
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.mcpProcess || !this.mcpProcess.stdin) {
      throw new Error('MCP process not initialized');
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      const message = JSON.stringify(request) + '\n';
      this.mcpProcess!.stdin!.write(message);
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000); // 30 second timeout
    });
  }

  private async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.mcpProcess || !this.mcpProcess.stdin) {
      throw new Error('MCP process not initialized');
    }

    const notification = {
      jsonrpc: '2.0' as const,
      method,
      params
    };

    const message = JSON.stringify(notification) + '\n';
    this.mcpProcess.stdin.write(message);
  }

  async callTool(toolName: string, args: any): Promise<any> {
    const response = await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args
    });

    if (response?.content?.[0]?.text) {
      // Try to parse JSON response
      try {
        return JSON.parse(response.content[0].text);
      } catch {
        // Return as-is if not JSON
        return response.content[0].text;
      }
    }

    return response;
  }

  // Algolia-specific tool methods
  async searchSingleIndex(params: {
    indexName: string;
    query: string;
    hitsPerPage?: number;
    page?: number;
    facetFilters?: string[];
    numericFilters?: string[];
    filters?: string;
  }): Promise<any> {
    return this.callTool('searchSingleIndex', {
      applicationId: this.applicationId,
      indexName: params.indexName,
      requestBody: {
        query: params.query,
        hitsPerPage: params.hitsPerPage || 20,
        page: params.page || 0,
        facetFilters: params.facetFilters,
        numericFilters: params.numericFilters,
        filters: params.filters
      }
    });
  }

  async listIndices(): Promise<any> {
    return this.callTool('listIndices', {
      applicationId: this.applicationId
    });
  }

  async saveObject(indexName: string, object: any): Promise<any> {
    return this.callTool('saveObject', {
      applicationId: this.applicationId,
      indexName,
      requestBody: object
    });
  }

  async getSettings(indexName: string): Promise<any> {
    return this.callTool('getSettings', {
      applicationId: this.applicationId,
      indexName
    });
  }

  async setSettings(indexName: string, settings: any): Promise<any> {
    return this.callTool('setSettings', {
      applicationId: this.applicationId,
      indexName,
      requestBody: settings
    });
  }

  isConnected(): boolean {
    return this.isInitialized && this.mcpProcess !== undefined && !this.mcpProcess.killed;
  }

  cleanup() {
    if (this.rl) {
      this.rl.close();
    }
    
    if (this.mcpProcess && !this.mcpProcess.killed) {
      this.mcpProcess.kill();
    }
    
    this.mcpProcess = undefined;
    this.isInitialized = false;
    this.pendingRequests.clear();
  }
}