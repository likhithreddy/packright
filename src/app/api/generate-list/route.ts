import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a smart, practical, and essentialist trip packing assistant. 
Your goal is to generate a comprehensive but efficient packing list based on a user's trip description. 

REQUIRMENTS:
1. INFERS CONTEXT: Deduce trip duration, destination, climate, and activities.
2. CITY TRAVEL: Even if a specific event is mentioned (like a wedding), always include general city travel essentials.
3. STRICT CATEGORIES: Use ONLY these categories: Clothing, Toiletries, Electronics, Documents, Gear, Footwear, Miscellaneous.
4. QUANTITY & BUFFER: Suggest logical quantities. For clothing, use a "Duration + 1" buffer rule.
5. SHARED VS PERSONAL: Differentiate items that can be shared among a group vs personal items.
6. GENERIC NAMES: Use generic, concise item names (e.g., "Socks" instead of "7 pairs of moisture-wicking wool socks").
7. JSON FORMAT: Return a JSON object with a single "items" key containing an array of objects.

ITEM SCHEMA:
{
  "name": string,
  "category": "Clothing" | "Toiletries" | "Electronics" | "Documents" | "Gear" | "Footwear" | "Miscellaneous",
  "quantity": number,
  "is_shared": boolean
}

TONE: Practical and essentialist. No fluff.`;

export async function POST(request: Request) {
  try {
    // 1. Initialize Supabase and check authentication
    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { description, destination, startDate, endDate } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Trip description is required' }, { status: 400 });
    }

    if (description.length < 20) {
      return NextResponse.json(
        { error: 'Trip description must be at least 20 characters long' },
        { status: 400 }
      );
    }

    // Calculate duration if dates are provided
    let durationInfo = '';
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      durationInfo = `Duration: ${diffDays} days.`;
    }

    const destinationInfo = destination ? `Destination: ${destination}.` : '';
    const userContext = `${destinationInfo} ${durationInfo} Description: ${description}`.trim();

    // 3. Prepare Groq API call configuration
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'Internal Server Error: API configuration missing' },
        { status: 500 }
      );
    }

    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: SYSTEM_PROMPT,
              },
              {
                role: 'user',
                content: userContext,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3, // Lower temperature for more consistent JSON
          }),
        });

        if (!groqResponse.ok) {
          const errorData = await groqResponse.json();
          throw new Error(`Groq API Error: ${JSON.stringify(errorData)}`);
        }

        const groqData = await groqResponse.json();
        const content = groqData.choices[0].message.content;
        const parsedContent = JSON.parse(content);

        if (!parsedContent.items || !Array.isArray(parsedContent.items)) {
          throw new Error('Invalid response format: missing items array');
        }

        // Successfully generated and parsed
        return NextResponse.json({ items: parsedContent.items });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error during generation';
        console.warn(`Attempt ${attempts} failed:`, errorMessage);
        lastError = err;
        // Wait a bit before retrying (exponential backoff could be added here if needed)
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    // 4. Exhausted retries
    console.error('All Groq API attempts failed:', lastError);
    return NextResponse.json(
      { error: 'We encountered an issue generating your packing list. Please try again later.' },
      { status: 500 }
    );
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
