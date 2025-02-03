import OpenAI from 'openai';
import { getJson } from 'serpapi';

// Initialize OpenAI client
const _openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add interface for chat messages to avoid using 'any'
interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

//==================================================================
// Function to perform web search using SerpAPI
async function searchWebSerpAPI(query: string): Promise<string> {
  if (!process.env.SERP_API_KEY) {
    throw new Error('SerpAPI key not set in environment.');
  }

  try {
    const searchResponse = await getJson({
      engine: "google",
      api_key: process.env.SERP_API_KEY,
      q: query,
      num: 3, // Number of results to return
    });

    // Extract organic results
    const organicResults = searchResponse.organic_results;
    if (!organicResults?.length) {
      return 'No results found.';
    }

    // Combine top 3 results (or fewer if less available)
    const results = organicResults.slice(0, 3).map((result: any, index: number) => {
      const title = result.title || '';
      const snippet = result.snippet || '';
      const link = result.link || '';
      return `[Result ${index + 1}] ${title}\n${snippet}\nSource: ${link}`;
    }).join('\n\n');

    console.log(`searchWebSerpAPI: Found ${organicResults.length} results`);
    return results;
  } catch (error: any) {
    console.error('SerpAPI search error:', error);
    if (error.search_metadata?.status === 'Cached') {
      return `Error: ${error.error || 'Unknown error'} (Cached result)`;
    }
    return `Error performing web search: ${error.message || error}`;
  }
}

//==================================================================
// Define proper types for OpenAI messages and tools
type OpenAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type ToolCallResult = { role: 'tool'; content: string; tool_call_id: string; };
type ToolFunction = (...args: [string]) => Promise<string> | string;
type ToolDefinition = {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  function: ToolFunction;
};

// Tool registry to store all available tools
const toolRegistry = new Map<string, ToolDefinition>();

// Function to register a new tool
function registerTool(tool: ToolDefinition) {
  toolRegistry.set(tool.name, tool);
}

// Register the search tool
registerTool({
  name: 'search_web',
  description: 'Search the web for current information',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
    },
    required: ['query'],
  },
  function: searchWebSerpAPI,
});

// Convert tool registry to OpenAI tool format
function getOpenAITools() {
  return Array.from(toolRegistry.values()).map(({ name, description, parameters }) => ({
    type: 'function' as const,
    function: { name, description, parameters },
  }));
}

// 1. Add an initial system message
// 2. Add a timestamp to the last user message
function instrumentMessages(messages: ChatMessage[]) {
  const SYSTEM_MESSAGE_CONTENT = `
You are a helpful travel assistant. Please, respond cordially, but also with a friendly tone.
Additional metadata may be present at the beginning of some user messages.
This metadata is not visible to the user. It is injected by the system to give you better context.
Metadata will be wrapped in the <METADATA> XML-style tag.
`;
  // Prepend the system message first
  messages.unshift({ role: 'system', content: SYSTEM_MESSAGE_CONTENT });

  const lastUserMsgIdx = messages.findIndex(m => m.role === 'user');
  if (lastUserMsgIdx !== -1) {
    messages[lastUserMsgIdx].content = `
<METADATA>
Current time UTC: [${new Date().toISOString()}]
Current time Local: [${new Date().toLocaleString()}]
</METADATA>
` + messages[lastUserMsgIdx].content;
  }

  return messages;
}

// Handles the OpenAI chat call pipeline.
export async function handleChat(messages: ChatMessage[]): Promise<string> {
  // First we instrument the messages
  const instrumentedMessages = instrumentMessages(messages);

  // First chat completion call with tool definitions
  const completion = await _openai.chat.completions.create({
    model: process.env.OPENAI_MODEL!,
    messages: instrumentedMessages as OpenAIMessage[],
    tools: getOpenAITools(),
    tool_choice: 'auto',
  });

  const response = completion.choices[0].message;

  // Handle tool calls if any
  if (response.tool_calls && response.tool_calls.length > 0) {
    // Handle all tool calls
    const toolResults: ToolCallResult[] = await Promise.all(
      response.tool_calls.map(async (toolCall) => {
        const tool = toolRegistry.get(toolCall.function.name);

        if (!tool) {
          return {
            role: 'tool',
            content: `Unsupported tool call: ${toolCall.function.name}`,
            tool_call_id: toolCall.id,
          };
        }

        const args = JSON.parse(toolCall.function.arguments);
        console.log(`Executing ${tool.name} with args:`, args);

        let result;
        try {
          result = await tool.function(...(Object.values(args) as [string]));
          console.log(`${tool.name} result:`, result);
        } catch (error) {
          console.error(`Error executing tool ${tool.name}:`, error);
          result = `Error executing ${tool.name}.`;
        }

        return {
          role: 'tool',
          content: result,
          tool_call_id: toolCall.id,
        };
      })
    );

    // Second completion call with all tool results appended
    const secondCompletion = await _openai.chat.completions.create({
      model: process.env.OPENAI_MODEL!,
      messages: [
        ...(messages as OpenAIMessage[]),
        {
          role: 'assistant',
          content: response.content ?? null,
          tool_calls: response.tool_calls,
        },
        ...toolResults,
      ],
      tools: getOpenAITools(),
      tool_choice: 'auto',
    });

    return secondCompletion.choices[0].message.content ?? '';
  }

  // Return regular response
  return response.content ?? '';
} 