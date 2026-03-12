import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createTripItems } from '@/lib/supabase/trips';
import { Item } from '@/types/database.types';

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
    const { description, tripId } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Trip description is required' }, { status: 400 });
    }

    if (!tripId || typeof tripId !== 'string') {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    // 3. Call Groq API via fetch
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'Internal Server Error: API configuration missing' },
        { status: 500 }
      );
    }

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
            content:
              'You are a smart trip packing assistant. Generate a packing list as a JSON object with an "items" key containing an array of items. Each item must have "name" (string), "category" (string), and "quantity" (number).',
          },
          {
            role: 'user',
            content: description,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      console.error('Groq API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate list from Groq' },
        { status: groqResponse.status }
      );
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices[0].message.content;
    const parsedContent = JSON.parse(content);

    if (!parsedContent.items || !Array.isArray(parsedContent.items)) {
      throw new Error('Invalid response format from Groq');
    }

    interface GroqItem {
      name: string;
      category: string;
      quantity: number;
    }

    // 4. Transform and persist items to Supabase
    const itemsToInsert: Omit<Item, 'id' | 'created_at'>[] = parsedContent.items.map(
      (item: GroqItem) => ({
        trip_id: tripId,
        name: item.name,
        category: item.category || 'General',
        required_count: item.quantity || 1,
        status: 'needed' as const,
        assigned_to: null,
      })
    );

    const { data: savedItems, error: insertError } = await createTripItems(supabase, itemsToInsert);

    if (insertError) {
      console.error('Supabase Insert Error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save generated items to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: savedItems });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
