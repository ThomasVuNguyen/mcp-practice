# MCP Serper Server Setup

This MCP server provides web search and research capabilities using the Serper API.

## Prerequisites

1. **Get a Serper API Key**
   - Visit https://serper.dev/
   - Sign up for a free account
   - Get your API key (includes 2,500 free queries)

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your SERPER_API_KEY
   ```

3. **Build the server**
   ```bash
   npm run build
   ```

## Usage

### Running the server
```bash
npm start
```

### Development mode
```bash
npm run dev
```

## Available Tools

### 1. web_search
Search the web for current information and answers.

**Parameters:**
- `query` (required): The search query
- `num_results` (optional): Number of results (1-100, default: 10)
- `country` (optional): Country code for localized results
- `location` (optional): Location for localized results

**Example:**
```json
{
  "query": "latest AI developments 2024",
  "num_results": 5,
  "country": "us"
}
```

### 2. deep_research
Perform comprehensive research using multiple targeted search queries.

**Parameters:**
- `topic` (required): The research topic
- `depth` (optional): "basic" or "comprehensive" (default: "basic")
- `num_queries` (optional): Number of search queries (2-10, default: 3)

**Example:**
```json
{
  "topic": "renewable energy trends",
  "depth": "comprehensive",
  "num_queries": 5
}
```

## MCP Client Configuration

### Claude Desktop
Add this server to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "serper": {
      "command": "node",
      "args": ["path/to/mcp-serper-server/dist/index.js"],
      "env": {
        "SERPER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**Config file locations:**
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

### 5ire Configuration
For 5ire MCP client, use these settings:

**Tool Key:** `serper`

**Name:** `MCP Serper Server`

**Description:** `Web search and research server using Serper API for Google search results, answer boxes, and comprehensive multi-query research`

**Command:** `node C:\Users\frost\Documents\GitHub\mcp-practice\dist\index.js`
*(Replace with your actual path)*

**Environment Variables:**
```
SERPER_API_KEY=your_actual_api_key_here
```

**Alternative Commands:**
- Using npm: `npm start` (set working directory to project folder)
- Development mode: `npm run dev` (set working directory to project folder)

## Features

- **Fast Web Search**: Get Google search results in 1-2 seconds
- **Comprehensive Research**: Multi-query research with organized reports
- **Rich Results**: Includes answer boxes, knowledge graphs, and related searches
- **Localization**: Support for country and location-specific results
- **Error Handling**: Robust error handling and validation