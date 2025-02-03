interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required: string[];
    };
  };
}

// Mock weather data function
const getMockWeather = (city: string) => {
  // Normalize city name for comparison
  const normalizedCity = city.toLowerCase().replace(/\s+/g, ' ').trim();
  
  const temperatures: Record<string, { temp: number; condition: string }> = {
    'new york': { temp: 20, condition: 'Partly cloudy' },
    'newyork': { temp: 20, condition: 'Partly cloudy' },
    'london': { temp: 15, condition: 'Rainy' },
    'tokyo': { temp: 25, condition: 'Sunny' },
    'default': { temp: 22, condition: 'Clear' }
  };
  
  return temperatures[normalizedCity] || temperatures.default;
};

export const tools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get the current weather for a city. Use this for any weather-related questions.',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'The city to get weather for (e.g., "New York", "Tokyo", "London")'
          }
        },
        required: ['city']
      }
    }
  }
];

export const handleTool = async (toolName: string, parameters: any) => {
  switch (toolName) {
    case 'get_weather':
      const { city } = parameters;
      const weather = getMockWeather(city);
      return `The weather in ${city} is ${weather.condition} with a temperature of ${weather.temp}°C`;
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
