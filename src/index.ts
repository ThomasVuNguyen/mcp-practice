#!/usr/bin/env node

import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { z } from "zod";

const SearchRequestSchema = z.object({
  query: z.string().describe("The search query"),
  num_results: z.number().min(1).max(100).default(10).describe("Number of results to return"),
  country: z.string().optional().describe("Country code for localized results (e.g., 'us', 'uk')"),
  location: z.string().optional().describe("Location for localized results"),
});

const ResearchRequestSchema = z.object({
  topic: z.string().describe("The research topic"),
  depth: z.enum(["basic", "comprehensive"]).default("basic").describe("Research depth level"),
  num_queries: z.number().min(2).max(10).default(3).describe("Number of different search queries to perform"),
});

interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
}

interface SerperResponse {
  organic?: SerperSearchResult[];
  answerBox?: {
    answer: string;
    title: string;
    link: string;
  };
  knowledgeGraph?: {
    title: string;
    type: string;
    description: string;
  };
  peopleAlsoAsk?: Array<{
    question: string;
    answer: string;
    link: string;
  }>;
  relatedSearches?: Array<{
    query: string;
  }>;
}

class SerperClient {
  private apiKey: string;
  private baseUrl = "https://google.serper.dev";

  constructor() {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      throw new Error("SERPER_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
  }

  async search(
    query: string,
    options: {
      num_results?: number;
      country?: string;
      location?: string;
    } = {}
  ): Promise<SerperResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/search`,
        {
          q: query,
          num: options.num_results || 10,
          ...(options.country && { gl: options.country }),
          ...(options.location && { location: options.location }),
        },
        {
          headers: {
            "X-API-KEY": this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Serper API error: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }
}

const server = new Server(
  {
    name: "mcp-serper-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const serperClient = new SerperClient();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "web_search",
        description: "Search the web using Serper API to find current information and answer questions",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query",
            },
            num_results: {
              type: "number",
              description: "Number of results to return (1-100, default: 10)",
              minimum: 1,
              maximum: 100,
              default: 10,
            },
            country: {
              type: "string",
              description: "Country code for localized results (e.g., 'us', 'uk')",
            },
            location: {
              type: "string",
              description: "Location for localized results",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "deep_research",
        description: "Perform comprehensive research on a topic using multiple search queries",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "The research topic",
            },
            depth: {
              type: "string",
              enum: ["basic", "comprehensive"],
              description: "Research depth level",
              default: "basic",
            },
            num_queries: {
              type: "number",
              description: "Number of different search queries to perform (2-10, default: 3)",
              minimum: 2,
              maximum: 10,
              default: 3,
            },
          },
          required: ["topic"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "web_search": {
        const parsed = SearchRequestSchema.parse(args);
        const results = await serperClient.search(parsed.query, {
          num_results: parsed.num_results,
          country: parsed.country,
          location: parsed.location,
        });

        let response = `# Search Results for "${parsed.query}"\n\n`;

        if (results.answerBox) {
          response += `## Answer Box\n**${results.answerBox.title}**\n${results.answerBox.answer}\n\nSource: ${results.answerBox.link}\n\n`;
        }

        if (results.knowledgeGraph) {
          response += `## Knowledge Graph\n**${results.knowledgeGraph.title}** (${results.knowledgeGraph.type})\n${results.knowledgeGraph.description}\n\n`;
        }

        if (results.organic && results.organic.length > 0) {
          response += `## Web Results\n`;
          results.organic.slice(0, parsed.num_results).forEach((result, index) => {
            response += `### ${index + 1}. ${result.title}\n${result.snippet}\n\n🔗 [Source](${result.link})\n\n`;
          });
        }

        if (results.peopleAlsoAsk && results.peopleAlsoAsk.length > 0) {
          response += `## People Also Ask\n`;
          results.peopleAlsoAsk.forEach((item) => {
            response += `**Q: ${item.question}**\nA: ${item.answer}\n\n`;
          });
        }

        if (results.relatedSearches && results.relatedSearches.length > 0) {
          response += `## Related Searches\n`;
          results.relatedSearches.forEach((search) => {
            response += `- ${search.query}\n`;
          });
        }

        return {
          content: [
            {
              type: "text",
              text: response,
            },
          ],
        };
      }

      case "deep_research": {
        const parsed = ResearchRequestSchema.parse(args);
        const queries = generateResearchQueries(parsed.topic, parsed.num_queries, parsed.depth);
        
        let researchReport = `# Deep Research Report: ${parsed.topic}\n\n`;
        researchReport += `**Research Depth:** ${parsed.depth}\n`;
        researchReport += `**Number of Queries:** ${queries.length}\n\n`;

        for (let i = 0; i < queries.length; i++) {
          const query = queries[i];
          researchReport += `## Research Query ${i + 1}: "${query}"\n\n`;

          try {
            const results = await serperClient.search(query, { num_results: 5 });
            
            if (results.answerBox) {
              researchReport += `**Key Finding:** ${results.answerBox.answer}\n\n`;
            }

            if (results.organic && results.organic.length > 0) {
              researchReport += `**Top Sources:**\n`;
              results.organic.slice(0, 3).forEach((result, index) => {
                researchReport += `${index + 1}. **${result.title}**\n   ${result.snippet}\n   [Source](${result.link})\n\n`;
              });
            }

            researchReport += `---\n\n`;
          } catch (error) {
            researchReport += `❌ Error searching "${query}": ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
          }
        }

        researchReport += `## Summary\n\nThis research was conducted using ${queries.length} targeted search queries to provide comprehensive information about "${parsed.topic}". Each query focused on different aspects of the topic to ensure thorough coverage.\n`;

        return {
          content: [
            {
              type: "text",
              text: researchReport,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
});

function generateResearchQueries(topic: string, numQueries: number, depth: "basic" | "comprehensive"): string[] {
  const baseQueries = [
    `${topic} overview`,
    `${topic} latest news`,
    `${topic} benefits advantages`,
  ];

  const comprehensiveQueries = [
    `${topic} challenges problems`,
    `${topic} future trends`,
    `${topic} comparison alternatives`,
    `${topic} case studies examples`,
    `${topic} expert opinions`,
    `${topic} statistics data`,
    `${topic} best practices`,
  ];

  const allQueries = depth === "comprehensive" 
    ? [...baseQueries, ...comprehensiveQueries]
    : baseQueries;

  return allQueries.slice(0, numQueries);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Serper server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});